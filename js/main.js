// 亂世豪俠傳: the game. A hero walks the road of the late Han from town to town, fighting whoever stands in the
// way, eating to grow strong, learning techniques from the great fighters of the age and putting four of them in
// hand. Everything the player has is in H (saved to localStorage); everything on the road is in the World.
import { createView, THREE, prefillLooks } from './render.js?v=6';
import { Stage, D } from './stage.js?v=6';
import { World } from './fight.js?v=6';
import { AI } from './ai.js?v=6';
import { UI, esc } from './ui.js?v=6';
import { audio } from './audio.js?v=6';
import { LOOKS, lookOf } from './looks.js?v=6';
import { portrait, stillCanvas } from './art.js?v=6';
import { MOVES, TECHS } from './moves.js?v=6';
import { HEROES, ALLY_OF, FOES, BOSSES, MASTERS, FOOD, ITEMS, GEAR, SLOT_N, ZONES, QUEST, RUMORS } from './data.js?v=6';

const V = createView(document.getElementById('view')), stage = new Stage(V), ui = new UI();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = (a) => a[Math.floor(Math.random() * a.length)], rand = (a, b) => a + Math.random() * (b - a);
const SAVE = 'sanguobrawl.save.v1';
const BLADES = ['sword', 'saber', 'spear', 'snake', 'glaive', 'halberd', 'axe', 'club', 'knife', 'staff', 'jis', 'mace'];
const STAT_N = { hp: '體力', sp: '氣', str: '力', kick: '腳', tech: '技', def: '防', spd: '速' };
const TECH_PRICE = { whirl: 300, hundred: 400, rising: 420, swallow: 500, headbutt: 450, quake: 650, kiball: 350, heal: 520, diamond: 700, ghost: 800, chain: 300, backspear: 600, arrow: 800, twinji: 900, tigercharge: 900, bellrush: 700, fire: 900, thunder: 1500, mist: 600, halberd: 3000, bodyslam: 2500, twinblade: 600, dragon: 800, roar: 700, sevenfold: 800 };
const expNeed = (lv) => Math.round(36 * Math.pow(lv, 1.75));

