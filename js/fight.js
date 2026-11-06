// The brawl: everybody on the road (hero, ally, foes, townsfolk), what they are doing, and what happens when a blow
// lands. Actors move on the ground plane (x along the road, z in depth) and jump in y. A move is played frame by
// frame (moves.js); its hits are checked on the frame they belong to. Thrown people and things, projectiles,
// sparks and the screen's shake and freeze all live here too.
import { THREE, Body, PX, cutout, cutoutMesh } from './render.js?v=10';
import { MOVES, durs } from './moves.js?v=10';
import { ANIMS } from './art.js?v=10';
import { D } from './stage.js?v=10';

const G = 34;                         // gravity
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
export const HEIGHT = 2.5;

// ---------------------------------------------------------------- one person
export class Actor {
  constructor(W, o) {
    Object.assign(this, { team: 'foe', x: 0, z: 2, y: 0, vx: 0, vz: 0, vy: 0, f: 1, state: 'idle', t: 0, anim: 'idle', ai: null, hitList: new Set(), stunM: 0, jug: 0, inv: 0, buffs: {}, intent: {}, cds: {}, combo: 0, comboT: 0, dead: false }, o);
    this.W = W; this.id = W.nextId++; this.size = o.look?.size || 1;
    this.st = { ...o.st }; this.hp ??= this.st.hp; this.sp ??= this.st.sp;
    this.body = new Body(W.V.scene, o.look); this.af = 0; this.at = 0;
  }
  get alive() { return !this.dead && this.hp > 0; }
  get onGround() { return this.y <= 0.001 && this.vy <= 0; }
  get free() { return ['idle', 'walk', 'run'].includes(this.state); }
  foes() { return this.W.actors.filter((b) => b !== this && b.alive && this.hostile(b)); }
  hostile(b) { if (this.team === 'npc' || b.team === 'npc') return false; const side = (t) => (t === 'foe' ? 1 : 0); return side(this.team) !== side(b.team); }
  set(state, anim) { this.state = state; this.t = 0; if (anim) this.play(anim); }
  play(anim) { if (this.anim !== anim) { this.anim = anim; this.af = 0; this.at = 0; } }
  // ---- doing things
  can(name) { const m = MOVES[name]; return m && (this.sp >= (m.cost || 0)) && !(this.cds[name] > 0); }
  start(name) {
    const m = MOVES[name]; if (!m) return false;
    if (m.cost) { if (this.sp < m.cost) { if (this.isHero) this.W.ev('nosp'); return false; } this.sp -= m.cost; }
    if (m.turn) this.f = -this.f;
    this.move = m; this.mname = name; this.mf = 0; this.mt = 0; this.loopI = 0; this.hitList.clear(); this.hitFrame = -1; this.state = 'move'; this.t = 0; this.play(m.anim); this.af = 0;
    this.md = durs(m); this.armor = !!m.armor;
    if (m.voice && this.W.say) this.W.say(this, m.voice);
    if (m.sfx) this.W.sfx(m.sfx, this);
    if (m.blink) this.blink();
    if (m.buff) this.buff(m.buff);
    this.enterFrame();
    return true;
  }
  enterFrame() {
    const m = this.move, f = this.mf;
    if (m.vel && m.vel.f === f) { if (m.vel.vx != null) this.vx = m.vel.vx * this.f * (this.spdMul || 1); if (m.vel.vy != null) { this.vy = m.vel.vy; this.y = Math.max(this.y, 0.01); } }
    if (m.vel?.zig) this.vz = (this.loopI % 2 ? 1 : -1) * 3;
    for (const h of m.hits || []) if (h.f === f) this.W.strike(this, h, m);
    if (m.proj && m.proj.f === f && this.loopI === 0) this.W.shoot(this, m.proj);
    if (m.area && m.area.f === f && this.loopI === 0) this.W.area(this, m.area);
    if (m.bolt && f === 0 && this.loopI === 0) this.W.bolts(this, m.bolt);
  }
  stepMove(dt) {
    const m = this.move; if (!m) { this.set('idle', 'idle'); return; } this.mt += dt;
    if (m.vel?.keep && this.mf >= (m.vel.f || 0)) this.vx = m.vel.vx * this.f * (this.spdMul || 1);
    while (this.mt >= this.md[this.mf]) {
      this.mt -= this.md[this.mf]; this.mf++;
      if (this.mf >= this.md.length) {
        this.loopI++;
        if (m.loop && this.loopI < m.loop) { this.mf = 0; if (!m.hits?.some((h) => h.each === 0)) this.hitList.clear(); if (m.sfx && this.loopI % 2 === 0) this.W.sfx(m.sfx, this); }
        else { this.endMove(); return; }
      }
      this.af = this.mf; this.enterFrame();
    }
    this.af = this.mf;
  }
  endMove() {
    const m = this.move; this.move = null; this.armor = false;
    if (this.holding && this.mname === 'knee') { this.state = 'grab'; this.t = 0; this.play('grab'); return; }
    if (m.land && this.y > 0.05) { this.state = 'slam'; this.slam = m.land; this.play('fall'); return; }
    if (this.y > 0.05) { this.set('jump', 'fall'); this.airDone = true; return; }
    if (!m.vel?.keep) this.vx *= 0.3; else this.vx = 0; this.vz = 0;
    // a combo goes on if the button was pressed in time
    const nx = this.queued; this.queued = null;
    if (nx && this.alive && this.start(nx)) return;
    this.set('idle', 'idle');
  }
  jump() { this.vy = 12.5; this.y = 0.01; this.airDone = false; this.set('jump', 'jump'); this.W.sfx('jump', this); }
  blink() { const t = this.nearest(); if (!t) return; this.x = clamp(t.x - t.f * 1.2, this.W.x0 + 0.5, this.W.x1 - 0.5); this.z = t.z; this.f = t.x > this.x ? 1 : -1; this.inv = 0.4; this.W.puff(this.x, this.z, '#a8a8c8'); }
  buff(b) {
    if (b.heal) { const n = Math.round(this.st.hp * b.heal); this.hp = Math.min(this.st.hp, this.hp + n); this.W.num(this, '+' + n, '#7aff8a'); this.W.sparkle(this, '#8aff9a'); }
    if (b.iron) { this.buffs.iron = b.iron; this.W.sparkle(this, '#ffd86a'); }
    if (b.vanish) { this.buffs.vanish = b.vanish; this.inv = b.vanish; this.W.puff(this.x, this.z, '#d8d8e8'); }
    if (b.sp) this.sp = Math.min(this.st.sp, this.sp + b.sp);
  }
  nearest(maxD = 99) { let best = null, bd = maxD; for (const b of this.foes()) { if (b.state === 'down' && !this.isHero) continue; const d = Math.hypot(b.x - this.x, (b.z - this.z) * 1.6); if (d < bd) { bd = d; best = b; } } return best; }
  // ---- being hit
  hurt(by, h, dmgIn, dirF) {
    if (!this.alive || this.inv > 0) return false;
    const guardOK = this.state === 'guard' && this.f === -dirF && !h.unblock && this.y < 0.1;
    let dmg = dmgIn;
    if (guardOK) { dmg = Math.max(1, Math.round(dmg * 0.12)); this.vx = dirF * 2.2; this.hp -= dmg; this.W.spark(this, '#a8d8ff', 0.7); this.W.sfx('guard', this); this.W.num(this, dmg, '#a8c8ff'); if (this.hp <= 0) this.ko(by); return 'guard'; }
    if (this.buffs.iron) dmg = Math.round(dmg * 0.5);
    this.hp -= dmg; this.W.num(this, dmg, this.isHero || this.team === 'ally' ? '#ff8a6a' : '#ffffff', dmg >= this.st.hp * 0.12);
    if (this.state === 'held' && !h.grab) this.release();
    if (this.carry) this.drop();
    this.flashT = 0.08;
    if (this.hp <= 0) { this.ko(by, h, dirF); return true; }
    const heavy = (this.armor || this.buffs.iron || (this.superArmor && Math.random() < this.superArmor)) && !h.launch;
    if (heavy) return true;
    this.stunM += dmg / this.st.hp;
    if (this.holding) this.release();
    if (this.move) { this.move = null; this.armor = false; }
    if (h.down || h.launch || this.y > 0.05 || this.state === 'air') {
      this.state = 'air'; this.t = 0; this.play('air'); this.jug++;
      const lift = h.launch || h.up || 4, damp = Math.max(0.35, 1 - (this.jug - 1) * 0.2);
      this.vy = Math.max(this.vy * 0.3, lift * damp); this.y = Math.max(this.y, 0.05); this.vx = dirF * (h.kb || 3) * (this.boss ? 0.5 : 1); this.f = -dirF;
    } else if (h.grab) { this.t = 0; this.play('hurt'); }
    else {
      this.set('hurt', Math.random() < 0.5 ? 'hurt' : 'hurt2'); this.stun = (h.stun || 0.3) * (this.boss ? 0.6 : 1); this.vx = dirF * (h.kb || 1); this.f = -dirF;
    }
    return true;
  }
  ko(by, h, dirF = -this.f) {
    if (this.reviveItem && this.reviveItem()) { this.hp = Math.round(this.st.hp * 0.5); this.W.sparkle(this, '#ffd86a'); this.W.num(this, '復活！', '#ffd86a', true); this.set('air', 'air'); this.vy = 6; this.y = 0.05; this.inv = 1.5; return; }
    this.hp = 0; this.dead = true; this.release?.(); if (this.carry) this.drop();
    this.state = 'air'; this.t = 0; this.play('air'); this.vy = 7; this.y = Math.max(this.y, 0.05); this.vx = dirF * 6; this.f = -dirF; this.koT = 0;
    this.W.ev('ko', { a: this, by }); this.W.hitstop = Math.max(this.W.hitstop, this.boss ? 0.35 : 0.1); if (this.boss) this.W.shake = 0.6;
  }
  release() { if (this.holding) { const t = this.holding; this.holding = null; if (t.heldBy === this) { t.heldBy = null; if (t.alive) t.set('hurt', 'hurt'), t.stun = 0.3; } } if (this.heldBy) { const h = this.heldBy; this.heldBy = null; if (h.holding === this) { h.holding = null; if (h.state === 'grab') h.set('idle', 'idle'); } } }
  drop() { const o = this.carry; this.carry = null; if (o) { o.held = null; o.y = 0; o.x = this.x + this.f * 0.6; o.z = this.z; } }
  // ---- each frame
  update(dt) {
    this.t += dt; this.at += dt; if (this.inv > 0) this.inv -= dt; if (this.flashT > 0) this.flashT -= dt;
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.alive && this.state !== 'dead') this.sp = Math.min(this.st.sp, this.sp + dt * (this.spRegen ?? 0.8));
    const I = this.intent, W = this.W, sp = (this.st.spd * 0.18 + 3.2) * (this.spdMul || 1);
    switch (this.state) {
      case 'idle': case 'walk': case 'run': {
        if (I.act && this.alive) { const a = I.act; I.act = null; if (this.doAct(a)) break; }
        let mx = I.mx || 0, mz = I.mz || 0;
        if (this.carry) { mx *= 0.7; mz *= 0.7; }
        if (mx || mz) {
          const run = I.run && mx && !this.carry; this.f = mx > 0 ? 1 : mx < 0 ? -1 : this.f;
          this.vx = mx * sp * (run ? 1.75 : 1); this.vz = mz * sp * 0.62;
          this.state = run ? 'run' : 'walk'; this.play(this.carry ? 'carry' : run ? 'run' : 'walk');
          // walking into a staggered foe grabs him
          if (!run && mx && this.canGrab && !this.carry) { const g = this.foes().find((b) => (b.state === 'dizzy' || (b.state === 'hurt' && b.t > 0.08)) && !b.boss && Math.abs(b.z - this.z) < 0.5 && (b.x - this.x) * this.f > 0 && Math.abs(b.x - this.x) < 1.15 * Math.max(this.size, b.size) && b.onGround); if (g) this.grab(g); }
        } else { this.vx *= 0.6; this.vz *= 0.6; if (this.state !== 'idle') this.state = 'idle'; this.play(this.carry ? 'carry' : this.team === 'npc' ? 'stand' : 'idle'); }
        if (I.guard && !this.carry) { this.set('guard', 'guard'); this.vx = 0; this.vz = 0; }
        if (I.jump) { I.jump = false; if (!this.carry) this.jump(); }
        break;
      }
      case 'guard': this.vx *= 0.7; this.vz = 0; if (!I.guard) this.set('idle', 'idle'); else if (I.act) { const a = I.act; I.act = null; if (a === 'J' || a === 'attack') this.start('upper'); else this.doAct(a); } break;
      case 'move': this.stepMove(dt); break;
      case 'jump': {
        if (I.act && !this.airDone) { const a = I.act; I.act = null; const nm = a === 'K' ? 'jkick' : a === 'J' ? (this.blade ? 'jslash' : 'jkick') : a; const m = MOVES[nm]; if (m && (m.air || a === 'J' || a === 'K') && this.can(nm)) { this.airDone = true; this.start(nm); } }
        if (this.anim === 'jump' && this.vy < 0) this.play('fall');
        if (I.mx) { this.vx += I.mx * 18 * dt; this.vx = clamp(this.vx, -sp * 1.3, sp * 1.3); }
        break;
      }
      case 'slam': if (this.onGround) { W.area(this, this.slam); W.shake = 0.4; this.slam = null; this.set('idle', 'idle'); } break;
      case 'hurt': this.vx *= 0.88; if (this.t > this.stun) { if (this.stunM > 0.32 && !this.boss && this.alive) { this.stunM = 0; this.set('dizzy', 'dizzy'); this.dizzyT = 1.7; W.dizzyFx(this); } else this.set('idle', 'idle'); } break;
      case 'dizzy': this.vx *= 0.8; if (this.t > this.dizzyT) { this.stunM = 0; this.set('idle', 'idle'); } break;
      case 'air': break;
      case 'down': this.vx *= 0.8; if (this.dead) { this.koT += dt; if (this.koT > 1.4) this.vanish = true; } else if (this.t > (this.isHero ? 0.6 : 0.95)) { this.set('getup', 'getup'); this.inv = 0.45; } break;
      case 'getup': if (this.t > 0.26) { this.stunM = 0; this.jug = 0; this.set('idle', 'idle'); } break;
      case 'grab': this.vx = 0; this.vz = 0; {
        const t = this.holding; if (!t || !t.alive || t.heldBy !== this) { this.holding = null; this.set('idle', 'idle'); break; }
        t.x = this.x + this.f * 0.85 * Math.max(1, this.size); t.z = this.z + 0.02; t.y = 0; t.f = -this.f;
        if (I.act) { const a = I.act; I.act = null; if ((a === 'J' && (this.knees || 0) < 3)) { this.knees = (this.knees || 0) + 1; this.start('knee'); this.state = 'move'; } else this.throwHeld(I.mx && Math.sign(I.mx) !== this.f ? -1 : 1); }
        else if (this.t > 2.2) this.throwHeld(1);
        break;
      }
      case 'held': this.vx = 0; this.vy = 0; if (!this.heldBy) this.set('idle', 'idle'); else if (this.t > 2.6) { this.release(); } break;
      case 'thrown': break;
    }
    // a grip is kept through the knee strikes
    if (this.state === 'move' && this.mname === 'knee' && this.holding) { const t = this.holding; t.x = this.x + this.f * 0.85; t.z = this.z + 0.02; t.y = 0; }
    if (this.state === 'move' && this.mname === 'knee' && this.move == null && this.holding) this.state = 'grab';
    this.physics(dt);
    this.animate(dt);
  }
  doAct(a) {
    // J attack, K kick, specials by name; a dash or flying kick when running; throwing what is carried
    if (this.carry && (a === 'J' || a === 'E')) { this.W.throwProp(this); return true; }
    if (a === 'E') { const p = this.W.propNear(this); if (p) { this.W.pickProp(this, p); return true; } return false; }
    if (a === 'J') return this.start(this.state === 'run' ? 'dash' : this.blade ? 'slash' : 'jab');
    if (a === 'K') return this.state === 'run' ? this.start('flykick') : this.start('kick');
    if (MOVES[a]) { const m = MOVES[a]; if (m.ground && this.state === 'run') { /* fine */ } return this.start(a); }
    return false;
  }
  queue(a) {
    // a press during an attack: the combo's next move (J after J, K after K)
    if (this.state !== 'move' || !this.move) return false;
    const m = this.move, nx = a === 'J' && m.next && ['jab', 'jab2', 'slash', 'slash2'].includes(this.mname) ? m.next : a === 'K' && this.mname === 'kick' ? 'round' : a === 'J' && this.mname === 'kick' ? (this.blade ? 'slash' : 'jab') : null;
    if (nx && this.mf >= 1) { this.queued = nx; return true; }
    if (nx) { this.queued = nx; return true; }
    return false;
  }
  grab(t) { this.release(); this.holding = t; t.heldBy = this; this.knees = 0; this.set('grab', 'grab'); t.set('held', 'hurt'); t.vx = t.vy = 0; t.move = null; this.W.sfx('grab', this); }
  throwHeld(dir) {
    const t = this.holding; this.holding = null; if (!t) return; t.heldBy = null; if (dir < 0) this.f = -this.f;
    this.start('toss'); t.state = 'thrown'; t.t = 0; t.play('air'); t.vx = this.f * 12 * (this.grip || 1); t.vy = 7; t.y = 1.2; t.x = this.x + this.f * 0.6; t.f = -this.f; t.thrower = this; t.hitList = new Set();
    const dmg = this.W.dmgOf(this, { dmg: 12, stat: 'str' }, t); t.hp -= dmg; this.W.num(t, dmg, '#ffffff', true); t.pendKO = t.hp <= 0;
  }
  physics(dt) {
    const W = this.W;
    const airborne = this.y > 0 || this.vy > 0;
    if (airborne && this.state !== 'held') {
      this.vy -= G * dt * (this.state === 'air' || this.state === 'thrown' ? 1.05 : 1); this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.land(); }
    }
    if (this.state !== 'held') { this.x += this.vx * dt; this.z += this.vz * dt; }
    if (this.onGround && ['air', 'down', 'thrown'].includes(this.state)) this.vx *= 0.92;
    const x0 = W.x0 + 0.4, x1 = W.x1 - 0.4;
    if (this.x < x0) { this.x = x0; if (this.state === 'thrown' || this.state === 'air') this.vx = Math.abs(this.vx) * 0.3; }
    if (this.x > x1) { this.x = x1; if (this.state === 'thrown' || this.state === 'air') this.vx = -Math.abs(this.vx) * 0.3; }
    this.z = clamp(this.z, 0.05, D - 0.05);
    // a thrown body hits whoever it flies into
    if (this.state === 'thrown') for (const b of W.actors) { if (b === this || b === this.thrower || !b.alive || this.hitList.has(b.id) || !this.thrower.hostile(b)) continue; if (Math.abs(b.x - this.x) < 0.9 && Math.abs(b.z - this.z) < 0.6 && this.y < 2.2) { this.hitList.add(b.id); W.land(this.thrower, b, { dmg: 14, stat: 'str', down: 1, kb: 6, up: 5 }, Math.sign(this.vx) || 1); W.spark(b, '#ffffff', 1.2); W.shake = 0.25; } }
  }
  land() {
    const W = this.W;
    if (this.state === 'air' || this.state === 'thrown') {
      if (this.vy < -9 && !this.bounced) { this.bounced = true; this.vy = 4.5; this.y = 0.01; W.dust(this.x, this.z); W.sfx('thud', this); return; }
      this.vy = 0; this.bounced = false; this.set('down', 'down'); W.dust(this.x, this.z); W.sfx('thud', this);
      if (this.state === 'down' && this.pendKO && !this.dead) { this.pendKO = false; this.ko(this.thrower, null, Math.sign(this.vx) || 1); this.set('down', 'down'); }
      this.jug = 0; return;
    }
    if (this.dead) { this.set('down', 'down'); return; }
    if (this.state === 'move' && this.move?.land) { W.area(this, this.move.land); W.shake = 0.4; this.move = null; this.vy = 0; this.vx = 0; this.set('idle', 'idle'); return; }
    this.vy = 0;
    if (this.state === 'jump') { this.set('idle', 'idle'); this.vx *= 0.3; W.dust(this.x, this.z, 0.5); }
    if (this.state === 'move' && this.move?.air) { this.move = null; this.set('idle', 'idle'); this.vx *= 0.3; }
  }
  animate(dt) {
    const a = this.anim, fr = ANIMS[a] || ANIMS.idle;
    if (this.state !== 'move') { this.at += 0; const d = fr[this.af % fr.length].t; if (this.at >= d) { this.at = 0; this.af = (this.af + 1) % fr.length; } }
    const f = this.state === 'move' ? Math.min(this.af, fr.length - 1) : this.af % fr.length;
    this.body.frame(a, f, this.f);
    const blink = (this.dead && this.koT > 0.5 && Math.floor(this.koT * 12) % 2) || (this.buffs.vanish && Math.floor(this.t * 20) % 2);
    this.body.visible(!blink && !this.vanished);
    this.body.flash(this.flashT > 0, '#ffffff'); if (!(this.flashT > 0) && this.buffs.iron) this.body.flash(true, '#6a5418');
    this.body.place(this.x, this.y, this.z);
  }
  dispose() { this.body.dispose(); }
}

