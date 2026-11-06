// How the people of the road fight. Every AI writes the same intent a player's keys would (mx, mz, act, guard,
// jump, run), so foes and allies play by the hero's rules. Foes take turns: only a few close in at once on
// the same target, the rest circle at a distance waiting for an opening.
import { MOVES } from './moves.js?v=8';
import { D } from './stage.js?v=8';
const rand = (a, b) => a + Math.random() * (b - a);

export class AI {
  constructor(a, o = {}) {
    this.a = a; this.o = { aggro: 0.6, guard: 0.1, range: 1.5, ...o }; this.cd = rand(0.4, 1.4); this.guardT = 0; this.wake = !!o.awake; this.side = Math.random() < 0.5 ? -1 : 1; this.repick = 0; this.wait = rand(0, 1); this.lines = o.lines;
  }
  attackers(t) { return this.a.W.actors.filter((b) => b.ai && b.ai.target === t && b.ai.engaged && b !== this.a && b.alive).length; }
  think(dt) {
    const a = this.a, I = a.intent, W = a.W, o = this.o;
    this.cd -= dt; this.repick -= dt; this.guardT -= dt;
    I.mx = 0; I.mz = 0; I.run = false;
    if (a.state === 'guard') { I.guard = this.guardT > 0; return; } I.guard = false;
    if (!a.free) return;
    if (a.team === 'npc') return this.wander(dt);
    // whom to fight
    if (!this.target || !this.target.alive || this.repick <= 0) { this.target = a.nearest(o.sight || 16); this.repick = rand(1, 2.2); }
    const t = this.target;
    if (!t) { if (a.team === 'ally' && this.leader) return this.follow(this.leader); return this.wander(dt); }
    const dx = t.x - a.x, dz = t.z - a.z, adx = Math.abs(dx);
    if (!this.wake) { if (adx < (o.wakeAt || 11)) { this.wake = true; this.cd = rand(0.3, 0.9); if (this.lines?.wake) W.say(a, this.lines.wake); } else return; }
    // a ranged fighter keeps his distance and shoots along the lane
    if (o.ranged) {
      const want = o.range * 0.8, sideX = t.x - Math.sign(dx || 1) * want;
      if (adx < 2.4 && Math.random() < 0.02) { I.act = MOVES.kick ? 'K' : null; return; }
      if (Math.abs(dz) > 0.35) I.mz = Math.sign(dz);
      if (Math.abs(a.x - sideX) > 0.8) I.mx = Math.sign(sideX - a.x) * 0.8;
      a.f = dx > 0 ? 1 : -1;
      if (this.cd <= 0 && Math.abs(dz) < 0.5 && adx < o.range + 3) { this.cd = rand(1.8, 3.2) / (o.speedUp || 1); if (a.can(o.ranged)) I.act = o.ranged; else this.cd = 0.5; }
      if (I.mx) a.f = dx > 0 ? 1 : -1;
      return;
    }
    // close-in fighters take turns
    const pack = o.pack || 2, room = pack - this.attackers(t);
    this.engaged = this.engaged ? adx < 6 : room > 0 && this.wait <= 0;
    // too many on one man: the ones further off step back and wait their turn
    if (this.engaged && room < 0) { const mine = a.W.actors.filter((b) => b.ai && b.ai.target === t && b.ai.engaged && b.alive).sort((p, q) => Math.abs(p.x - t.x) - Math.abs(q.x - t.x)); if (mine.indexOf(a) >= pack) { this.engaged = false; this.wait = rand(0.8, 2); } }
    // a man on the ground is left to get up
    if (this.engaged && (t.state === 'down' || t.state === 'getup') && adx < 2.2) { I.mx = -Math.sign(dx || 1) * 0.7; a.f = dx > 0 ? 1 : -1; return; }
    if (!this.engaged) {
      this.wait -= dt;
      const hx = t.x + this.side * rand(3.4, 4.6), hz = Math.max(0.3, Math.min(D - 0.3, t.z + Math.sin(performance.now() / 900 + a.id) * 1.4));
      if (Math.abs(hx - a.x) > 0.5) I.mx = Math.sign(hx - a.x) * 0.6; if (Math.abs(hz - a.z) > 0.3) I.mz = Math.sign(hz - a.z) * 0.6;
      a.f = dx > 0 ? 1 : -1; if (I.mx) setTimeout(() => {}, 0);
      if (this.wait <= 0 && room > 0) this.engaged = true;
      return;
    }
    // block a blow that is coming
    if (t.state === 'move' && t.move?.hits && adx < 2.8 && Math.abs(dz) < 0.8 && Math.sign(-dx) === t.f && Math.random() < o.guard * dt * 14) { a.f = dx > 0 ? 1 : -1; this.guardT = rand(0.35, 0.7); I.guard = true; return; }
    // into reach: same lane, the right distance
    const reach = o.range * a.size, wantX = t.x - Math.sign(dx || this.side) * reach * 0.8;
    if (Math.abs(dz) > 0.3) I.mz = Math.sign(dz) * Math.min(1, Math.abs(dz) * 1.5);
    if (adx > reach + 0.1 || adx < reach * 0.35) I.mx = Math.sign(wantX - a.x) * (adx > 6 && o.run !== false ? 1 : Math.min(1, Math.abs(wantX - a.x)));
    I.run = adx > 7 && Math.random() < 0.6;
    if (I.mx) a.f = I.mx > 0 ? 1 : -1;
    if (adx <= reach + 0.3 && Math.abs(dz) < 0.45) {
      a.f = dx > 0 ? 1 : -1; I.mx = 0;
      if (this.cd <= 0 && Math.random() < o.aggro * dt * 10 && !(t.state === 'down' || t.state === 'getup')) {
        const mv = this.pick(t, adx); if (mv) { I.act = mv; this.cd = rand(0.7, 1.6) * (1.2 - o.aggro * 0.5) / (o.speedUp || 1); this.engaged = Math.random() < 0.8; if (!this.engaged) this.wait = rand(0.6, 1.8); }
      }
    } else if (I.run && adx > 4 && adx < 6.5 && this.cd <= 0 && Math.random() < 0.02) { I.act = 'J'; this.cd = 1.5; }
  }
  // what to do now: the cheap blows most of the time, a technique now and then
  pick(t, adx) {
    const a = this.a, L = (this.o.moves || ['jab', 'kick']).filter((n) => a.can(n));
    const specials = L.filter((n) => MOVES[n].cost && !['dash'].includes(n)), plain = L.filter((n) => !MOVES[n].cost);
    if (this.o.grab && t.state === 'dizzy' && Math.random() < this.o.grab) { a.grab(t); return null; }
    if (specials.length && Math.random() < (this.o.special ?? (a.boss ? 0.34 : 0.12))) { const n = specials[Math.floor(Math.random() * specials.length)]; a.cds[n] = rand(3, 6); return n; }
    const n = plain[Math.floor(Math.random() * plain.length)];
    if (n === 'slash' || n === 'jab') { if (Math.random() < 0.55) { setTimeout(() => a.queue('J'), 120); if (Math.random() < 0.5) setTimeout(() => a.queue('J'), 330); } return 'J'; }
    if (n === 'kick') { if (Math.random() < 0.4) setTimeout(() => a.queue('K'), 140); return 'K'; }
    return n;
  }
  follow(L) {
    const a = this.a, I = a.intent, dx = L.x - L.f * 1.8 - a.x, dz = L.z + 0.6 - a.z;
    if (Math.abs(dx) > 1) I.mx = Math.sign(dx) * Math.min(1, Math.abs(dx) / 2); if (Math.abs(dz) > 0.4) I.mz = Math.sign(dz) * 0.7;
    I.run = Math.abs(dx) > 6; if (!I.mx) a.f = L.f;
  }
  wander(dt) {
    const a = this.a, I = a.intent; this.wt = (this.wt || 0) - dt;
    if (this.wt <= 0) { this.wt = rand(1.5, 4); this.goal = Math.random() < 0.45 ? null : { x: a.home + rand(-6, 6), z: rand(0.4, D - 0.4) }; }
    if (this.goal) { const dx = this.goal.x - a.x, dz = this.goal.z - a.z; if (Math.abs(dx) > 0.3) I.mx = Math.sign(dx) * 0.45; if (Math.abs(dz) > 0.2) I.mz = Math.sign(dz) * 0.45; if (Math.abs(dx) < 0.3 && Math.abs(dz) < 0.2) this.goal = null; }
  }
}