const G = {
  V, ui, stage, H: null, Z: null, zid: null, hero: null, ally: null, mode: 'title', t: 0, camX: 0, locked: null, foeBars: [], prompt: '', busy: false,
  // ---------------------------------------------------------------- the hero's numbers
  stats(id, isAlly) {
    const H = this.H, B = HEROES[id].st, lv = isAlly ? Math.max(1, H.lv - 1) : H.lv, k = lv - 1, g = isAlly ? H.allyGain || {} : H.gain, s = {};
    s.hp = B.hp + k * 13 + (g.hp || 0); s.sp = B.sp + k * 3 + (g.sp || 0);
    for (const n of ['str', 'kick', 'tech', 'def']) s[n] = B[n] + k * 1.35 + (g[n] || 0); s.spd = B.spd + k * 0.35 + (g.spd || 0);
    if (!isAlly) for (const slot in H.gear) { const it = GEAR[H.gear[slot]]; if (it) for (const n in STAT_N) if (it[n]) s[n] += it[n]; }
    for (const n in s) s[n] = Math.round(s[n]);
    return s;
  },
  // ---------------------------------------------------------------- a new game, a saved one
  newGame(heroId) {
    this.H = { hero: heroId, lv: 1, exp: 0, gold: 80, gain: {}, allyGain: {}, techs: [...HEROES[heroId].techs], slots: [HEROES[heroId].techs[0], null, null, null], gear: { w: null, a: null, b: null, c: null }, bag: { salve: 2 }, ally: null, zone: 'zhuo', beaten: {}, proven: {}, seen: {}, inn: 'zhuo', kills: 0, time: 0, quest: 0, flags: {} };
  },
  save(quiet) { try { const H = this.H; H.hp = this.hero?.hp; H.sp = this.hero?.sp; localStorage.setItem(SAVE, JSON.stringify(H)); if (!quiet) ui.toast('已存檔'); } catch (e) {} },
  load() { try { const s = localStorage.getItem(SAVE); if (!s) return false; this.H = JSON.parse(s); return true; } catch (e) { return false; } },
  hasSave() { try { return !!localStorage.getItem(SAVE); } catch (e) { return false; } },
  // ---------------------------------------------------------------- the road
  async enter(zid, from, o = {}) {
    this.busy = true; titleScene = false; document.getElementById('title').classList.remove('on'); if (!o.instant) await ui.fade(1, 300);
    const Z = ZONES[zid], H = this.H, prev = this.zid; this.zid = zid; this.Z = Z; H.zone = zid; const firstTime = !H.seen[zid]; H.seen[zid] = 1;
    stage.build({ ...Z, seed: zid.length * 977 + Z.len }); W.clear(); W.x0 = 0; W.x1 = Z.len; this.locked = null; this.foeBars = []; this.bossA = null; this.spar = null;
    // where the hero comes in
    let x = 3, z = D / 2, f = 1;
    if (from === 'left') { x = 1.6; f = 1; } else if (from === 'right') { x = Z.len - 1.6; f = -1; }
    else if (from === 'fork') { const fk = (Z.forks || []).find((k) => k.to === prev); if (fk) { x = fk.x; z = fk.down ? D - 0.5 : 0.5; f = 1; } }
    else if (from === 'inn') { const d = stage.doors.find((d) => d.shop === 'inn'); x = d ? d.x : 4; z = 0.6; }
    if (o.x != null) x = o.x;
    const hs = this.stats(H.hero), L = LOOKS[HEROES[H.hero].look];
    this.hero = W.add({ team: 'hero', name: HEROES[H.hero].name, look: L, st: hs, x, z, f, isHero: true, blade: BLADES.includes(L.wpn), canGrab: true, grip: HEROES[H.hero].grip || 1, hp: H.hp != null ? Math.min(hs.hp, H.hp) : hs.hp, sp: H.sp != null ? Math.min(hs.sp, H.sp) : hs.sp, spRegen: 1.1 });
    this.hero.reviveItem = () => { if ((H.bag.elixir || 0) > 0) { H.bag.elixir--; ui.toast('還魂丹發揮了效力！'); return true; } return false; };
    if (this.hero.hp <= 0) this.hero.hp = Math.round(hs.hp * 0.5);
    if (H.ally) this.spawnAlly(x - f * 1.5, z + 0.5);
    // the people of this place
    for (const [gx, type, n, lvb] of Z.foes || []) for (let i = 0; i < n; i++) this.makeFoe(type, Z.lv + lvb + (Math.random() < 0.3 ? 1 : 0), gx + rand(-2.2, 2.2) + i * 0.6, rand(0.4, D - 0.4));
    if (Z.kind === 'town') this.townsfolk(Z);
    this.props(Z);
    this.camX = clamp(x, W.x0 + 9, W.x1 - 9);
    audio.play(Z.kind === 'town' ? 'town' : Z.lv > 14 && Z.mood === 'mist' ? 'calm' : 'field');
    await ui.fade(0, 300); this.busy = false;
    ui.banner(`<div class="bz">${Z.name}</div><div class="bl">${Z.kind === 'town' ? '城鎮' : '推薦等級 ' + Z.lv}</div>`);
    this.save(true);
    if (firstTime) await this.arrive(zid);
  },
  async arrive(zid) {
    const H = this.H;
    if (zid === 'taoyuan' && !H.flags.oath) await this.oath();
    if (zid === 'zhuo' && !H.flags.intro) { H.flags.intro = 1; await ui.say('', '這裡是涿縣。\n客棧可以休息存檔，飯館吃飯能回復體力，有些菜吃了還會變強。\n盧植道場的老師肯教武藝，但要先打贏他。\n往右邊走出城，就是亂世的大路。'); }
  },
  spawnAlly(x, z) {
    const H = this.H, id = H.ally, L = LOOKS[HEROES[id].look], s = this.stats(id, true);
    const a = W.add({ team: 'ally', name: HEROES[id].name, look: L, st: s, x: clamp(x, 1, this.Z.len - 1), z: clamp(z, 0.3, D - 0.3), f: 1, blade: BLADES.includes(L.wpn), canGrab: true, hp: H.allyHp != null ? Math.max(1, Math.min(s.hp, H.allyHp)) : s.hp, sp: s.sp });
    a.ai = new AI(a, { aggro: 0.75, guard: 0.3, range: L.wpn === 'glaive' || L.wpn === 'spear' || L.wpn === 'snake' ? 2 : 1.6, moves: ['slash', 'kick', 'jab', ...HEROES[id].techs], pack: 3, awake: true, special: 0.18 }); a.ai.leader = this.hero; this.ally = a;
  },
  makeFoe(type, lv, x, z, extra = {}) {
    const F = FOES[type], k = lv - 1, g = F.grow, L = lookOf(F.look, Math.floor(Math.random() * 6));
    const st = { hp: Math.round(F.hp * (1 + k * 0.26)), sp: 100, str: F.str + k * 1.5 * g, kick: F.kick + k * 1.5 * g, tech: (F.tech || F.str) + k * 1.5 * g, def: F.def + k * 1.25 * g, spd: F.spd + k * 0.25 };
    const a = W.add({ team: 'foe', name: pick(F.names), look: L, st, lv, x: clamp(x, 1, this.Z.len - 1), z, f: -1, blade: BLADES.includes(L.wpn), superArmor: F.armor || 0, gold: F.gold * (1 + k * 0.15), exp: F.exp * (1 + k * 0.3), type, canGrab: !!F.ai.grab, ...extra });
    a.ai = new AI(a, { ...F.ai, moves: F.moves, wakeAt: extra.awake ? 99 : 11 }); if (extra.awake) a.ai.wake = true;
    return a;
  },
  makeBig(def, x, z, o = {}) {
    const st = { hp: def.hp, sp: 120, str: def.str, kick: def.kick, tech: def.tech, def: def.def, spd: def.spd }, L = LOOKS[def.look];
    const a = W.add({ team: 'foe', name: def.name, look: L, st, lv: def.lv, x, z, f: -1, blade: BLADES.includes(L.wpn), boss: true, superArmor: 0.55, gold: def.gold || 0, exp: def.exp || def.lv * 30, spRegen: 2.2, canGrab: true, dmgTaken: 1, ...o });
    a.ai = new AI(a, { ...def.ai, moves: def.moves, awake: true, pack: 9, special: 0.36, speedUp: 1.1 }); a.ai.wake = true; return a;
  },
  townsfolk(Z) {
    for (let i = 0; i < (Z.npcs || 6); i++) {
      const L = lookOf(Math.random() < 0.3 ? 'lady' : 'villager', i), x = rand(4, Z.len - 4);
      const a = W.add({ team: 'npc', name: pick(['百姓', '老丈', '小販', '書生', '大嬸', '路人']), look: L, st: { hp: 30, sp: 0, str: 1, kick: 1, tech: 1, def: 1, spd: 6 }, x, z: rand(0.6, D - 0.6), f: Math.random() < 0.5 ? 1 : -1, home: x, talk: pick(RUMORS) });
      a.ai = new AI(a, {}); a.anim = 'stand';
    }
  },
  props(Z) {
    const n = Z.kind === 'town' ? 3 : 4 + Math.floor(Z.len / 30);
    for (let i = 0; i < n; i++) { const x = rand(8, Z.len - 8), k = Z.kind === 'town' ? pick(['pot', 'crate', 'barrel']) : pick(['barrel', 'barrel', 'rock', 'pot', 'crate']); W.addProp(k, x, rand(0.3, D - 0.3)); }
  },
  // ---------------------------------------------------------------- the frame
  update(dt) {
    const H = this.H, h = this.hero, Z = this.Z; if (!h) return;
    H.time += dt;
    if (!ui.busy && !this.busy) this.control(dt);
    else { h.intent.mx = 0; h.intent.mz = 0; h.intent.guard = false; h.intent.run = false; }
    if (!ui.busy) W.update(dt, h);
    this.bossCheck();
    // the road goes on: to either side, and up or down the forks
    if (!this.busy && !ui.busy && h.alive && !this.locked && h.free) {
      if (h.x <= 0.75 && Z.left && h.intent.mx < 0) this.enter(Z.left, 'right');
      else if (h.x >= Z.len - 0.75 && Z.right && h.intent.mx > 0) this.enter(Z.right, 'left');
      else for (const fk of Z.forks || []) if (Math.abs(h.x - fk.x) < 1.6 && ((!fk.down && h.z < 0.35 && h.intent.mz < 0) || (fk.down && h.z > D - 0.35 && h.intent.mz > 0))) { this.enter(fk.to, 'fork'); break; }
    }
    // the camera follows, held inside the stretch (or the arena)
    const half = V.portrait ? 4.5 : 9.5, x0 = W.x0 + half, x1 = W.x1 - half;
    const tx = x1 < x0 ? (W.x0 + W.x1) / 2 : clamp(h.x + h.f * 1.2, x0, x1); this.camX += (tx - this.camX) * Math.min(1, dt * 4);
    let sx = 0, sy = 0; if (W.shake > 0) { W.shake -= dt; sx = (Math.random() - 0.5) * W.shake * 0.8; sy = (Math.random() - 0.5) * W.shake * 0.6; }
    const cz = V.portrait ? 26 : 21, cy = V.portrait ? 11 : 9.4;
    V.camera.position.set(this.camX + sx, cy + sy, D + cz); V.camera.lookAt(this.camX + sx, 1.5 + sy, D * 0.3);
    V.tilt(0.46, 0.21, 2.6);
    if (V.grade.uniforms.flash.value > 0) V.grade.uniforms.flash.value = Math.max(0, V.grade.uniforms.flash.value - dt * 2);
    stage.update(dt, this.t, this.camX);
    this.hud(dt);
  },
  // ---------------------------------------------------------------- the player's hands on the hero
  control(dt) {
    const h = this.hero, I = h.intent, K = input;
    let mx = (K.right ? 1 : 0) - (K.left ? 1 : 0), mz = (K.down ? 1 : 0) - (K.up ? 1 : 0);
    const S = K.stick || K.gstick;
    if (S) { mx = Math.abs(S.x) > 0.3 ? Math.sign(S.x) * Math.min(1, Math.abs(S.x) * 1.4) : 0; mz = Math.abs(S.y) > 0.3 ? Math.sign(S.y) * Math.min(1, Math.abs(S.y) * 1.4) : 0; if (!S.dig && Math.abs(S.x) > 0.92) K.run = true; }
    I.mx = mx; I.mz = mz; I.run = K.run && mx !== 0; if (!mx) K.run = false;
    I.guard = !!(K.guard || K.gguard);
    for (const a of K.take()) {
      if (a === 'E' && this.interact()) continue;
      if (a === 'Q') { this.useItem(); continue; }
      if (a === 'jump') { if (h.free) I.jump = true; continue; }
      let act = a; if (/^s\d$/.test(a)) { act = this.H.slots[+a[1]]; if (!act) { ui.toast('這一格還沒有裝招式（Esc → 招式）'); continue; } }
      if (h.state === 'move' && (act === 'J' || act === 'K')) { h.queue(act); continue; }
      if (h.state === 'move' && h.move && !MOVES[h.mname]?.cost && act !== 'J' && act !== 'K' && h.mf >= 1) { h.queued = act; continue; }
      I.act = act;
    }
    // what is at hand: a door, a person, a fork
    this.prompt = '';
    const Z = this.Z;
    const door = stage.doors.find((d) => Math.abs(d.x - h.x) < 1.1 && h.z < 1.3); if (door) this.prompt = `E 進入${door.name}`;
    const npc = W.actors.find((a) => a.team === 'npc' && Math.abs(a.x - h.x) < 1.3 && Math.abs(a.z - h.z) < 0.8); if (npc && !door) this.prompt = `E 和${npc.name}說話`;
    for (const fk of Z.forks || []) if (Math.abs(h.x - fk.x) < 1.6) this.prompt = `${fk.down ? '↓' : '↑'} 往${fk.label}`;
    if (!this.prompt && Z.left && h.x < 3) this.prompt = `← ${ZONES[Z.left].name}`;
    if (!this.prompt && Z.right && h.x > Z.len - 3 && !this.locked) this.prompt = `${ZONES[Z.right].name} →`;
    if (!this.prompt && W.propNear(h) && !h.carry) this.prompt = 'E 撿起來';
    if (h.carry) this.prompt = 'J 扔出去';
  },
  interact() {
    const h = this.hero; if (!h.free || h.carry) return false;
    const door = stage.doors.find((d) => Math.abs(d.x - h.x) < 1.1 && h.z < 1.3);
    if (door) { this.shop(door); return true; }
    const npc = W.actors.find((a) => a.team === 'npc' && Math.abs(a.x - h.x) < 1.3 && Math.abs(a.z - h.z) < 0.8);
    if (npc) { npc.f = h.x > npc.x ? 1 : -1; h.f = -npc.f; ui.say(npc.name, npc.talk || pick(RUMORS), portrait(npc.body.L, 3)); npc.talk = pick(RUMORS); return true; }
    return false;
  },
  useItem() {
    const H = this.H, h = this.hero; const k = (H.bag.salve || 0) > 0 && h.hp < h.st.hp ? 'salve' : (H.bag.pill || 0) > 0 ? 'pill' : null;
    if (!k) { ui.toast('沒有可以用的藥'); return; }
    H.bag[k]--; const it = ITEMS[k]; h.hp = Math.min(h.st.hp, h.hp + it.heal); if (it.sp) h.sp = Math.min(h.st.sp, h.sp + it.sp); W.sparkle(h, '#8aff9a'); audio.sfx('heal'); ui.toast(`用了${it.n}`);
  },
  // ---------------------------------------------------------------- what happens: blows, knockouts, pick-ups
  ev(type, d) {
    const H = this.H;
    if (type === 'ko') {
      const a = d.a;
      if (a.isHero) { audio.sfx('ko'); setTimeout(() => this.down(), 1600); return; }
      if (a.team === 'ally') { ui.toast(`${a.name}倒下了……（到下一個地方會再站起來）`); H.allyHp = Math.round(a.st.hp * 0.4); this.ally = null; return; }
      if (a.team === 'foe') {
        H.kills++; if (a.gold) for (let i = 0, n = Math.round(a.gold * rand(0.7, 1.3)); n > 0 && i < 6; i++) { const c = Math.ceil(n / (6 - i)); W.drop(a.x, a.z, 'gold', c); n -= c; }
        if (Math.random() < (a.boss ? 1 : 0.12)) W.drop(a.x, a.z, 'food');
        this.gainExp(Math.round(a.exp || 5));
        if (a.boss && a.bossId) this.bossDown(a);
        if (a.spar && this.spar && !this.spar.done) { this.spar.done = 1; this.sparWon(); }
      }
    }
    if (type === 'pickup') { if (d.kind === 'gold') { H.gold += d.n; audio.sfx('coin'); W.num(this.hero, '+' + d.n + '金', '#ffd86a'); } else { const h = this.hero, n = 30 + H.lv * 4; h.hp = Math.min(h.st.hp, h.hp + n); audio.sfx('eat'); W.num(h, '+' + n, '#7aff8a'); } }
    if (type === 'hit') { if (d.a === this.hero || d.a === this.ally) { const t = d.t; this.foeBars = [t, ...this.foeBars.filter((b) => b !== t)].slice(0, 3); } else if (d.t === this.hero && d.a.team === 'foe') { if (!this.foeBars.includes(d.a)) this.foeBars = [d.a, ...this.foeBars].slice(0, 3); } }
    if (type === 'nosp') { audio.sfx('nosp'); ui.toast('氣不夠！'); }
  },
  gainExp(n) {
    const H = this.H; H.exp += n; let up = false;
    while (H.exp >= expNeed(H.lv)) { H.exp -= expNeed(H.lv); H.lv++; up = true; }
    if (up) {
      const s = this.stats(H.hero), h = this.hero; h.st = s; h.hp = Math.min(s.hp, h.hp + Math.round(s.hp * 0.4)); h.sp = s.sp;
      if (this.ally) { const sa = this.stats(H.ally, true); this.ally.st = sa; this.ally.hp = Math.min(sa.hp, this.ally.hp + sa.hp * 0.4); }
      audio.sfx('level'); ui.banner(`<div class="bz">升級！</div><div class="bl">Lv ${H.lv}　體力 ${s.hp}　力 ${s.str}　腳 ${s.kick}　技 ${s.tech}</div>`, 2200);
    }
  },
  async down() {
    if (this.mode === 'dead') return; this.mode = 'dead'; const H = this.H;
    audio.play('calm'); await new Promise((r) => setTimeout(r, 400));
    const k = await ui.choose([{ k: 'inn', n: `在${ZONES[H.inn].name}的客棧醒來`, d: '帶在身上的錢少三成，體力全滿' }, { k: 'load', n: '讀取上次的存檔', d: '回到最後一次存檔的地方', off: !this.hasSave() }], { title: '勝敗乃兵家常事', cancel: false });
    this.mode = 'play';
    if (k === 'load' && this.load()) { await this.enter(this.H.zone, 'load'); return; }
    H.gold = Math.floor(H.gold * 0.7); H.hp = null; H.sp = null; H.allyHp = null; await this.enter(H.inn, 'inn');
  },
  // ---------------------------------------------------------------- bosses and their arenas
  bossCheck() {
    const Z = this.Z, H = this.H, h = this.hero; if (!Z || this.busy) return;
    if (Z.boss && !H.beaten[Z.boss] && !this.locked && h.x > Z.len - 24) this.bossStart(Z.boss);
    const b = this.bossA;
    if (b && b.alive) {
      const def = BOSSES[b.bossId], r = b.hp / b.st.hp;
      // reinforcements at two thirds and one third
      if (def.summon && !b.sum1 && r < 0.66) { b.sum1 = 1; this.callMen(b, def.summon); }
      if (def.summon && !b.sum2 && r < 0.33) { b.sum2 = 1; this.callMen(b, def.summon); }
      if (r < 0.5 && !b.angry) { b.angry = 1; b.ai.o.aggro = Math.min(1, b.ai.o.aggro + 0.15); b.spRegen = 3.2; W.say(b, '可惡！'); }
      if (def.flee && r < 0.3 && !b.fled) { b.fled = 1; this.bossFlee(b); }
    }
    if (this.spar && this.spar.a.alive && this.spar.a.hp < this.spar.a.st.hp * 0.25 && !this.spar.done) { this.spar.done = 1; this.sparWon(); }
  },
  async bossStart(id) {
    const def = BOSSES[id], Z = this.Z; this.locked = id; W.x0 = Z.len - 30; W.x1 = Z.len;
    for (const a of W.actors) if (a.team === 'foe' && a.x < W.x0) { a.x = W.x0 + 1; }
    const b = this.makeBig(def, Z.len - 5, D / 2); b.bossId = id; this.bossA = b; b.f = -1;
    audio.play('boss'); audio.sfx('gong');
    this.busy = true; await ui.say(def.name, def.line[0], portrait(LOOKS[def.look], 3)); this.busy = false;
    ui.banner(`<div class="bz boss">${def.name}</div><div class="bl">Lv ${def.lv}</div>`, 1800);
  },
  callMen(b, type) { for (let i = 0; i < 2; i++) { const a = this.makeFoe(type, this.Z.lv + 1, b.x + (i ? 3 : -3), rand(0.4, D - 0.4), { awake: true }); W.puff(a.x, a.z, '#c8c0b0'); } W.say(b, '來人啊！'); },
  async bossFlee(b) {
    const def = BOSSES[b.bossId]; b.inv = 99; b.ai = null; b.intent = {}; b.set('idle', 'idle'); this.busy = true;
    await ui.say(def.name, def.line[1], portrait(LOOKS[def.look], 3)); W.puff(b.x, b.z, '#d8d0c0'); b.vanish = true; this.busy = false;
    this.bossDown(b, true);
  },
  async bossDown(b, fled) {
    const H = this.H, id = b.bossId, def = BOSSES[id]; if (H.beaten[id]) return; H.beaten[id] = 1; this.bossA = null;
    for (const a of W.actors) if (a.team === 'foe' && a !== b && a.alive) { a.ko(this.hero); }
    if (fled) { H.gold += def.gold; this.gainExp(def.exp); }
    await new Promise((r) => setTimeout(r, fled ? 300 : 1500)); this.busy = true;
    if (!fled) await ui.say(def.name, def.line[1], portrait(LOOKS[def.look], 3));
    if (def.teach && !H.techs.includes(def.teach)) { H.techs.push(def.teach); const i = H.slots.indexOf(null); if (i >= 0) H.slots[i] = def.teach; audio.sfx('level'); await ui.say('', `從${def.name}的招式裡，你悟出了「${MOVES[def.teach].n}」！\n${MOVES[def.teach].d}${i >= 0 ? '' : '\n（Esc → 招式，可以把它放進四個招式格裡）'}`); }
    while (H.quest < QUEST.length && H.beaten[QUEST[H.quest].boss]) H.quest++;
    this.busy = false; audio.play('field');
    if (id === 'dongzhuo' && !H.beaten.lubu2) { await this.lubuReturns(); return; }
    if (id === 'lubu2') { await this.ending(); return; }
    W.x0 = 0; W.x1 = this.Z.len; this.locked = null; this.save(true);
  },
  async lubuReturns() {
    this.busy = true; await ui.say('', '董卓倒下的同時，大門外響起了一陣馬蹄聲……'); this.busy = false;
    const def = BOSSES.lubu2, b = this.makeBig(def, this.Z.len - 4, D / 2); b.bossId = 'lubu2'; this.bossA = b; this.locked = 'lubu2';
    W.puff(b.x, b.z, '#c8b0a0'); audio.play('boss'); audio.sfx('gong'); this.busy = true; await ui.say(def.name, def.line[0], portrait(LOOKS[def.look], 3)); this.busy = false;
  },
  async ending() {
    const H = this.H; H.flags.ended = 1; this.save(true); this.busy = true; audio.play('calm');
    await ui.fade(1, 900);
    await ui.say('', `董卓伏誅，呂布敗走。\n長安的百姓走上街頭，點起了久違的燈火。\n\n${HEROES[H.hero].name}的名字傳遍了天下。\n可是亂世還沒有結束——\n曹操、袁紹、孫堅……群雄正在各地崛起。`);
    await ui.say('', `通關紀錄\n等級 ${H.lv}　打倒的敵人 ${H.kills}　學會的招式 ${H.techs.length}\n遊戲時間 ${Math.floor(H.time / 60)} 分鐘\n\n感謝遊玩！你可以繼續在天下各地闖蕩，去找還沒拜訪過的高手。`);
    await ui.fade(0, 600); this.busy = false; W.x0 = 0; W.x1 = this.Z.len; this.locked = null;
  },
  // ---------------------------------------------------------------- the first meeting of the brothers
  async oath() {
    const H = this.H, me = H.hero; H.flags.oath = 1; this.busy = true;
    const face = (id) => portrait(LOOKS[HEROES[id].look], 3);
    if (me === 'zhaoyun') {
      await ui.say('劉備', '這位壯士好身手！我是劉備，正要和兩位兄弟去討伐黃巾賊。', face('liubei'));
      await ui.say('劉備', '如果你願意，我們一起走吧。', face('liubei'));
    } else {
      const others = ['liubei', 'guanyu', 'zhangfei'].filter((x) => x !== me);
      await ui.say('', '桃花開得正盛。三個人在桃樹下擺好了香案。');
      await ui.say(HEROES.liubei.name, '不求同年同月同日生，但願同年同月同日死！', face('liubei'));
      await ui.say('', `${HEROES[me].name}和${others.map((o) => HEROES[o].name).join('、')}在桃園結為兄弟。（所有人的體力上限 +10）`);
      H.gain.hp = (H.gain.hp || 0) + 10; H.allyGain.hp = (H.allyGain.hp || 0) + 10;
    }
    this.busy = false;
    if (!H.ally) { const k = await ui.choose(ALLY_OF[me].map((id) => ({ k: id, n: HEROES[id].name, d: HEROES[id].d, img: stillCanvas(LOOKS[HEROES[id].look], 'idle', 0, 1) })).concat([{ k: null, n: '一個人走', d: '之後也可以在酒館找他們' }]), { title: '誰和你同行？', cancel: false }); if (k) { H.ally = k; this.spawnAlly(this.hero.x - 1.5, this.hero.z + 0.5); ui.toast(`${HEROES[k].name}加入了！`); } }
    this.hero.st = this.stats(H.hero);
  },
  // ---------------------------------------------------------------- shops, inns, taverns and dojos
  async shop(door) {
    const H = this.H, Z = this.Z, S = Z.shops || {}, h = this.hero; this.busy = true; audio.sfx('select');
    try {
      if (door.shop === 'inn') await this.inn();
      if (door.shop === 'food') await this.buyFood(S.food || []);
      if (door.shop === 'items') await this.buyItems(S.items || []);
      if (door.shop === 'gear') await this.buyGear(S.gear || []);
      if (door.shop === 'books') await this.buyBooks(S.books || []);
      if (door.shop === 'tavern') await this.tavern();
      if (door.shop === 'dojo') await this.dojo(door.id && MASTERS[door.id] ? door.id : Z.master);
    } finally { this.busy = false; }
  },
  gold() { return `<span class="gold">金 ${this.H.gold}</span>`; },
  async inn() {
    const H = this.H, cost = 10 + this.Z.lv * 6;
    for (;;) {
      const k = await ui.choose([{ k: 'rest', n: '住一晚', sub: cost + ' 金', d: '體力、氣全滿，並存檔', off: H.gold < cost }, { k: 'save', n: '只存檔', sub: '免費' }, { k: null, n: '離開' }], { title: '客棧', head: this.gold() });
      if (k === 'rest') { H.gold -= cost; H.inn = this.zid; const h = this.hero; await ui.fade(1, 500); h.hp = h.st.hp; h.sp = h.st.sp; if (this.ally) this.ally.hp = this.ally.st.hp; H.allyHp = null; this.save(true); await ui.fade(0, 500); ui.toast('睡了一個好覺。（已存檔）'); audio.sfx('heal'); }
      else if (k === 'save') { H.inn = this.zid; this.save(); }
      else return;
    }
  },
  async buyFood(list) {
    const H = this.H, h = this.hero;
    for (;;) {
      const k = await ui.choose(list.map((id) => { const f = FOOD[id]; return { k: id, n: f.n, sub: f.price + ' 金', d: f.d, off: H.gold < f.price }; }).concat([{ k: null, n: '離開' }]), { title: '飯館', head: `${this.gold()}　體力 ${Math.round(h.hp)}/${h.st.hp}　氣 ${Math.round(h.sp)}/${h.st.sp}` });
      if (!k) return; const f = FOOD[k]; H.gold -= f.price; audio.sfx('eat');
      if (f.gain) { for (const n in f.gain) H.gain[n] = (H.gain[n] || 0) + f.gain[n]; const hp0 = h.st.hp; h.st = this.stats(H.hero); h.hp += h.st.hp - hp0; }
      if (f.heal) h.hp = Math.min(h.st.hp, h.hp + f.heal); if (f.sp) h.sp = Math.min(h.st.sp, h.sp + f.sp);
      if (this.ally && f.heal) this.ally.hp = Math.min(this.ally.st.hp, this.ally.hp + f.heal);
      ui.toast(`吃了${f.n}。${f.gain ? Object.entries(f.gain).map(([n, v]) => `${STAT_N[n]} +${v}`).join('、') + '！' : '好吃！'}`);
    }
  },
  async buyItems(list) {
    const H = this.H;
    for (;;) {
      const k = await ui.choose(list.map((id) => { const f = ITEMS[id]; return { k: id, n: f.n, sub: `${f.price} 金　持有 ${H.bag[id] || 0}`, d: f.d, off: H.gold < f.price || (H.bag[id] || 0) >= 9 }; }).concat([{ k: null, n: '離開' }]), { title: '藥舖', head: this.gold() });
      if (!k) return; H.gold -= ITEMS[k].price; H.bag[k] = (H.bag[k] || 0) + 1; audio.sfx('coin');
    }
  },
  async buyGear(list) {
    const H = this.H;
    for (;;) {
      const k = await ui.choose(list.map((id) => { const g = GEAR[id], cur = GEAR[H.gear[g.slot]]; const fx = Object.keys(STAT_N).filter((n) => g[n]).map((n) => `${STAT_N[n]}+${g[n]}`).join(' '); return { k: id, n: `${g.n}`, sub: H.gear[g.slot] === id ? '裝備中' : `${g.price} 金`, d: `${SLOT_N[g.slot]}：${fx}${cur ? `（現在：${cur.n}）` : ''}`, off: H.gear[g.slot] === id || H.gold < g.price }; }).concat([{ k: null, n: '離開' }]), { title: '兵器鋪', head: this.gold() });
      if (!k) return; const g = GEAR[k], old = GEAR[H.gear[g.slot]]; H.gold -= g.price; if (old) H.gold += Math.floor(old.price * 0.4);
      H.gear[g.slot] = k; const h = this.hero, hp0 = h.st.hp; h.st = this.stats(H.hero); h.hp += h.st.hp - hp0; audio.sfx('coin'); ui.toast(`裝備了${g.n}${old ? `（${old.n}賣了 ${Math.floor(old.price * 0.4)} 金）` : ''}`);
    }
  },
  async buyBooks(list) {
    const H = this.H;
    for (;;) {
      const k = await ui.choose(list.map((id) => ({ k: id, n: `《${MOVES[id].n}》秘笈`, sub: H.techs.includes(id) ? '已學會' : `${TECH_PRICE[id]} 金`, d: `${MOVES[id].d}（氣 ${MOVES[id].cost}）`, off: H.techs.includes(id) || H.gold < TECH_PRICE[id] })).concat([{ k: null, n: '離開' }]), { title: '書肆', head: this.gold() });
      if (!k) return; H.gold -= TECH_PRICE[k]; this.learn(k);
    }
  },
  learn(id) { const H = this.H; H.techs.push(id); const i = H.slots.indexOf(null); if (i >= 0) H.slots[i] = id; audio.sfx('level'); ui.toast(`學會了「${MOVES[id].n}」！${i >= 0 ? `已放進第 ${i + 1} 格` : '（Esc → 招式 可以換上）'}`, 3200); },
  async tavern() {
    const H = this.H, Z = this.Z;
    for (;;) {
      const cands = (ALLY_OF[H.hero] || []).filter((id) => id !== H.ally), cost = H.flags.oath ? 0 : 150;
      const k = await ui.choose([{ k: 'rumor', n: '打聽消息', d: '酒客們在聊些什麼？' }, ...(Z.allyHere ? cands.map((id) => ({ k: 'ally:' + id, n: `請${HEROES[id].name}同行`, sub: cost ? cost + ' 金' : '', d: HEROES[id].d, off: H.gold < cost })) : []), ...(H.ally ? [{ k: 'leave', n: `請${HEROES[H.ally].name}留下`, d: '一個人走' }] : []), { k: 'wine', n: '喝一杯', sub: '10 金', d: '氣全滿', off: H.gold < 10 }, { k: null, n: '離開' }], { title: '酒館', head: this.gold() });
      if (!k) return;
      if (k === 'rumor') { const r = this.rumor(); await ui.say('酒客', r); }
      if (k === 'wine') { H.gold -= 10; this.hero.sp = this.hero.st.sp; audio.sfx('eat'); ui.toast('好酒！'); }
      if (k === 'leave') { if (this.ally) { this.ally.vanish = true; } H.ally = null; this.ally = null; }
      if (k.startsWith?.('ally:')) { const id = k.slice(5); H.gold -= cost; if (this.ally) this.ally.vanish = true; H.ally = id; H.allyHp = null; this.spawnAlly(this.hero.x - 1, this.hero.z + 0.6); ui.toast(`${HEROES[id].name}加入了！`); await ui.say(HEROES[id].name, '好！我們一起闖蕩天下吧！', portrait(LOOKS[HEROES[id].look], 3)); }
    }
  },
  rumor() {
    const H = this.H, q = QUEST[H.quest];
    if (q && Math.random() < 0.4) return `聽說……${q.t}，是現在最要緊的事。`;
    return pick(RUMORS);
  },
  async dojo(mid) {
    const H = this.H, M = MASTERS[mid]; if (!M) { await ui.say('', '沒有人在。'); return; }
    const face = portrait(LOOKS[M.look], 3);
    if (!H.proven[mid]) {
      const k = await ui.ask(M.name, `${M.line}\n（Lv ${M.lv}。打到他認輸就算贏）`, [{ k: 'go', n: '切磋一下' }, { k: null, n: '改天再來' }], face);
      if (k === 'go') this.startSpar(mid);
      return;
    }
    for (;;) {
      const L = M.teaches.filter((id) => !H.techs.includes(id));
      if (!L.length) { await ui.say(M.name, '我會的都教給你了。剩下的，就靠你自己在戰鬥中領悟吧！', face); return; }
      const price = (id) => Math.round(TECH_PRICE[id] * 0.8);
      const k = await ui.choose(L.map((id) => ({ k: id, n: MOVES[id].n, sub: price(id) + ' 金', d: `${MOVES[id].d}（氣 ${MOVES[id].cost}）`, off: H.gold < price(id) })).concat([{ k: null, n: '離開' }]), { title: `${M.name}傳授武藝`, head: this.gold() });
      if (!k) return; H.gold -= price(k); this.learn(k); await ui.say(M.name, `「${MOVES[k].n}」的要訣，你記住了嗎？`, face);
    }
  },
  startSpar(mid) {
    const M = MASTERS[mid], h = this.hero, a = this.makeBig({ ...M, gold: 0, exp: M.lv * 25 }, clamp(h.x + 4, 2, this.Z.len - 2), h.z); a.spar = 1; a.name = M.name; a.f = -1;
    this.spar = { mid, a, live: true }; this.foeBars = [a]; audio.play('boss'); ui.banner(`<div class="bz">切磋</div><div class="bl">${M.name}　Lv ${M.lv}</div>`, 1500);
    for (const n of W.actors) if (n.team === 'npc') { n.ai = null; n.intent = {}; }
  },
  async sparWon() {
    const sp = this.spar, a = sp.a, M = MASTERS[sp.mid], H = this.H; a.ai = null; a.intent = {}; a.inv = 99; a.move = null; a.set('idle', 'idle'); a.team = 'npc';
    this.busy = true; await new Promise((r) => setTimeout(r, 500));
    await ui.say(M.name, '好！好本事！我服了。\n你想學什麼，儘管開口。', portrait(LOOKS[M.look], 3));
    H.proven[sp.mid] = 1; this.gainExp(M.lv * 25); a.vanish = true; this.spar = null; this.busy = false; audio.play(this.Z.kind === 'town' ? 'town' : 'field');
    this.save(true); await this.dojo(sp.mid);
  },
  // ---------------------------------------------------------------- the pause menu
  async menu() {
    if (ui.busy || this.busy || this.mode !== 'play') return; this.busy = true; audio.sfx('select');
    try {
      for (;;) {
        const H = this.H, q = QUEST[H.quest];
        const k = await ui.choose([{ k: 'st', n: '狀態' }, { k: 'tech', n: '招式' }, { k: 'gear', n: '裝備' }, { k: 'bag', n: '道具' }, { k: 'map', n: '地圖' }, { k: 'help', n: '操作說明' }, { k: 'opt', n: '設定' }, { k: 'title', n: '回到標題' }, { k: null, n: '返回遊戲' }], { title: '選單', head: `${this.gold()}　${q ? '目標：' + q.t : '天下太平了嗎？'}` });
        if (k === 'st') await this.status();
        else if (k === 'tech') await this.techMenu();
        else if (k === 'gear') await this.gearView();
        else if (k === 'bag') await this.bagMenu();
        else if (k === 'map') await this.map();
        else if (k === 'help') await help();
        else if (k === 'opt') await this.options();
        else if (k === 'title') { if ((await ui.choose([{ k: 1, n: '回到標題' }, { k: null, n: '取消' }], { title: '沒存檔的進度會不見喔' })) === 1) { this.busy = false; title(); return; } }
        else break;
      }
    } finally { this.busy = false; }
  },
  async status() {
    const H = this.H, s = this.stats(H.hero), h = this.hero, row = (id, st, hp, sp, lv) => `<div class="strow"><div class="stimg"></div><div><b>${HEROES[id].name}</b>　Lv ${lv}<br>體力 ${Math.round(hp)}/${st.hp}　氣 ${Math.round(sp)}/${st.sp}<br>${['str', 'kick', 'tech', 'def', 'spd'].map((n) => `${STAT_N[n]} ${st[n]}`).join('　')}</div></div>`;
    let html = `<div class="ptitle">狀態</div>` + row(H.hero, s, h.hp, h.sp, H.lv) + `<div class="stx">經驗 ${H.exp} / ${expNeed(H.lv)}　金 ${H.gold}　打倒 ${H.kills}　時間 ${Math.floor(H.time / 60)} 分</div>`;
    if (this.ally || H.ally) { const sa = this.stats(H.ally, true); html += row(H.ally, sa, this.ally ? this.ally.hp : H.allyHp ?? sa.hp, this.ally ? this.ally.sp : sa.sp, Math.max(1, H.lv - 1)); }
    html += `<div class="stx">吃出來的能力：${Object.entries(H.gain).map(([n, v]) => `${STAT_N[n]} +${v}`).join('、') || '還沒有'}</div>`;
    html += `<div class="stx">已拜師：${Object.keys(H.proven).map((m) => MASTERS[m].name).join('、') || '還沒有'}　擊敗：${Object.keys(H.beaten).map((b) => BOSSES[b].name).join('、') || '還沒有'}</div>`;
    const p = ui.sheet(html, 'stsheet'); const imgs = document.querySelectorAll('.stimg'); imgs[0]?.appendChild(stillCanvas(LOOKS[HEROES[H.hero].look], 'idle', 0, 1)); if (imgs[1]) imgs[1].appendChild(stillCanvas(LOOKS[HEROES[H.ally].look], 'idle', 0, 1)); await p;
  },
  async techMenu() {
    const H = this.H, keys = ['U', 'I', 'O', 'P'];
    for (;;) {
      const k = await ui.choose(H.slots.map((id, i) => ({ k: i, n: `${keys[i]}（${i + 1}）　${id ? MOVES[id].n : '－ 空 －'}`, sub: id ? `氣 ${MOVES[id].cost}` : '', d: id ? MOVES[id].d : '選這一格，放一個招式進去' })).concat([{ k: null, n: '返回' }]), { title: '招式', head: `學會的招式 ${H.techs.length} 種。按 U I O P（或 1 2 3 4）使出。` });
      if (k == null) return;
      const c = await ui.choose(H.techs.map((id) => ({ k: id, n: MOVES[id].n, sub: `氣 ${MOVES[id].cost}${H.slots.includes(id) ? '　已裝' : ''}`, d: MOVES[id].d })).concat([{ k: '-', n: '清空這一格' }, { k: null, n: '返回' }]), { title: `第 ${k + 1} 格` });
      if (c === '-') H.slots[k] = null; else if (c) { const j = H.slots.indexOf(c); if (j >= 0) H.slots[j] = H.slots[k]; H.slots[k] = c; }
    }
  },
  async gearView() {
    const H = this.H; await ui.sheet(`<div class="ptitle">裝備</div>` + ['w', 'a', 'b', 'c'].map((s) => { const g = GEAR[H.gear[s]]; return `<div class="stx"><b>${SLOT_N[s]}</b>　${g ? `${g.n}　${Object.keys(STAT_N).filter((n) => g[n]).map((n) => `${STAT_N[n]}+${g[n]}`).join(' ')}` : '（無）'}</div>`; }).join('') + `<div class="stx">在各地的兵器鋪可以買到更好的裝備。</div>`);
  },
  async bagMenu() {
    const H = this.H, h = this.hero;
    for (;;) {
      const L = Object.keys(ITEMS).filter((k) => H.bag[k] > 0);
      const k = await ui.choose(L.map((id) => ({ k: id, n: ITEMS[id].n, sub: '× ' + H.bag[id], d: ITEMS[id].d, off: id === 'elixir' })).concat([{ k: null, n: '返回' }]), { title: '道具', head: `體力 ${Math.round(h.hp)}/${h.st.hp}　氣 ${Math.round(h.sp)}/${h.st.sp}` });
      if (!k) return; const it = ITEMS[k]; H.bag[k]--; h.hp = Math.min(h.st.hp, h.hp + (it.heal || 0)); if (it.sp) h.sp = Math.min(h.st.sp, h.sp + it.sp); audio.sfx('heal');
    }
  },
  async map() {
    const H = this.H, P = MAPPOS; let svg = '';
    const link = (a, b) => { if (!P[a] || !P[b]) return; svg += `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" />`; };
    for (const [id, Z] of Object.entries(ZONES)) { if (Z.right) link(id, Z.right); for (const f of Z.forks || []) if (!f.down) link(id, f.to); }
    for (const [id, [x, y]] of Object.entries(P)) { const Z = ZONES[id], seen = H.seen[id], here = id === this.zid, boss = Z.boss && !H.beaten[Z.boss]; svg += `<g class="mz${here ? ' here' : ''}${seen ? '' : ' unseen'}${Z.kind === 'town' ? ' town' : ''}"><circle cx="${x}" cy="${y}" r="${Z.kind === 'town' ? 9 : 6}"/><text x="${x}" y="${y - 13}">${seen ? Z.name : '？'}</text>${seen && Z.kind !== 'town' ? `<text class="lv" x="${x}" y="${y + 20}">Lv${Z.lv}${boss ? ' ☠' : ''}</text>` : ''}</g>`; }
    await ui.sheet(`<div class="ptitle">天下地圖</div><svg viewBox="0 0 640 400" class="mapsvg">${svg}</svg><div class="stx">☠ 還有強敵坐鎮的地方。目標：${QUEST[H.quest]?.t || '自由闖蕩'}</div>`, 'mapsheet');
  },
  async options() {
    for (;;) {
      const k = await ui.choose([{ k: 'v', n: '音效音量', sub: Math.round(audio.vol * 10) + '', d: '← → 調整' }, { k: 'm', n: '音樂音量', sub: Math.round(audio.music * 10) + '', d: '← → 調整' }, { k: null, n: '返回' }], { title: '設定', onSide: (it, d) => { const s = d === 'left' ? -0.1 : 0.1; if (it.k === 'v') audio.setVol(clamp(audio.vol + s, 0, 1)); if (it.k === 'm') audio.setMusic(clamp(audio.music + s, 0, 1)); it.sub = Math.round((it.k === 'v' ? audio.vol : audio.music) * 10) + ''; try { localStorage.setItem('sanguobrawl.vol', JSON.stringify([audio.vol, audio.music])); } catch (e) {} } });
      if (!k) return;
    }
  },
  // ---------------------------------------------------------------- the heads-up display
  hudT: 0,
  hud(dt) {
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.05;
    const H = this.H, h = this.hero, el = document.getElementById('hud'); if (!H || !h) return; el.classList.add('on');
    const bar = (v, m) => `${clamp(v / m * 100, 0, 100).toFixed(1)}%`;
    hudEl.name.textContent = `${h.name}　Lv ${H.lv}`; hudEl.hp.style.width = bar(h.hp, h.st.hp); hudEl.sp.style.width = bar(h.sp, h.st.sp); hudEl.hpn.textContent = `${Math.max(0, Math.round(h.hp))}/${h.st.hp}`; hudEl.exp.style.width = bar(H.exp, expNeed(H.lv));
    hudEl.gold.textContent = `金 ${H.gold}`; hudEl.zone.textContent = this.Z ? `${this.Z.name}` : '';
    const a = this.ally; hudEl.ally.style.display = a ? '' : 'none'; if (a) { hudEl.allyN.textContent = a.name; hudEl.allyHp.style.width = bar(a.hp, a.st.hp); }
    hudEl.slots.forEach((s, i) => { const id = H.slots[i], m = MOVES[id]; s.querySelector('.sn').textContent = m ? m.n : '－'; s.querySelector('.sc').textContent = m ? m.cost : ''; s.classList.toggle('dim', !m || h.sp < m.cost); });
    hudEl.prompt.textContent = this.prompt; hudEl.prompt.style.opacity = this.prompt ? 1 : 0;
    const fb = this.foeBars.filter((b) => b.alive || (b.koT || 0) < 0.6).slice(0, 3);
    hudEl.foes.innerHTML = fb.map((b) => `<div class="fb${b.boss ? ' boss' : ''}"><div class="fn">${esc(b.name)}<small> Lv ${b.lv || ''}</small></div><div class="fbar"><i style="width:${bar(b.hp, b.st.hp)}"></i></div></div>`).join('');
    const c = Math.max(h.combo || 0, this.ally?.combo || 0); hudEl.combo.textContent = c >= 3 ? `${c} 連擊` : ''; hudEl.combo.classList.toggle('on', c >= 3);
  },
};
const W = new World(V, { ev: (t, d) => G.ev(t, d), sfx: (n) => audio.sfx(n), say: (a, t) => { W.num(a, t, '#ffe8a0', true); } });
G.W = W;
const MAPPOS = { tianzhu: [70, 60], taoyuan: [70, 140], zhuo: [150, 140], zhuo_out: [240, 140], jizhou: [330, 140], camp: [430, 140], guangzong: [530, 140], chenliu: [330, 225], sishui_rd: [410, 225], sishui: [480, 225], hulao: [550, 225], luoyang: [610, 290], hangu: [530, 330], meiwu: [440, 370], qiao: [250, 260], jiangxia: [190, 300], changsha: [120, 330], jiang: [200, 370], jianye: [300, 380], nanzhong: [60, 385] };