// ---------------------------------------------------------------- the world of one stretch of road
const sparkTex = (() => { const c = cutout(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); x.fillStyle = '#ffffff'; x.fillRect(15, 0, 2, 32); x.fillRect(0, 15, 32, 2); }); const t = new THREE.CanvasTexture(c); return t; })();
const ringTex = (() => { const c = cutout(64, 64, (x) => { x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 26, 0, 6.3); x.stroke(); }); return new THREE.CanvasTexture(c); })();
const projCanvas = {
  ki: () => cutout(24, 24, (x) => { const g = x.createRadialGradient(12, 12, 1, 12, 12, 12); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#8ae0ff'); g.addColorStop(1, 'rgba(60,140,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 24, 24); }),
  wave: () => cutout(24, 48, (x) => { x.fillStyle = '#6aff9a'; x.beginPath(); x.ellipse(6, 24, 14, 22, 0, -1.4, 1.4); x.ellipse(0, 24, 12, 19, 0, 1.4, -1.4, true); x.fill(); x.fillStyle = '#e0ffe8'; x.fillRect(14, 10, 3, 28); }),
  arrow: () => cutout(32, 6, (x) => { x.fillStyle = '#8a6a3a'; x.fillRect(2, 2, 24, 2); x.fillStyle = '#d8d8e0'; x.beginPath(); x.moveTo(32, 3); x.lineTo(25, 0); x.lineTo(25, 6); x.fill(); x.fillStyle = '#e0e0e0'; x.fillRect(0, 0, 5, 2); x.fillRect(0, 4, 5, 2); }),
  fire: () => cutout(24, 32, (x) => { x.fillStyle = '#ff5a10'; x.beginPath(); x.moveTo(12, 0); x.quadraticCurveTo(26, 20, 20, 32); x.lineTo(4, 32); x.quadraticCurveTo(-2, 20, 12, 0); x.fill(); x.fillStyle = '#ffc030'; x.beginPath(); x.moveTo(12, 10); x.quadraticCurveTo(20, 24, 16, 32); x.lineTo(8, 32); x.quadraticCurveTo(4, 24, 12, 10); x.fill(); x.fillStyle = '#fff0a0'; x.fillRect(10, 22, 4, 10); }),
};
const projTex = {}; const projT = (k) => (projTex[k] ||= (() => { const t = new THREE.CanvasTexture(projCanvas[k]()); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })());

export class World {
  constructor(V, hooks) {
    this.V = V; this.hooks = hooks; this.actors = []; this.props = []; this.pickups = []; this.projs = []; this.fx = []; this.nextId = 1; this.hitstop = 0; this.shake = 0; this.x0 = 0; this.x1 = 100;
    this.numsEl = document.getElementById('nums');
  }
  ev(type, d) { this.hooks.ev?.(type, d); }
  sfx(n, a) { this.hooks.sfx?.(n, a); }
  say(a, t) { this.hooks.say?.(a, t); }
  add(o) { const a = new Actor(this, o); this.actors.push(a); return a; }
  clear() { for (const a of this.actors) a.dispose(); for (const p of this.props) this.V.scene.remove(p.mesh); for (const p of this.pickups) this.V.scene.remove(p.mesh); for (const p of this.projs) this.V.scene.remove(p.mesh); for (const f of this.fx) this.V.scene.remove(f.mesh); this.actors = []; this.props = []; this.pickups = []; this.projs = []; this.fx = []; if (this.numsEl) this.numsEl.innerHTML = ''; }
  // ---- how hard a blow is
  dmgOf(a, h, t) {
    const stat = a.st[h.stat || 'str'] || 10, def = t ? t.st.def || 0 : 0;
    let d = h.dmg * (0.55 + stat * 0.065) * rand(0.9, 1.1) * (a.dmgMul || 1) * 34 / (34 + def);
    if (t?.dmgTaken) d *= t.dmgTaken;
    return Math.max(1, Math.round(d));
  }
  // a hit from attacker a: everyone it reaches in front
  strike(a, h, m) {
    const last = m.last && m.loop && a.loopI === m.loop - 1 ? m.last : null, hh = last ? { ...h, ...last } : h, s = a.size, rr = m.wpn ? a.reach || 1 : 1;
    let any = false;
    for (const t of this.actors) {
      if (t === a || !t.alive || !a.hostile(t) || t.inv > 0) continue;
      if (t.state === 'down' || t.state === 'getup') continue;
      if (h.grab) { if (t !== a.holding) continue; }
      else if (t.state === 'held' && t.heldBy !== a) { /* a held man can be hit by his captor's friends */ }
      const key = h.each ? t.id + ':' + a.loopI : t.id; if (a.hitList.has(key)) continue;
      const dx = (t.x - a.x) * a.f, ts = t.size;
      if (dx < hh.range[0] * s - 0.3 * ts || dx > hh.range[1] * s * rr + 0.35 * ts) continue;
      if (Math.abs(t.z - a.z) > (hh.dz || 0.6) * (0.85 + s * 0.15)) continue;
      const y0 = a.y + hh.h[0] * s, y1 = a.y + hh.h[1] * s; if (t.y + HEIGHT * ts < y0 || t.y > y1) continue;
      a.hitList.add(key); any = true;
      this.land(a, t, hh, a.f);
    }
    // things that break
    for (const p of this.props) { if (p.held || p.flying) continue; const dx = (p.x - a.x) * a.f; if (dx > hh.range[0] * s - 0.4 && dx < hh.range[1] * s + 0.4 && Math.abs(p.z - a.z) < (hh.dz || 0.6) + 0.3 && !a.hitList.has('p' + p.id)) { a.hitList.add('p' + p.id); this.hitProp(p, a); any = true; } }
    if (any && h.fx === 'slash') this.slashFx(a);
    return any;
  }
  land(a, t, h, dirF) {
    const dmg = this.dmgOf(a, h, t), r = t.hurt(a, h, dmg, dirF);
    if (!r) return;
    if (r === 'guard') { this.hitstop = Math.max(this.hitstop, 0.04); return; }
    a.combo = (a.combo || 0) + 1; a.comboT = 1.1; a.sp = Math.min(a.st.sp, a.sp + 1.2);
    this.hitstop = Math.max(this.hitstop, h.down || h.launch ? 0.09 : 0.05); if (h.down || h.launch) this.shake = Math.max(this.shake, 0.18);
    this.spark(t, h.fx === 'slash' ? '#e8f4ff' : '#fff0c0', h.down ? 1.3 : 1);
    this.sfx(h.fx === 'slash' ? 'cut' : h.down ? 'smash' : 'hit', t);
    this.ev('hit', { a, t, dmg, combo: a.combo });
  }
  area(a, ar) {
    const s = a.size; this.ring(a.x, a.z, ar.r * s, ar.kind === 'roar' ? '#ffd86a' : ar.kind === 'quake' ? '#c8a070' : '#ffffff');
    if (ar.kind === 'quake') { this.shake = Math.max(this.shake, 0.4); for (let i = 0; i < 10; i++) this.dust(a.x + rand(-ar.r, ar.r), a.z + rand(-1, 1), 0.8); }
    for (const t of this.actors) {
      if (t === a || !t.alive || !a.hostile(t) || t.inv > 0) continue;
      const d = Math.hypot(t.x - a.x, (t.z - a.z) * 1.4); if (d > ar.r * s) continue;
      if (ar.ground && t.y > 0.6) continue;
      if (ar.dizzy) { const dmg = this.dmgOf(a, ar, t); t.hp -= dmg; this.num(t, dmg, '#ffd86a'); if (t.hp <= 0) { t.ko(a); continue; } if (!t.boss) { t.move = null; t.set('dizzy', 'dizzy'); t.dizzyT = ar.dizzy; this.dizzyFx(t); } else { t.set('hurt', 'hurt'); t.stun = 0.5; } continue; }
      if (t.state === 'down') { t.state = 'idle'; }
      this.land(a, t, { ...ar, kb: ar.kb || 4 }, t.x >= a.x ? 1 : -1);
    }
    for (const p of this.props) if (!p.held && Math.hypot(p.x - a.x, p.z - a.z) < ar.r * s) this.hitProp(p, a);
  }
  bolts(a, b) {
    const ts = a.foes().filter((t) => Math.abs(t.x - a.x) < b.r).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x)).slice(0, b.n);
    if (!ts.length) ts.push({ x: a.x + a.f * 4, z: a.z, fake: 1 });
    ts.forEach((t, i) => setTimeout(() => { if (this.gone) return; this.boltFx(t.x, t.z); this.sfx('thunder'); this.shake = Math.max(this.shake, 0.3); if (!t.fake && t.alive) this.land(a, t, { ...b, kb: 3, up: 6 }, t.x >= a.x ? 1 : -1); }, 120 + i * 180));
  }
  // ---- projectiles: ki, blade waves, arrows, fire
  shoot(a, p) {
    const k = p.kind, m = new THREE.Mesh(new THREE.PlaneGeometry(k === 'arrow' ? 2 : k === 'wave' ? 1.5 : k === 'fire' ? 1.6 : 1.4, k === 'arrow' ? 0.38 : k === 'wave' ? 3 : k === 'fire' ? 2.2 : 1.4), new THREE.MeshBasicMaterial({ map: projT(k), transparent: true, depthWrite: false, blending: k === 'arrow' ? THREE.NormalBlending : THREE.AdditiveBlending }));
    m.scale.x = a.f; m.rotation.x = -0.3; this.V.scene.add(m);
    const P = { a, k, x: a.x + a.f * 1.1 * a.size, z: a.z, y: (p.h || 1.4) * a.size, vx: a.f * p.speed, life: p.life || 1, p, hit: new Set(), mesh: m, tick: 0 };
    if (k === 'fire' || k === 'ki' || k === 'wave') { P.light = new THREE.PointLight(k === 'fire' ? '#ff6a20' : k === 'wave' ? '#6aff9a' : '#6ac8ff', 5, 6, 1.5); this.V.scene.add(P.light); }
    this.projs.push(P);
  }
  stepProjs(dt) {
    for (const P of this.projs) {
      P.life -= dt; P.x += P.vx * dt; P.tick += dt;
      P.mesh.position.set(P.x, P.k === 'fire' ? 0.0 + 1.1 : P.y - (P.k === 'wave' ? 0.2 : 0.7) + (P.k === 'ki' ? 0.7 : 0), P.z + 0.1);
      if (P.k === 'fire') P.mesh.scale.y = 0.9 + Math.sin(P.tick * 20) * 0.1;
      if (P.light) P.light.position.set(P.x, 1.4, P.z + 0.6);
      for (const t of this.actors) {
        if (!t.alive || !P.a.hostile(t) || t.inv > 0 || t.state === 'down') continue;
        const key = P.k === 'fire' ? t.id + ':' + Math.floor(P.tick / 0.4) : t.id; if (P.hit.has(key)) continue;
        if (Math.abs(t.x - P.x) < 0.8 && Math.abs(t.z - P.z) < 0.7 && P.y > t.y - 0.4 && P.y < t.y + HEIGHT * t.size + 0.4) {
          P.hit.add(key); this.land(P.a, t, { dmg: P.p.dmg, stat: P.p.stat, kb: 4, up: 4, down: P.p.down, stun: P.p.stun || 0.4 }, Math.sign(P.vx));
          if (!P.p.pierce) P.life = 0;
        }
      }
      for (const pr of this.props) if (!pr.held && !pr.flying && Math.abs(pr.x - P.x) < 0.7 && Math.abs(pr.z - P.z) < 0.7) { this.hitProp(pr, P.a); if (!P.p.pierce) P.life = 0; }
      if (P.x < this.x0 - 2 || P.x > this.x1 + 2) P.life = 0;
    }
    this.projs = this.projs.filter((P) => { if (P.life > 0) return true; this.V.scene.remove(P.mesh); P.mesh.material.dispose(); P.mesh.geometry.dispose(); if (P.light) this.V.scene.remove(P.light); return false; });
  }
  // ---- barrels, rocks and pots: break them, or pick them up and throw them
  addProp(kind, x, z) {
    const c = { barrel: () => cutout(18, 22, (g) => { g.fillStyle = '#7a5028'; g.fillRect(2, 1, 14, 21); g.fillStyle = '#9a6a38'; g.fillRect(4, 1, 4, 21); g.fillStyle = '#3a2a1a'; g.fillRect(1, 4, 16, 2); g.fillRect(1, 16, 16, 2); g.fillStyle = '#5a3a1a'; g.fillRect(13, 1, 3, 21); }), rock: () => cutout(20, 16, (g) => { g.fillStyle = '#6a6660'; g.beginPath(); g.ellipse(10, 9, 9, 7, 0, 0, 6.3); g.fill(); g.fillStyle = '#8a867e'; g.beginPath(); g.ellipse(8, 7, 5, 3.5, 0, 0, 6.3); g.fill(); }), pot: () => cutout(16, 18, (g) => { g.fillStyle = '#9a5a3a'; g.beginPath(); g.ellipse(8, 11, 7, 7, 0, 0, 6.3); g.fill(); g.fillRect(5, 1, 6, 5); g.fillStyle = '#c87a4a'; g.fillRect(4, 7, 3, 6); g.fillStyle = '#3a2a1a'; g.fillRect(4, 1, 8, 1); }), crate: () => cutout(20, 20, (g) => { g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, 20, 20); g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, 20, 2); g.fillRect(0, 18, 20, 2); g.fillRect(0, 0, 2, 20); g.fillRect(18, 0, 2, 20); g.save(); g.translate(10, 10); g.rotate(0.78); g.fillRect(-1, -13, 2, 26); g.restore(); }) }[kind]();
    const mesh = cutoutMesh(c, PX * 1.05); mesh.rotation.x = -0.3; this.V.scene.add(mesh);
    const p = { id: this.nextId++, kind, x, z, y: 0, vx: 0, vy: 0, hp: kind === 'rock' ? 3 : 1, mesh, w: kind === 'rock' ? 1.6 : 1.2 };
    this.props.push(p); mesh.position.set(x, 0, z); return p;
  }
  propNear(a) { return this.props.find((p) => !p.held && !p.flying && Math.abs(p.x - a.x) < 1.3 && Math.abs(p.z - a.z) < 0.7); }
  pickProp(a, p) { a.carry = p; p.held = a; a.play('carry'); this.sfx('grab', a); }
  throwProp(a) {
    const p = a.carry; a.carry = null; if (!p) return; p.held = null; p.flying = true; p.thrower = a; p.x = a.x + a.f * 0.5; p.y = 2.3 * a.size; p.z = a.z; p.vx = a.f * 14; p.vy = 3; p.hit = new Set(); a.start('toss');
  }
  hitProp(p, a) {
    p.hp--; this.sfx(p.kind === 'rock' ? 'thud' : 'wood', a); this.spark({ x: p.x, z: p.z, y: 0, size: 0.5 }, '#e8d8b0', 0.7);
    if (p.hp <= 0) this.breakProp(p, a);
  }
  breakProp(p, a) {
    p.gone = true; this.V.scene.remove(p.mesh); for (let i = 0; i < 6; i++) this.dust(p.x + rand(-0.4, 0.4), p.z, 0.5);
    if (p.kind !== 'rock') { const r = Math.random(); if (r < 0.35) this.drop(p.x, p.z, 'food'); else if (r < 0.75) this.drop(p.x, p.z, 'gold', 4 + Math.floor(Math.random() * 12)); }
  }
  stepProps(dt) {
    for (const p of this.props) {
      if (p.held) { const a = p.held; if (!a.alive || a.carry !== p) { p.held = null; p.y = 0; } else { p.x = a.x; p.z = a.z + 0.03; p.y = 2.35 * a.size; } }
      else if (p.flying) {
        p.vy -= 22 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        for (const t of this.actors) { if (!t.alive || !p.thrower.hostile(t) || p.hit.has(t.id) || t.state === 'down') continue; if (Math.abs(t.x - p.x) < 0.9 && Math.abs(t.z - p.z) < 0.7 && p.y < t.y + HEIGHT * t.size) { p.hit.add(t.id); this.land(p.thrower, t, { dmg: p.kind === 'rock' ? 22 : 16, stat: 'str', down: 1, kb: 7, up: 5 }, Math.sign(p.vx)); if (p.kind !== 'rock') { p.hp = 0; } } }
        if (p.y <= 0 || p.hp <= 0 || p.x < this.x0 || p.x > this.x1) { p.y = 0; p.flying = false; p.vx = 0; this.dust(p.x, p.z, 0.6); if (p.kind !== 'rock' || p.hp <= 0) { this.breakProp(p, p.thrower); } else this.sfx('thud'); }
      }
      p.mesh.position.set(p.x, p.y, p.z); if (p.flying) p.mesh.rotation.z += dt * 10 * -Math.sign(p.vx); else p.mesh.rotation.z = 0;
    }
    this.props = this.props.filter((p) => !p.gone);
  }
  // ---- things on the ground to pick up: coins and food
  drop(x, z, kind, n = 1) {
    const c = kind === 'gold' ? cutout(10, 10, (g) => { g.fillStyle = '#c89020'; g.beginPath(); g.arc(5, 5, 4.5, 0, 6.3); g.fill(); g.fillStyle = '#ffe070'; g.beginPath(); g.arc(4.4, 4.4, 3, 0, 6.3); g.fill(); g.fillStyle = '#8a6010'; g.fillRect(4, 4, 2, 2); }) : cutout(14, 12, (g) => { g.fillStyle = '#f4ecd8'; g.beginPath(); g.ellipse(7, 7, 6, 5, 0, 0, 6.3); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(4, 3, 4, 2); g.fillStyle = '#c8b890'; g.fillRect(6, 1, 2, 2); });
    const mesh = cutoutMesh(c, PX * 1.6, { glow: kind === 'gold' ? '#6a5010' : '#3a3a3a', shadow: false }); mesh.rotation.x = -0.3; this.V.scene.add(mesh);
    this.pickups.push({ x, z, y: 0.6, vy: 5, vx: rand(-1.5, 1.5), kind, n, mesh, t: 0 });
  }
  stepPickups(dt, hero) {
    for (const p of this.pickups) {
      p.t += dt; if (p.y > 0 || p.vy > 0) { p.vy -= 22 * dt; p.y = Math.max(0, p.y + p.vy * dt); p.x += p.vx * dt; if (p.y === 0) { p.vy = 0; p.vx = 0; } }
      if (hero && hero.alive && p.kind === 'gold' && p.t > 0.6) { const dx = hero.x - p.x, dz = hero.z - p.z, d = Math.hypot(dx, dz); if (d < 4.5) { const k = Math.min(1, dt * (9 - d)); p.x += dx * k; p.z += dz * k; } }
      p.mesh.position.set(p.x, p.y + (p.y === 0 ? Math.abs(Math.sin(p.t * 3)) * 0.12 : 0), p.z);
      if (hero && hero.alive && p.t > 0.35 && Math.abs(hero.x - p.x) < 0.8 && Math.abs(hero.z - p.z) < 0.6 && hero.y < 1) { p.got = true; this.ev('pickup', p); }
      if (p.t > 25) p.got = true;
    }
    this.pickups = this.pickups.filter((p) => { if (!p.got) return true; this.V.scene.remove(p.mesh); return false; });
  }
  // ---- effects
  spark(t, col = '#ffffff', k = 1) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75 * k, 0.75 * k), new THREE.MeshBasicMaterial({ map: sparkTex, color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(t.x + rand(-0.2, 0.2), (t.y || 0) + 1.4 * (t.size || 1) + rand(-0.3, 0.3), t.z + 0.3); m.rotation.z = rand(0, 3); this.V.scene.add(m); this.fx.push({ mesh: m, t: 0, life: 0.14, grow: 1.6 });
  }
  slashFx(a) {
    const c = cutout(48, 48, (x) => { x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 4; x.beginPath(); x.arc(14, 30, 26, -1.25, 0.7); x.stroke(); x.strokeStyle = 'rgba(160,220,255,0.6)'; x.lineWidth = 8; x.beginPath(); x.arc(12, 30, 24, -1.1, 0.5); x.stroke(); });
    const t = new THREE.CanvasTexture(c), m = new THREE.Mesh(new THREE.PlaneGeometry(3 * a.size, 3 * a.size), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(a.x + a.f * 1 * a.size, a.y + 1.4 * a.size, a.z + 0.4); m.scale.x = a.f; this.V.scene.add(m); this.fx.push({ mesh: m, t: 0, life: 0.14, grow: 0.3, own: t });
  }
  ring(x, z, r, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ringTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); this.V.scene.add(m); this.fx.push({ mesh: m, t: 0, life: 0.4, ring: r }); }
  dust(x, z, k = 1) { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7 * k, 0.7 * k), new THREE.MeshBasicMaterial({ map: sparkTex, color: '#c8b8a0', transparent: true, opacity: 0.6, depthWrite: false })); m.position.set(x + rand(-0.5, 0.5), 0.3, z + rand(-0.2, 0.3)); this.V.scene.add(m); this.fx.push({ mesh: m, t: 0, life: 0.45, grow: 1.5, rise: 1.2, fade: 1 }); } }
  puff(x, z, col) { for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: sparkTex, color: col, transparent: true, opacity: 0.8, depthWrite: false })); m.position.set(x + rand(-0.6, 0.6), rand(0.3, 2.2), z + 0.2); this.V.scene.add(m); this.fx.push({ mesh: m, t: 0, life: 0.5, grow: 1.6, rise: 0.8, fade: 1 }); } }
  sparkle(a, col) { for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: sparkTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(a.x + rand(-0.7, 0.7), rand(0, 2.6), a.z + 0.3); this.V.scene.add(m); this.fx.push({ mesh: m, t: -i * 0.04, life: 0.7, rise: 2, fade: 1 }); } }
  dizzyFx(a) { this.fx.push({ mesh: null, t: 0, life: a.dizzyT || 1.6, stars: a }); }
  boltFx(x, z) {
    const c = cutout(16, 128, (g) => { g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); let px = 8; g.moveTo(px, 0); for (let y = 8; y <= 128; y += 8) { px = 8 + (Math.random() - 0.5) * 12; g.lineTo(px, y); } g.stroke(); g.strokeStyle = 'rgba(160,190,255,0.7)'; g.lineWidth = 7; g.stroke(); });
    const t = new THREE.CanvasTexture(c), m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, 6, z + 0.2); this.V.scene.add(m);
    const l = new THREE.PointLight('#a8c0ff', 30, 14, 1.4); l.position.set(x, 3, z + 1); this.V.scene.add(l); this.fx.push({ mesh: m, t: 0, life: 0.25, own: t, light: l }); this.V.grade.uniforms.flash.value = 0.35; this.ring(x, z, 2, '#a8c0ff');
  }
  stepFx(dt) {
    for (const f of this.fx) {
      f.t += dt; const k = Math.max(0, f.t / f.life);
      if (f.stars) { const a = f.stars; if (!a.alive || a.state !== 'dizzy') f.t = f.life; else if (Math.floor(f.t * 6) !== Math.floor((f.t - dt) * 6)) this.spark({ x: a.x + Math.cos(f.t * 6) * 0.6, z: a.z, y: a.y + 1.3 * a.size, size: 1 }, '#ffe060', 0.45); continue; }
      if (f.t < 0) { f.mesh.visible = false; continue; } f.mesh.visible = true;
      if (f.grow) f.mesh.scale.set((f.mesh.scale.x < 0 ? -1 : 1) * (1 + k * f.grow), 1 + k * f.grow, 1);
      if (f.ring) f.mesh.scale.set(f.ring * (0.3 + k), f.ring * (0.3 + k), 1);
      if (f.rise) f.mesh.position.y += f.rise * dt;
      f.mesh.material.opacity = (f.fade ? 0.7 : 1) * (1 - k); f.mesh.material.transparent = true;
      if (f.light) f.light.intensity = 30 * (1 - k);
    }
    this.fx = this.fx.filter((f) => { if (f.t < f.life) return true; if (f.mesh) { this.V.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); } f.own?.dispose(); if (f.light) this.V.scene.remove(f.light); return false; });
  }
  // a number rising from someone: damage, healing, words
  num(a, v, col = '#ffffff', big) {
    if (!this.numsEl) return; const e = document.createElement('div'); e.className = 'num' + (big ? ' big' : ''); e.textContent = v; e.style.color = col; this.numsEl.appendChild(e);
    const p = { e, x: a.x + rand(-0.3, 0.3), y: (a.y || 0) + 2.6 * (a.size || 1), z: a.z, t: 0 }; (this.nums ||= []).push(p);
  }
  stepNums(dt) {
    if (!this.nums) return; const cam = this.V.camera, v = new THREE.Vector3(), W = window.innerWidth, H = window.innerHeight;
    for (const p of this.nums) { p.t += dt; v.set(p.x, p.y + p.t * 1.6, p.z).project(cam); p.e.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -50%) scale(${p.t < 0.08 ? 1.5 - p.t * 6 : 1})`; p.e.style.opacity = p.t > 0.6 ? 1 - (p.t - 0.6) / 0.3 : 1; }
    this.nums = this.nums.filter((p) => { if (p.t < 0.9) return true; p.e.remove(); return false; });
  }
  // ---- the whole frame
  update(dt, hero) {
    if (this.hitstop > 0) { this.hitstop -= dt; this.stepFx(dt * 0.5); this.stepNums(dt); return; }
    for (const a of this.actors) { if (a.ai && a.alive) a.ai.think(dt); a.update(dt); }
    // people do not walk through each other (a soft push)
    const A = this.actors.filter((a) => a.alive && a.onGround && !['held', 'thrown', 'down', 'air'].includes(a.state));
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const a = A[i], b = A[j]; const dx = b.x - a.x, dz = (b.z - a.z) * 1.8, d = Math.hypot(dx, dz), m = 0.62 * (a.size + b.size) / 2; if (d < m && d > 0.001) { const push = (m - d) * 0.5, ux = dx / d, uz = dz / d / 1.8; if (a.state !== 'grab') { a.x -= ux * push; a.z -= uz * push; } if (b.state !== 'grab') { b.x += ux * push; b.z += uz * push; } } }
    for (const a of this.actors) if (a.vanish && !a.vanished) { a.vanished = true; a.body.visible(false); this.ev('gone', a); }
    this.actors = this.actors.filter((a) => { if (!a.vanished) return true; a.dispose(); return false; });
    this.stepProjs(dt); this.stepProps(dt); this.stepPickups(dt, hero); this.stepFx(dt); this.stepNums(dt);
  }
}