// ---------------------------------------------------------------- the HUD's elements
const $ = (s) => document.querySelector(s);
const hudEl = { name: $('#hname'), hp: $('#hhp i'), sp: $('#hsp i'), hpn: $('#hhpn'), exp: $('#hexp i'), gold: $('#hgold'), zone: $('#hzone'), ally: $('#hally'), allyN: $('#hallyn'), allyHp: $('#hallyhp i'), slots: [...document.querySelectorAll('#slots .slot')], prompt: $('#prompt'), foes: $('#foes'), combo: $('#combo') };

// ---------------------------------------------------------------- input: the keyboard and the touch screen
const input = {
  left: false, right: false, up: false, down: false, guard: false, run: false, q: [], last: {}, stick: null,
  take() { const q = this.q; this.q = []; return q; },
};
const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
const ACTS = { j: 'J', J: 'J', k: 'K', K: 'K', ' ': 'jump', e: 'E', E: 'E', u: 's0', U: 's0', i: 's1', I: 's1', o: 's2', O: 's2', p: 's3', P: 's3', 1: 's0', 2: 's1', 3: 's2', 4: 's3', q: 'Q', Q: 'Q' };
addEventListener('keydown', (e) => {
  audio.init();
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(k)) e.preventDefault();
  // menus first
  if (ui.busy) {
    const m = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', Enter: 'ok', j: 'ok', J: 'ok', ' ': 'ok', e: 'ok', z: 'ok', Escape: 'back', k: 'back', K: 'back', x: 'back', Backspace: 'back' }[k];
    if (m && !e.repeat) ui.key(m); else if (m && (m === 'up' || m === 'down')) ui.key(m);
    return;
  }
  if (G.mode === 'title' || G.mode === 'select') return;
  if (k === 'Escape' || k === 'Tab' || k === 'm' || k === 'M') { if (!e.repeat) (k === 'm' || k === 'M' ? (G.busy = true, G.map().finally(() => (G.busy = false))) : G.menu()); return; }
  const dir = KEYMAP[k];
  if (dir) { if (!input[dir] && (dir === 'left' || dir === 'right')) { const now = performance.now(); if (now - (input.last[dir] || 0) < 260) input.run = true; input.last[dir] = now; } input[dir] = true; return; }
  if (k === 'l' || k === 'L' || k === 'Shift') { input.guard = true; return; }
  if (ACTS[k] && !e.repeat) input.q.push(ACTS[k]);
});
addEventListener('keyup', (e) => { const dir = KEYMAP[e.key]; if (dir) { input[dir] = false; if ((dir === 'left' || dir === 'right') && !input.left && !input.right) input.run = false; } if (['l', 'L', 'Shift'].includes(e.key)) input.guard = false; });
addEventListener('blur', () => { for (const d of ['left', 'right', 'up', 'down', 'guard', 'run']) input[d] = false; });
// touch: a stick on the left, buttons on the right
function setupTouch() {
  const T = document.getElementById('touch'); if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return; T.classList.add('on');
  const pad = document.getElementById('tpad'), knob = document.getElementById('tknob'); let pid = null, c0 = null;
  pad.addEventListener('pointerdown', (e) => { audio.init(); pid = e.pointerId; const r = pad.getBoundingClientRect(); c0 = [r.left + r.width / 2, r.top + r.height / 2]; pad.setPointerCapture(pid); mv(e); });
  const mv = (e) => { if (e.pointerId !== pid) return; const dx = (e.clientX - c0[0]) / 50, dy = (e.clientY - c0[1]) / 50, l = Math.hypot(dx, dy), s = l > 1 ? 1 / l : 1; input.stick = { x: dx * s, y: dy * s }; knob.style.transform = `translate(${dx * s * 40}px, ${dy * s * 40}px)`; if (ui.busy) { const now = performance.now(); if (now - (mv.t || 0) > 220 && Math.abs(dy) > 0.6) { mv.t = now; ui.key(dy < 0 ? 'up' : 'down'); } } };
  pad.addEventListener('pointermove', mv);
  const up = (e) => { if (e.pointerId !== pid) return; pid = null; input.stick = null; input.run = false; knob.style.transform = ''; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  T.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.init(); b.classList.add('down'); if (ui.busy) { ui.key(k === 'K' || k === 'menu' ? 'back' : 'ok'); return; } if (G.mode !== 'play') return; if (k === 'guard') input.guard = true; else if (k === 'menu') G.menu(); else input.q.push(k); });
    const rel = () => { b.classList.remove('down'); if (k === 'guard') input.guard = false; };
    b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('pointerleave', rel);
  });
}

// gamepad (standard mapping: Xbox / PlayStation / Switch Pro): polled every frame
// X / □ attack · B / ○ kick · A / × jump · Y / △ door, talk, pick up · RB / R1 or RT / R2 guard
// hold LB / L1 + X A B Y: the four techniques · LT / L2 medicine · Start menu · Back / Select map
const PAD = { b: [], t: {}, dir: null, dirT: 0 };
function pollPad(now) {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected);
  if (!gp) { if (PAD.on) { PAD.on = false; input.gstick = null; input.gguard = false; } return; }
  if (!PAD.on) { PAD.on = true; PAD.b = gp.buttons.map((b) => b.pressed); return; }
  const B = (i) => !!gp.buttons[i]?.pressed, hit = (i) => B(i) && !PAD.b[i];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dx = (B(15) ? 1 : 0) - (B(14) ? 1 : 0), dy = (B(13) ? 1 : 0) - (B(12) ? 1 : 0);
  if (gp.buttons.some((b, i) => b.pressed && !PAD.b[i])) audio.init();
  if (ui.busy) {
    input.gstick = null; input.gguard = false;
    // menus: stick or d-pad steps with a repeat, A / × to choose, B / ○ to go back
    const sx = dx || (Math.abs(ax) > 0.6 ? Math.sign(ax) : 0), sy = dy || (Math.abs(ay) > 0.6 ? Math.sign(ay) : 0);
    const d = sy ? (sy < 0 ? 'up' : 'down') : sx ? (sx < 0 ? 'left' : 'right') : null;
    if (d !== PAD.dir) { PAD.dir = d; PAD.dirT = now + 320; if (d) ui.key(d); } else if (d && now > PAD.dirT) { PAD.dirT = now + 110; ui.key(d); }
    if (hit(0)) ui.key('ok'); if (hit(1) || hit(9)) ui.key('back');
  } else if (G.mode === 'play') {
    PAD.dir = null;
    const stick = Math.hypot(ax, ay) > 0.25;
    if (stick) input.gstick = { x: ax, y: ay };
    else if (dx || dy) {
      if (dx && dx !== PAD.ldx) { if (now - (PAD.tap[dx] || 0) < 260) input.run = true; PAD.tap[dx] = now; }
      input.gstick = { x: dx, y: dy, dig: true };
    } else { if (input.gstick) input.run = false; input.gstick = null; }
    PAD.ldx = dx;
    input.gguard = B(5) || B(7);
    const sh = B(4), face = [2, 0, 1, 3];
    if (sh) face.forEach((bi, si) => { if (hit(bi)) input.q.push('s' + si); });
    else { if (hit(2)) input.q.push('J'); if (hit(1)) input.q.push('K'); if (hit(0)) input.q.push('jump'); if (hit(3)) input.q.push('E'); }
    if (hit(6)) input.q.push('Q');
    if (hit(9)) G.menu();
    if (hit(8)) { G.busy = true; G.map().finally(() => (G.busy = false)); }
  }
  PAD.b = gp.buttons.map((b) => b.pressed);
}
PAD.tap = {};
addEventListener('gamepadconnected', () => ui.toast('手把已連接：X 攻擊　B 踢　A 跳　Y 互動　RB 防禦　LB＋XABY 招式'));

// ---------------------------------------------------------------- title, choosing a hero, help
async function help() {
  await ui.sheet(`<div class="ptitle">操作說明</div><table class="keys">
  <tr><td>← → ↑ ↓ / WASD</td><td>走路（左右連按兩下：奔跑）</td></tr>
  <tr><td>J</td><td>攻擊（連按出連段）・奔跑中：衝撞</td></tr>
  <tr><td>K</td><td>踢腿（連按：迴旋踢）・奔跑中：飛踢</td></tr>
  <tr><td>空白鍵</td><td>跳（空中按 J / K：空中攻擊）</td></tr>
  <tr><td>L / Shift（按住）</td><td>防禦・防禦中按 J：上勾拳</td></tr>
  <tr><td>U I O P / 1 2 3 4</td><td>使出裝備的四個招式（要用氣）</td></tr>
  <tr><td>E</td><td>進門、說話、撿起東西</td></tr>
  <tr><td>Q</td><td>吃藥</td></tr>
  <tr><td>Esc / Tab</td><td>選單（狀態、招式、裝備、地圖）・M：地圖</td></tr>
  <tr><td>手把</td><td>X／□ 攻擊・B／○ 踢・A／× 跳・Y／△ 互動・RB／RT 防禦<br>按住 LB＋X A B Y：四個招式・LT 吃藥・Start 選單・Back 地圖</td></tr></table>
  <div class="stx">・走向站不穩（頭上冒星星）的敵人就會抓住他：J 用膝蓋撞，K 把他扔出去砸別人。<br>・在飯館吃東西會回復體力，有些菜吃了能力會永久提升。<br>・各地道場的高手打贏了，就肯教你招式。打倒強敵也能領悟他的絕招。<br>・在客棧住一晚可以存檔；每到一個新地方也會自動存檔。</div>`, 'helpsheet');
}
let titleScene = null;
async function title() {
  G.mode = 'title'; G.hero = null; W.clear(); document.getElementById('hud').classList.remove('on'); ui.stack = []; document.getElementById('ui').innerHTML = '';
  stage.build({ ...ZONES.taoyuan, foes: [], seed: 5, mood: 'dusk' }); W.x0 = 0; W.x1 = 50;
  ['liubei', 'guanyu', 'zhangfei', 'zhaoyun'].forEach((id, i) => { const a = W.add({ team: 'npc', name: '', look: LOOKS[HEROES[id].look], st: { hp: 1, sp: 1, str: 1, kick: 1, tech: 1, def: 1, spd: 1 }, x: 21 + i * 2.6, z: 2.4 + (i % 2) * 0.8, f: i < 2 ? 1 : -1 }); a.play('idle'); });
  G.camX = 25; titleScene = true; audio.play('calm');
  const el = document.getElementById('title'); el.classList.add('on');
  for (;;) {
    const k = await ui.choose([{ k: 'new', n: '新的旅程' }, { k: 'cont', n: '繼續', off: !G.hasSave() }, { k: 'help', n: '操作說明' }], { cls: 'titlem', cancel: false });
    if (k === 'help') { await help(); continue; }
    if (k === 'cont' && G.load()) { el.classList.remove('on'); titleScene = false; G.mode = 'play'; await G.enter(G.H.zone, 'load'); return; }
    if (k === 'new') { const id = await chooseHero(); if (!id) continue; el.classList.remove('on'); titleScene = false; G.newGame(id); G.mode = 'play'; await opening(id); await G.enter('zhuo', 'start'); return; }
  }
}
async function chooseHero() {
  G.mode = 'select';
  const k = await ui.choose(Object.entries(HEROES).map(([id, h]) => ({ k: id, n: `${h.name}<small>　${h.zi}</small>`, d: `${h.d}<br><span class="hst">體力 ${h.st.hp}　氣 ${h.st.sp}　力 ${h.st.str}　腳 ${h.st.kick}　技 ${h.st.tech}　防 ${h.st.def}　速 ${h.st.spd}<br>招式：${h.techs.map((t) => MOVES[t].n).join('、')}</span>`, img: stillCanvas(LOOKS[h.look], 'idle', 0, 2) })), { title: '選擇你的英雄', cls: 'heroes' });
  G.mode = 'title'; return k;
}
async function opening(id) {
  await ui.fade(1, 600);
  await ui.say('', '東漢末年，朝廷腐敗，民不聊生。\n張角自稱「大賢良師」，頭綁黃巾的信徒遍布天下。\n「蒼天已死，黃天當立！」\n各地的黃巾賊燒殺搶掠，官府束手無策。');
  await ui.say('', `涿縣城門口貼出了招募義兵的榜文。\n${HEROES[id].name}看著榜文，握緊了手中的兵器。\n亂世之中，總要有人挺身而出。`);
}

// ---------------------------------------------------------------- the loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
  pollPad(now);
  if (titleScene) { W.update(dt, null); G.camX = 25 + Math.sin(G.t * 0.15) * 3; V.camera.position.set(G.camX, 8.6, D + 19); V.camera.lookAt(G.camX, 2.2, D * 0.3); V.tilt(0.42, 0.18, 2.8); stage.update(dt, G.t, G.camX); }
  else if (G.mode === 'play' || G.mode === 'dead') G.update(dt);
  V.render(); prefillLooks(3);
  requestAnimationFrame(frame);
}
try { const v = JSON.parse(localStorage.getItem('sanguobrawl.vol') || 'null'); if (v) { audio.vol = v[0]; audio.music = v[1]; } } catch (e) {}
setupTouch();
document.addEventListener('pointerdown', () => audio.init(), { once: true });
requestAnimationFrame(frame);
title();
window.SB = G;
