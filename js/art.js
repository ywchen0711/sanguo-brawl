// Pixel characters drawn in code. Each frame is a little skeleton put in a pose (angles in degrees: 0 points
// straight down, positive turns toward the way the figure faces); the limbs, robe, armour, head, face and
// weapon are filled in as separate parts. Then every part is given volume: a ray toward the light (upper left)
// and one away from it measure how far each pixel is from the part's lit and shaded edges, which turns into a
// rounded, banded light; parts in front cast a small shadow on what lies behind, metal gets a hard glint,
// shadows lean cool and lights lean warm, and the figure gets a dark coloured outline.
// The people are about six heads tall, drawn at two pixels per old unit (32 pixels to a unit of the world).
// A look (L) says what the person wears; a sheet holds every frame of every animation for one look.
export const FW = 176, FH = 168;          // frame size in pixels; the feet stand at (88, 156)
export const OX = 88, OY = 156;
const R = Math.PI / 180;

const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (c, f) => { const [r, g, b] = hexRGB(c); return f >= 1 ? toHex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)) : toHex(r * f, g * f, b * f); };
export const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const pack = (c) => { const [r, g, b] = hexRGB(c); return (r << 16) | (g << 8) | b; };

// ---------------------------------------------------------------- a frame buffer: colour + which part each pixel belongs to
// part kinds: vol (rounded light), metal (rounded, hard glint), flat (no light, e.g. eyes, trim lines), and
// a pattern: scale (lamellar armour), fold (cloth folds running down)
class Buf {
  constructor() { this.c = new Int32Array(FW * FH).fill(-1); this.p = new Int16Array(FW * FH); this.part = 1; this.meta = [{ k: 'vol' }, { k: 'vol' }]; }
  set(x, y, col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= FW || y >= FH) return; const i = y * FW + x; this.c[i] = col; this.p[i] = this.part; }
  next(k = 'vol', pat = null) { this.part++; this.meta[this.part] = { k, pat }; }
  disc(cx, cy, r, col) { const c = pack(col), r2 = r * r; for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r2 + 0.25) this.set(x, y, c); } }
  seg(x0, y0, x1, y1, w, col) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let i = 0; i <= n; i++) { const t = i / n; this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, col); } }
  // a tapering limb: width w0 at the start, w1 at the end
  limb(a, b, w0, w1, col) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); for (let i = 0; i <= n; i++) { const t = i / n; this.disc(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (w0 + (w1 - w0) * t) / 2, col); } }
  // a path of points with a width that tapers from w0 to w1
  path(pts, w0, w1, col) { for (let i = 0; i + 1 < pts.length; i++) this.limb(pts[i], pts[i + 1], w0 + (w1 - w0) * (i / (pts.length - 1)), w0 + (w1 - w0) * ((i + 1) / (pts.length - 1)), col); }
  poly(pts, col) {
    const c = pack(col); let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  // light every part, cast the small shadows, outline the figure, and hand back the pixels
  finish(outline) {
    const W = FW, H = FH, c = this.c, p = this.p, M = this.meta, out = new Uint8ClampedArray(W * H * 4), col = new Int32Array(c);
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
    const lx = -0.6, ly = -0.8;                                   // toward the light
    const COOL = [52, 40, 92], WARM = [255, 240, 200];
    const tone = (v, f) => {
      let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
      if (f >= 1) { const t = Math.min(1, f - 1); r += (WARM[0] - r) * t; g += (WARM[1] - g) * t; b += (WARM[2] - b) * t; }
      else { r *= f; g *= f; b *= f; const t = (1 - f) * 0.45; r += (COOL[0] * f - r) * t; g += (COOL[1] * f - g) * t; b += (COOL[2] * f - b) * t; }
      return (Math.max(0, Math.min(255, Math.round(r))) << 16) | (Math.max(0, Math.min(255, Math.round(g))) << 8) | Math.max(0, Math.min(255, Math.round(b)));
    };
    const ray = (x, y, k, dx, dy) => { let n = 0; for (let t = 1; t < 26; t++) { const j = at(Math.round(x + dx * t), Math.round(y + dy * t)); if (j < 0 || c[j] < 0 || p[j] !== k) break; n = t; } return n; };
    const BANDS = [0.5, 0.64, 0.78, 0.9, 1, 1.1], MBANDS = [0.42, 0.6, 0.8, 1, 1.22, 1.55];
    const band = (f, L) => { let best = L[0]; for (const b of L) if (Math.abs(b - f) < Math.abs(best - f)) best = b; return best; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (c[i] < 0) continue; const k = p[i], m = M[k] || M[1];
      let f = 1;
      if (m.k !== 'flat') {
        const dl = ray(x, y, k, lx, ly), dd = ray(x, y, k, -lx, -ly), span = dl + dd;
        const n = span < 2 ? 0.35 : (dd - dl) / span;              // +1 at the lit edge, -1 at the shaded edge
        const lam = Math.max(0, n * 0.74 + Math.sqrt(Math.max(0, 1 - n * n)) * 0.58);
        if (m.k === 'metal') { f = 0.4 + lam * 0.85; if (n > 0.35 && n < 0.75) f = 1.55; f = band(f, MBANDS); }
        else if (m.k === 'soft') f = band(0.8 + lam * 0.34, BANDS);
        else { f = 0.5 + lam * 0.6; if (n < -0.82 && span > 4) f += 0.12; f = band(f, BANDS); }
        if (m.pat === 'scale') { const row = Math.floor(y / 3), xx = x + (row % 2) * 2; if (y % 3 === 2) f *= 0.78; else if (xx % 4 === 0) f *= 0.86; else if (y % 3 === 0 && xx % 4 === 2) f *= 1.08; }
        if (m.pat === 'fold') { const q = (x * 7 + Math.floor(y / 9) * 3) % 9; if (q === 0) f *= 0.84; else if (q === 1) f *= 1.06; }
      }
      // a part in front of this one, just toward the light, throws a little shadow on it
      if (!m.noShade) for (let t = 1; t <= 2; t++) { const j = at(Math.round(x + lx * t * 1.2), Math.round(y + ly * t * 1.2)); if (j >= 0 && c[j] >= 0 && p[j] > k && !(M[p[j]] || {}).noCast) { f *= 0.8; break; } }
      // a seam against what lies behind
      if (!m.noSeam) for (const j of [at(x, y - 1), at(x - 1, y), at(x + 1, y), at(x, y + 1)]) if (j >= 0 && c[j] >= 0 && p[j] < k && !(M[p[j]] || {}).noCast) { f *= 0.74; break; }
      col[i] = tone(c[i], f);
    }
    const oc = pack(outline || '#1a1018');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      if (c[i] >= 0) { const v = col[i]; out[o] = (v >> 16) & 255; out[o + 1] = (v >> 8) & 255; out[o + 2] = v & 255; out[o + 3] = 255; continue; }
      let n = -1; for (const j of [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]) if (j >= 0 && c[j] >= 0) { n = j; break; }
      if (n >= 0) { const v = tone(c[n], 0.3), m = (a, b) => Math.round(a * 0.45 + b * 0.55); out[o] = m((v >> 16) & 255, (oc >> 16) & 255); out[o + 1] = m((v >> 8) & 255, (oc >> 8) & 255); out[o + 2] = m(v & 255, oc & 255); out[o + 3] = 255; }
    }
    return out;
  }
}
const flat = (B, extra) => { B.next('flat'); Object.assign(B.meta[B.part], { noCast: true, noSeam: true, noShade: true }, extra); };

// ---------------------------------------------------------------- the skeleton
const dirOf = (a) => [Math.sin(a * R), Math.cos(a * R)];             // 0 = down, 90 = forward, 180 = up
const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// defaults every pose starts from
const BASE = { bx: 0, by: 0, lean: 4, hd: [0, 0], fa: [20, 60], ba: [-15, 50], fl: [10, 8], bl: [-10, 6], w: 120, w2: null, eye: 'open', mouth: 0, tilt: 0, fx: 0 };
export let lastHead = [OX, 40];

export function drawFrame(L, pose) {
  const P = { ...BASE, ...pose }, s = L.size || 1, B = new Buf();
  const fat = L.fat ? 1 : 0, skin = L.skin || '#f0c49a', robe = L.robe || '#4a6a9a', robe2 = L.robe2 || shade(robe, 0.7);
  const armor = L.bare ? null : L.armor, pants = L.pants || shade(robe, 0.6), boots = L.boots || '#3a2a22', trim = L.trim || robe2;
  // pelvis, the legs below it (the poses were made at 16.5 old units of leg; these legs are 41 pixels)
  const pel = [OX + P.bx * 2 * s, OY - 45 * s + P.by * 2.7 * s];
  const thigh = 21.5 * s, shin = 21 * s;
  const leg = (side, [a, k]) => { const hip = [pel[0] + side * 3 * s, pel[1] + 1]; const knee = add(hip, dirOf(a), thigh); const b = a - k, ank = add(knee, dirOf(b), shin); const fwd = [Math.cos(b * R), -Math.sin(b * R)]; return { hip, knee, ank, b, fwd, dn: dirOf(b) }; };
  const FL = leg(1, P.fl), BL = leg(-1, P.bl);
  const lean = P.lean, up = [Math.sin(lean * R), -Math.cos(lean * R)], fw = [Math.cos(lean * R), Math.sin(lean * R)];
  const T = (u, v) => [pel[0] + (fw[0] * u + up[0] * v) * s, pel[1] + (fw[1] * u + up[1] * v) * s];   // the body's own frame: u forward, v up
  const neck = T(0.6, 27.5);
  const ha = lean * 0.55 + P.tilt, hup = [Math.sin(ha * R), -Math.cos(ha * R)];
  const headC = [neck[0] + hup[0] * 10 * s + P.hd[0] * 2 * s, neck[1] + hup[1] * 10 * s + P.hd[1] * 2 * s];
  lastHead = headC;
  const shF = T(5, 23.2), shB = T(-5.6, 23.6);
  const arm = (sh, [a, e]) => { const d1 = dirOf(a), elb = add(sh, d1, 14 * s), d2 = dirOf(a + e), wr = add(elb, d2, 12.5 * s); return { sh, elb, wr, hand: add(wr, d2, 2.8 * s), ang: a + e, d2 }; };
  const FA = arm(shF, P.fa), BA = arm(shB, P.ba);

  const drawLeg = (G, back) => {
    const dk = (c) => (back ? shade(c, 0.8) : c), pc = dk(pants), bc = dk(boots);
    B.next('vol', 'fold'); B.limb(G.hip, G.knee, (10 + fat * 3) * s, 7.6 * s, pc); B.limb(G.knee, G.ank, 7.4 * s, 5.4 * s, L.bareLeg ? dk(skin) : pc);
    if (L.bareLeg) { B.next(); B.limb(G.hip, lerp(G.hip, G.knee, 0.6), (10.4 + fat * 3) * s, 8 * s, pc); }
    // a boot from below the knee, shaped heel to toe
    const top = lerp(G.knee, G.ank, 0.52), f = G.fwd, d = G.dn, A = G.ank, q = (u, v) => [A[0] + (f[0] * u + d[0] * v) * s, A[1] + (f[1] * u + d[1] * v) * s];
    B.next(); B.limb(top, A, 6.6 * s, 5.8 * s, bc);
    B.poly([q(-3, -2), q(-3.2, 2.4), q(-2.4, 3.2), q(7, 3.2), q(8, 1.8), q(7.4, 0.4), q(3.8, -1.4), q(2.2, -3)], bc);
    flat(B); { const r = (u, v) => [top[0] + (f[0] * u + d[0] * v) * s, top[1] + (f[1] * u + d[1] * v) * s]; B.poly([r(-3.5, -0.8), r(3.5, -0.8), r(3.5, 0.9), r(-3.5, 0.9)], dk(L.bootTrim || mix(bc, '#c8a868', 0.35))); }
  };
  const drawArm = (A, back, hold) => {
    const dk = (c) => (back ? shade(c, 0.78) : c), sk = dk(skin), sl = dk(robe);
    const perp = [A.d2[1], -A.d2[0]];
    if (L.bare) { B.next(); B.limb(A.sh, A.elb, (8.4 + fat * 2) * s, 6.6 * s, sk); B.limb(A.elb, A.wr, 6.6 * s, 5 * s, sk); }
    else if (L.sleeveLong) {
      // a wide sleeve that hangs from the forearm
      B.next('vol', 'fold'); B.limb(A.sh, A.elb, (8.6 + fat) * s, 8 * s, sl);
      const cuff = add(A.wr, A.d2, -0.6 * s), mid = lerp(A.elb, cuff, 0.55);
      B.limb(A.elb, cuff, 8.4 * s, 10 * s, sl);
      B.poly([add(A.elb, perp, 3.5 * s), add(cuff, perp, 5 * s), add(cuff, perp, -5 * s), [mid[0], mid[1] + 9 * s], add(A.elb, perp, -3.5 * s)], sl);
      flat(B); B.limb(add(cuff, perp, 4.6 * s), add(cuff, perp, -4.6 * s), 1.8 * s, 1.8 * s, dk(trim));
    } else {
      B.next('vol', 'fold'); B.limb(A.sh, A.elb, (8.4 + fat) * s, 7 * s, sl);
      const fore = L.bracer ? dk(L.bracer) : armor ? dk(shade(armor, 0.92)) : sk;
      B.next(armor ? 'metal' : 'vol'); B.limb(A.elb, A.wr, 6.6 * s, 5.4 * s, armor && !L.bracer ? sk : fore);
      if (armor || L.bracer) { B.next(L.bracer ? 'vol' : 'metal'); B.limb(lerp(A.elb, A.wr, 0.25), A.wr, 7 * s, 6.2 * s, fore); }
    }
    if (armor) { B.next('metal', 'scale'); const d1 = [A.elb[0] - A.sh[0], A.elb[1] - A.sh[1]], l = Math.hypot(...d1) || 1, u = [d1[0] / l, d1[1] / l]; B.limb(add(A.sh, u, -1 * s), add(A.sh, u, 6.5 * s), 10 * s, 9 * s, dk(armor)); }
    if (hold) hold();
    B.next(); B.disc(A.hand[0], A.hand[1], 3.1 * s, sk); B.disc(A.hand[0] + perp[0] * 1.6 * s, A.hand[1] + perp[1] * 1.6 * s, 1.7 * s, sk);
  };
  // ---- behind: the back arm (and a second weapon), the back leg, a cape
  if (P.w2 != null && L.wpn2) drawWeapon(B, L.wpn2, BA.hand, P.w2, s * 2, true);
  drawArm(BA, true);
  drawLeg(BL, true);
  if (L.cape) {
    const sway = P.cape ?? 0, c0 = T(-2, 25.5), c1 = T(-6.5, 23), lo = [pel[0] - (17 + sway) * s, pel[1] + 20 * s], lo2 = [pel[0] - (4 + sway * 0.5) * s, pel[1] + 23 * s];
    B.next('vol', 'fold'); B.poly([c0, c1, lerp(c1, lo, 0.5), lo, lerp(lo, lo2, 0.5), lo2, T(-2, 8)], shade(L.cape, 0.86));
  }
  // ---- the body
  const tor = [T(-7.4 - fat, -1), T(-6.2 - fat, 7), T(-6.4 - fat, 12), T(-8.2 - fat * 0.5, 19), T(-8, 23.6), T(-4.6, 27), T(4.4, 26.8), T(8 + fat, 23.4), T(8.6 + fat * 2, 18.6), T(6.8 + fat * 3, 13), T(6.2 + fat * 6.5, 7), T(7.4 + fat * 3, -1)];
  B.next(); B.poly(tor, L.bare ? skin : robe);
  // the neck
  B.next(); B.limb(T(0, 25), add(neck, hup, 5 * s), 5.6 * s, 5.2 * s, skin);
  if (L.bare) {
    flat(B); const ln = shade(skin, 0.72);
    B.seg(...T(1.5, 19.5), ...T(7 + fat, 17.5), 0.9, ln); B.seg(...T(4.5, 15), ...T(4.6 + fat * 3, 9.5), 0.8, ln);       // chest and belly
    B.disc(...T(5.4 + fat, 18), 0.8 * s, shade(skin, 0.6));
  } else if (armor) {
    // the robe's collar shows over a breastplate of small plates, a round mirror on the chest
    B.next('metal', 'scale'); B.poly([T(-6.8 - fat, 10), T(-7.6, 19), T(-6.4, 23.4), T(6.8 + fat, 23), T(8 + fat * 2, 17), T(6.6 + fat * 6, 10)], armor);
    B.next(); B.poly([T(-3.4, 27.2), T(3.6, 27), T(4.4, 23.4), T(0.6, 21.4), T(-3.8, 24)], L.robe2 ? robe2 : robe);
    flat(B); B.seg(...T(-1, 27), ...T(3.4, 26.4), 1.2, '#efe8d8');
    if (L.mirror !== 0) { B.next('metal'); B.disc(...T(1.8 + fat * 1.5, 17), 3.6 * s, L.mirrorC || '#d8b048'); B.next('metal'); B.disc(...T(1.8 + fat * 1.5, 17), 1.9 * s, mix(L.mirrorC || '#d8b048', '#ffffff', 0.35)); }
  } else {
    // a robe crossed over at the chest
    flat(B); B.poly([T(-2.4, 27.2), T(0.8, 27.2), T(4.6 + fat * 4, 10), T(2.6 + fat * 4, 9.4)], robe2);
    flat(B); B.seg(...T(-0.8, 27), ...T(2.4, 26.8), 1.1, '#efe8d8');
  }
  // the belt, its buckle, the sash ends
  B.next(); B.poly([T(-7.6 - fat, 6.4), T(6.6 + fat * 6.2, 6.4), T(6.8 + fat * 5.8, 10.4), T(-7.6 - fat, 10.4)], L.belt || '#6a4a2a');
  if (L.sash) { B.next('vol', 'fold'); const k = T(1 + fat * 5, 7), sw = P.cape ?? 0; B.path([k, [k[0] - (1 + sw * 0.2) * s, k[1] + 8 * s], [k[0] - (3 + sw * 0.4) * s, k[1] + 16 * s]], 3 * s, 2.4 * s, L.sash); }
  // the front leg, then the skirt of the robe (or armour tassets) over it, following the legs
  drawLeg(FL, false);
  if (L.skirt !== 0) {
    const len = L.skirt || 0.55, kF = lerp(FL.hip, FL.ank, len), kB = lerp(BL.hip, BL.ank, len);
    const sk = L.skirtC || robe, hy = Math.max(kF[1], kB[1]) + 2 * s, x0 = Math.min(kF[0], kB[0]) - 5 * s, x1 = Math.max(kF[0], kB[0]) + 5 * s;
    B.next('vol', 'fold'); B.poly([T(-7.2 - fat, 8), T(6.8 + fat * 6, 8), [x1, hy - 1], [lerp([x0, hy], [x1, hy], 0.5)[0], hy + 1.5 * s], [x0, hy]], sk);
    flat(B); B.seg(x0 + 1, hy - 0.5, x1 - 1, hy - 1.2, 2 * s, shade(trim, 0.95));
    if (armor && L.skirtC == null) { const ty = pel[1] + (hy - pel[1]) * 0.62; B.next('metal', 'scale'); B.poly([T(-7.4 - fat, 7.6), T(7 + fat * 6, 7.6), [x1 - 1, ty], [x0 + 1, ty + 1]], shade(armor, 0.95)); flat(B); B.seg(x0 + 1.5, ty + 0.5, x1 - 1.5, ty, 1.4 * s, shade(L.armorTrim || '#c89a3a', 0.9)); }
  }
  if (L.beltGold || armor) { B.next('metal'); B.disc(...T(2.6 + fat * 5, 8.4), 2.6 * s, '#e0b040'); B.next('metal'); B.disc(...T(2.6 + fat * 5, 8.4), 1 * s, '#fff0b0'); }
  // ---- the head
  drawHead(B, L, headC, s * 1.16 * (L.head || 1), P, ha);
  // ---- the weapon in the front hand, gripped by it; the front arm over the body
  drawArm(FA, false, () => { if (L.wpn && P.w != null) drawWeapon(B, L.wpn, FA.hand, P.w, s * 2, false, L.wpnC); });
  if (L.shield) { const c = FA.wr; B.next(); B.disc(c[0] + 2, c[1], 8.6 * s, L.shield); flat(B); B.disc(c[0] + 2, c[1], 2.6 * s, '#d8c070'); }
  return B.finish(L.outline);
}

// ---------------------------------------------------------------- the head, in its own frame: u toward the face, v down
function drawHead(B, L, c, k, P, ang) {
  const skin = L.skin || '#f0c49a', hair = L.hair || '#1e1814', cs = Math.cos(ang * R), sn = Math.sin(ang * R);
  let du = 0; const H = (u, v) => { u += du; return [c[0] + (u * cs - v * sn) * k, c[1] + (u * sn + v * cs) * k]; };
  const poly = (pts, col) => B.poly(pts.map(([u, v]) => H(u, v)), col);
  const ell = (u, v, ru, rv, col, a0 = 0, a1 = 360, extra = []) => { const pts = []; for (let a = a0; a <= a1; a += 15) pts.push([u + Math.cos(a * R) * ru, v + Math.sin(a * R) * rv]); poly(pts.concat(extra), col); };
  const seg = (u0, v0, u1, v1, w, col) => { const A = H(u0, v0), Bp = H(u1, v1); B.seg(A[0], A[1], Bp[0], Bp[1], w * k, col); };
  const path = (pts, w0, w1, col) => B.path(pts.map(([u, v]) => H(u, v)), w0 * k, w1 * k, col);
  const hc = L.hatC || '#3a3a5a', h2 = L.hatC2 || '#c03030', sheen = mix(hair, '#b8c0d8', 0.3);
  // long hair falls behind
  if (L.longHair) { B.next('vol', 'fold'); poly([[-4, -1], [-7.6, 3], [-8.4, 13], [-6.6, 19], [-3.6, 17], [-2.6, 6]], hair); }
  if (L.hat === 'plume' || L.hat === 'helm' || L.hat === 'feathers') { /* drawn with the helm */ }
  // skull, jaw, nose
  B.next('soft'); B.meta[B.part].noShade = true; ell(0, 0, 6.8, 7.2, skin); poly([[-4, 2], [6.5, 0.4], [7, 3.6], [6.4, 6.2], [4.4, 8.2], [1.6, 8.8], [-1.6, 7.4], [-4, 5]], skin); poly([[6.2, 0.8], [7.6, 3.8], [6.4, 4.3]], skin);
  // ear
  B.next(); ell(-2.8, 2, 1.6, 2.3, shade(skin, 0.92));
  // hair over the top and back of the head, bangs over the brow, the sheen of it
  B.next();
  if (L.hat !== 'bald') {
    const pts = []; for (let a = -25; a >= -205; a -= 15) pts.push([Math.cos(a * R) * 7.7, Math.sin(a * R) * 8]);
    poly(pts.concat([[-7.2, 4], [-4.6, 6.4], [-2.6, 4.2], [-2.4, 0.4], [-0.4, -1.4], [2.2, -2.6], [4.6, -3.2], [6.4, -2.2]]), hair);
    poly([[0.4, -6.6], [5.8, -0.8], [3.6, -3.4]], hair); poly([[2.8, -6.2], [7.4, -1.6], [5.2, -3.8]], hair); poly([[-0.4, -2], [0.8, 3.6], [1, -1.4]], hair);
    flat(B); seg(-4.6, -5, 1.6, -6.4, 1.2, sheen); seg(-6, -2.8, -4.8, -4.6, 1, sheen);
  } else { flat(B); seg(-3, -5.4, 1, -6.4, 1.3, shade(skin, 1.25)); }
  // eyes, brows, mouth: the face is turned three-quarters toward us
  du = -1.7; flat(B); seg(5.6, 2.2, 6.4, 3.9, 0.8, shade(skin, 0.8));
  const eyeC = L.eyeC || '#2a1a14', lid = '#1a1010';
  flat(B);
  if (P.eye === 'closed') { seg(1.6, 1.4, 5, 1.6, 0.9, lid); seg(5.8, 1.3, 7.1, 1.4, 0.8, lid); }
  else if (P.eye === 'hurt') { seg(1.8, 0.2, 4.6, 1.2, 0.9, lid); seg(1.8, 2.2, 4.6, 1.2, 0.9, lid); seg(5.9, 0.6, 7, 1.2, 0.8, lid); }
  else {
    ell(3.2, 1.3, 1.9, 1.15, '#f4efe6'); ell(3.8, 1.35, 1, 1.3, eyeC); ell(6.5, 1.2, 0.95, 0.9, '#f4efe6'); ell(6.7, 1.25, 0.6, 1, eyeC);
    flat(B); B.disc(...H(3.6, 0.7), 0.5 * k, '#ffffff');
    flat(B); seg(1.2, 0.2, 5.2, 0, 0.75, lid); seg(1.2, 0.2, 0.8, 0.8, 0.6, lid); seg(5.7, 0.2, 7.3, 0.3, 0.65, lid);
    if (L.lashes) seg(0.6, -0.2, 1.4, 0.4, 0.8, lid);
  }
  flat(B); const bw = (L.brow || (L.fierce ? 1.2 : 0.85)) * 1.1, bcol = shade(hair, 0.9);
  if (L.fierce) { seg(0.8, -3, 4.8, -1.5, bw, bcol); seg(5.8, -1.6, 7.3, -2.2, bw * 0.8, bcol); } else { seg(1, -2.2, 4.8, -2.7, bw, bcol); seg(5.8, -2.6, 7.2, -2.3, bw * 0.8, bcol); }
  flat(B);
  if (P.mouth) { ell(5.6, 5.9, 1.3, 1.1, '#5a1a1a'); flat(B); seg(4.8, 5.1, 6.4, 5.1, 0.6, '#efe8e0'); }
  else seg(4.6, 5.7, 6.5, 5.5, 0.75, L.lips || shade(skin, 0.62));
  if (L.blush) { flat(B); ell(4, 3.6, 1.4, 0.7, mix(skin, '#ff7a7a', 0.3)); }
  if (L.paint) { flat(B); seg(1, 3, 6.4, 3, 0.9, L.paint); seg(1.4, 4.6, 5.6, 4.6, 0.7, L.paint); }
  // the beard
  const bc = L.beardC || hair, bl = mix(bc, '#c8c0b8', 0.22);
  if (L.beard === 'long') {
    B.next('vol', 'fold'); poly([[-1.8, 4], [0.4, 4.4], [1.6, 6.2], [6.2, 5.8], [6.9, 8.2], [5.8, 16], [4.2, 24], [2.6, 26.4], [1.2, 18], [-0.4, 10], [-2, 7]], bc);
    flat(B); seg(3.6, 9, 3.4, 20, 0.6, bl); seg(5.2, 9, 4.6, 17, 0.6, bl);
    B.next(); poly([[4.4, 4.6], [7.2, 4.4], [7.6, 5.4], [6, 5.3], [4.6, 7.6], [3.9, 5.4]], bc);
  }
  if (L.beard === 'bushy') {
    B.next(); poly([[-3.6, 3], [6.9, 3.4], [7.4, 6.2], [5.6, 9.6], [2, 11.2], [-2, 9.2], [-4, 5.2]], bc);
    for (const [u, v, a] of [[7, 5, 20], [6.6, 8, 45], [4.6, 10.4, 70], [1.6, 11, 95], [-1.4, 9.8, 120], [-3.4, 7.4, 145], [-4, 4.6, 170]]) { const d = [Math.cos(a * R), Math.sin(a * R)], p = [-d[1], d[0]]; poly([[u + p[0] * 1.5, v + p[1] * 1.5], [u + d[0] * 3.4, v + d[1] * 3.4], [u - p[0] * 1.5, v - p[1] * 1.5]], bc); }
    poly([[4.4, 4.4], [7.6, 3.8], [9.6, 2.4], [8.2, 4.8], [5.4, 6]], bc);
    flat(B); seg(2, 7.6, 3.8, 10, 0.6, bl); seg(-1, 7, 0, 9.4, 0.6, bl);
  }
  if (L.beard === 'goatee') { B.next(); poly([[4.4, 4.6], [7.1, 4.4], [7.4, 5.2], [6, 5.2], [4.8, 6.6]], bc); poly([[3, 7.6], [5.8, 7.8], [4.4, 12.6]], bc); }
  if (L.beard === 'mustache') { B.next(); poly([[4.4, 4.6], [7.2, 4.4], [7.5, 5.3], [6, 5.2], [4.6, 7]], bc); }
  if (L.beard === 'stubble') { flat(B); const sc = mix(skin, '#3a3030', 0.28); for (const [u, v] of [[1, 6.8], [2.6, 7.8], [4.4, 7.6], [5.8, 6.6], [3.2, 6.2], [0, 5.4], [5, 5.8], [2, 8.4]]) B.disc(...H(u, v), 0.5 * k, sc); }
  du = 0;
  // what is on the head
  const metalHat = (pts, col) => { B.next('metal'); poly(pts, col); };
  switch (L.hat) {
    case 'bun': B.next(); ell(-2.6, -7.4, 3.2, 2.8, hair); flat(B); seg(-4.8, -5.6, -0.4, -6.4, 1.4, hc); break;
    case 'crown': B.next(); ell(-0.8, -7.8, 3, 2.6, hair); B.next(); poly([[-3.6, -7], [2.8, -7.6], [2.4, -11.6], [-3.2, -11]], hc); flat(B); seg(-3.2, -8.2, 2.6, -8.8, 0.7, '#e8c860'); B.next('metal'); seg(-5.2, -9.6, 4.4, -10.2, 0.8, '#e8c860'); break;
    case 'band': { B.next(); seg(-7.4, -2.2, 7.2, -3.6, 2.6, hc); const sw = (P.cape || 0) * 0.3; B.next('vol', 'fold'); path([[-7, -2], [-10, 1 - sw], [-13, 3 - sw]], 2.4, 1.4, hc); path([[-7, -1.6], [-9.6, 4], [-11, 7.4]], 2.2, 1.2, shade(hc, 0.9)); break; }
    case 'turban': {
      B.next('vol', 'fold'); const pts = []; for (let a = -15; a >= -195; a -= 15) pts.push([Math.cos(a * R) * 8.8, Math.sin(a * R) * 8.8 - 0.6]); poly(pts.concat([[-8, -1], [7.6, -2.4]]), hc);
      flat(B); seg(-7.8, -3.4, 7.4, -5.4, 0.8, shade(hc, 0.75)); seg(-6.8, -6.6, 5.6, -8, 0.7, shade(hc, 0.8));
      B.next('vol', 'fold'); path([[-7.6, -2.6], [-10.6, 1.4], [-12.4, 5.4]], 2.8, 1.4, hc); break;
    }
    case 'helm': case 'plume': case 'feathers': {
      const pts = []; for (let a = -8; a >= -188; a -= 15) pts.push([Math.cos(a * R) * 8.6, Math.sin(a * R) * 8.8 - 0.4]);
      B.next('metal', 'scale'); poly([[-4.4, -1], [-9.4, -0.6], [-10, 6.4], [-5.4, 7.6]], shade(hc, 0.9));
      metalHat(pts.concat([[-8.6, -0.8], [8.4, -1.6]]), hc);
      B.next('metal'); seg(-8.8, -0.6, 8.6, -1.8, 1.8, shade(hc, 0.75));
      B.next('metal'); path([[0, -8.6], [0.3, -11.4]], 2.2, 1.2, '#e0b848');
      B.next('metal'); B.disc(...H(4.6, -4.8), 1.4 * k, '#e8c860');
      if (L.hat === 'plume') { B.next('vol', 'fold'); path([[0.3, -11.4], [-3.6, -13.2], [-8.6, -11.4], [-12, -6.6], [-13, -2]], 4.4, 1.4, h2); path([[0, -11], [-4.6, -11], [-9, -7.6], [-10.6, -3]], 3, 1, shade(h2, 0.85)); }
      if (L.hat === 'feathers') for (const [p0, p1, p2] of [[[1.4, -9.6], [5, -34], [-30, -31]], [[-1.2, -9.6], [-2.4, -30], [-34, -20]]]) {
        const bz = (t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
        for (let i = 0; i < 18; i++) { const a = bz(i / 18), b = bz((i + 1) / 18); B.next(i % 3 === 2 ? 'flat' : 'vol'); seg(a[0], a[1], b[0], b[1], 1.7 - i * 0.06, i % 3 === 2 ? shade(h2, 0.45) : i % 3 === 1 ? shade(h2, 1.2) : h2); }
      }
      break;
    }
    case 'scholar': B.next(); poly([[-6.2, -4], [5.6, -5.4], [4.2, -13.4], [-5.2, -12.4]], hc); flat(B); seg(-6, -4.6, 5.4, -6, 1.2, shade(hc, 1.4)); B.next('vol', 'fold'); path([[-6, -4.2], [-9.4, 0], [-11.6, 5]], 2.2, 1.2, hc); break;
    case 'hood': B.next('vol', 'fold'); poly([[5.6, -6.6], [1, -9.6], [-5, -8.8], [-9, -3], [-9.6, 3], [-7.2, 8.8], [-2, 9.4], [-1.4, 4], [0.6, -1], [3.8, -3.8]], hc); break;
    default: break;
  }
}

// a weapon held at hand h, pointing at angle a (0 down, 90 forward, 180 up); s is pixels per old unit
function drawWeapon(B, kind, h, a, s, back, colour) {
  const d = dirOf(a), p = [Math.cos(a * R), -Math.sin(a * R)], steel = back ? '#9aa2b0' : '#d8e0ea', wood = back ? '#5a3a20' : '#7a5028', gold = '#e0b040';
  const at = (l, w = 0) => [h[0] + d[0] * l * s + p[0] * w * s, h[1] + d[1] * l * s + p[1] * w * s];
  const line = (l0, l1, w, c, k = 'vol') => { B.next(k); const A = at(l0), Bp = at(l1); B.seg(A[0], A[1], Bp[0], Bp[1], w * s, c); };
  const poly = (pts, c, k = 'metal') => { B.next(k); B.poly(pts, c); };
  const edge = (l0, l1, w0, w1) => { flat(B); const A = at(l0, w0), Bp = at(l1, w1); B.seg(A[0], A[1], Bp[0], Bp[1], 1, '#ffffff'); };
  const tassel = (l) => { B.next('vol', 'fold'); const c = at(l); for (const k of [-1, 0, 1]) B.limb(c, [c[0] - d[0] * 3 * s + k * 1.4 * s, c[1] - d[1] * 3 * s + 3.2 * s], 1.8 * s, 1 * s, '#c02828'); B.next(); B.disc(...c, 1.3 * s, '#e0b040'); };
  switch (kind) {
    case 'sword': line(-3, 0, 1.4, '#4a2a1a'); line(-3.6, -3.2, 1.8, gold, 'metal'); line(0.8, 1.2, 4.2, gold, 'metal'); poly([at(1.4, -0.9), at(14, -0.8), at(15.6, 0), at(14, 0.8), at(1.4, 0.9)], steel); edge(2.5, 13.5, 0.2, 0.2); break;
    case 'saber': line(-3, 0, 1.4, '#3a2a1a'); line(0.8, 1.2, 3.8, gold, 'metal'); poly([at(1.5, -0.9), at(12, -0.9), at(15.4, 0), at(17, 1.6), at(10, 1.6), at(1.5, 1.2)], steel); edge(2.5, 15, -0.5, 0.4); break;
    case 'knife': line(-2, 0, 1.3, '#4a2a1a'); poly([at(0.8, -0.9), at(7.4, -0.7), at(8.8, 0.6), at(0.8, 1)], steel); break;
    case 'club': B.next(); { const A = at(-3), Bp = at(13); B.limb(A, Bp, 2.4 * s, 3.8 * s, wood); } flat(B); for (const l of [6, 9.5]) { const A = at(l, -1.6), Bp = at(l + 0.6, 1.6); B.seg(A[0], A[1], Bp[0], Bp[1], 1, shade(wood, 0.6)); } break;
    case 'staff': line(-12, 15, 1.6, colour || wood); B.next('metal'); B.disc(...at(16), 2.6 * s, gold); B.next('metal'); B.disc(...at(16), 1.2 * s, '#e04040'); flat(B); for (const k of [-1, 1]) { const A = at(15.4, k * 2.4), Bp = at(18, k * 3.8); B.seg(A[0], A[1], Bp[0], Bp[1], 1.6, gold); } break;
    case 'spear': line(-12, 17, 1.5, colour || wood); poly([at(16, -1.3), at(18.5, -1.1), at(22.5, 0), at(18.5, 1.1), at(16, 1.3)], steel); edge(17, 21.5, 0, 0); tassel(15.6); break;
    case 'snake': line(-12, 15, 1.6, colour || '#2a2a2a'); B.next('metal'); { let q = at(15); for (let i = 0; i < 4; i++) { const n = at(16 + i * 2, i % 2 ? -1.2 : 1.2); B.seg(q[0], q[1], n[0], n[1], 1.6 * s, steel); q = n; } const t = at(25); B.limb(q, t, 1.6 * s, 0.6 * s, steel); } tassel(14.6); break;
    case 'glaive': line(-13, 14, 1.8, colour || '#2a5a3a'); poly([at(11, -1), at(13, 4.5), at(18, 6.6), at(25, 3.6), at(22, 0.8), at(14, -1.4)], steel); edge(13, 22.6, 4.4, 3.4); B.next('metal'); B.disc(...at(12.4, 0.2), 2 * s, '#3a9a5a'); B.next('metal'); { const A = at(11.2, -1.2), Bp = at(14.6, 1.6); B.seg(A[0], A[1], Bp[0], Bp[1], 1.4 * s, gold); } line(-14, -12, 2.2, gold, 'metal'); break;
    case 'halberd': line(-12, 17, 1.6, colour || '#7a2020'); poly([at(16, -1.3), at(18.6, -1.1), at(23.4, 0), at(18.6, 1.1), at(16, 1.3)], steel); poly([at(13, 1), at(17.5, 1), at(17.6, 4), at(16.6, 6.2), at(15, 5.4), at(14, 3)], steel); poly([at(13, -1), at(17.5, -1), at(17.6, -4), at(16.6, -6.2), at(15, -5.4), at(14, -3)], steel); edge(18, 22.4, 0, 0); tassel(12.4); break;
    case 'axe': line(-3, 14, 2, wood); poly([at(8.6, 0.6), at(7.2, 5.6), at(9, 8.4), at(12.4, 8.8), at(15.4, 6.2), at(14.2, 0.6)], steel); edge(7.6, 15, 6.2, 6.6); break;
    case 'jis': line(-2, 9, 1.5, '#4a3a2a'); poly([at(8.5, -1), at(8.5, 1), at(13.4, 0)], steel); poly([at(6.4, 1), at(9.6, 1), at(9.4, 4.6), at(8, 5.4), at(7, 4.2)], steel); break;
    case 'fan': line(-2, 3, 1.3, '#6a4a2a'); poly([at(3, -1), at(8, -5.4), at(12.4, -3.2), at(13.4, 1.6), at(10.2, 5.4), at(3, 1)], '#f4f0e8', 'vol'); flat(B); for (const k of [-2.6, 0, 2.6]) { const A = at(4, 0), Bp = at(12, k); B.seg(A[0], A[1], Bp[0], Bp[1], 0.8, '#b8b0a0'); } break;
    case 'bow': { B.next(); let q = at(-9, 3); for (let i = 1; i <= 10; i++) { const t = -9 + i * 1.8, n = at(t, 3 + Math.sin(i / 10 * Math.PI) * -6); B.seg(q[0], q[1], n[0], n[1], 1.6 * s, '#6a3a1a'); q = n; } flat(B); B.seg(...at(-9, 3), ...at(9, 3), 1, '#e8e0d0'); break; }
    case 'mace': line(-3, 11, 1.9, wood); B.next('metal'); B.disc(...at(13), 3.6 * s, '#6a6a72'); B.next('metal'); for (const k of [-1, 1]) B.disc(...at(13, k * 3.4), 1.1 * s, '#a0a0a8'); B.disc(...at(16.8), 1.1 * s, '#a0a0a8'); break;
    default: break;
  }
}

// ---------------------------------------------------------------- animations: name -> frames (pose, seconds)
const F = (o, t = 0.1) => ({ o, t });
export const ANIMS = {
  idle: [F({ fa: [35, 95], ba: [25, 100], w: 135, w2: 130, fl: [14, 10], bl: [-12, 8], lean: 5 }, 0.45), F({ fa: [33, 98], ba: [23, 102], w: 138, w2: 132, fl: [14, 12], bl: [-12, 10], lean: 6, by: 0.5 }, 0.45)],
  stand: [F({ fa: [6, 10], ba: [-6, 10], w: 20, w2: 20, fl: [4, 0], bl: [-4, 0], lean: 0 }, 0.6), F({ fa: [7, 12], ba: [-5, 12], w: 22, w2: 22, fl: [4, 0], bl: [-4, 0], lean: 0, by: 0.4 }, 0.6)],
  walk: [0, 1, 2, 3].map((i) => { const a = [26, 0, -24, 0][i], k = [6, 26, 4, 26][i]; return F({ fl: [a, k], bl: [-a, [4, 26, 6, 26][i]], fa: [30 - a * 0.5, 90], ba: [20 + a * 0.5, 95], w: 130, w2: 125, by: i % 2 ? -0.8 : 0, lean: 6 }, 0.13); }),
  run: [0, 1, 2, 3].map((i) => { const a = [44, 5, -40, 5][i]; return F({ fl: [a, [20, 70, 10, 70][i]], bl: [-a + 5, [10, 70, 20, 70][i]], fa: [40 - a * 0.9, 95], ba: [10 + a * 0.9, 100], w: 110, w2: 110, by: i % 2 ? -1.5 : 0, lean: 18 }, 0.09); }),
  jab: [F({ fa: [70, 25], ba: [20, 100], fl: [20, 8], bl: [-16, 6], lean: 10, w: 105 }, 0.05), F({ fa: [88, 0], ba: [10, 105], fl: [22, 6], bl: [-18, 6], lean: 14, bx: 1, w: 95 }, 0.09), F({ fa: [50, 70], ba: [20, 100], lean: 8, w: 120 }, 0.08)],
  straight: [F({ fa: [30, 80], ba: [80, 10], fl: [22, 6], bl: [-20, 6], lean: 6, w: 140 }, 0.06), F({ fa: [92, -4], ba: [-25, 60], fl: [30, 4], bl: [-28, 4], lean: 20, bx: 2.5, w: 92 }, 0.12), F({ fa: [60, 50], ba: [0, 80], lean: 10, w: 115 }, 0.1)],
  upper: [F({ fa: [20, 60], ba: [30, 90], fl: [30, 40], bl: [-20, 40], lean: 18, by: 2.5, w: 70 }, 0.07), F({ fa: [150, -15], ba: [-20, 50], fl: [15, 4], bl: [-20, 10], lean: -6, by: -2, bx: 1, w: 170, mouth: 1 }, 0.14), F({ fa: [120, 20], ba: [0, 60], lean: 0, w: 150 }, 0.1)],
  kick: [F({ fl: [60, 90], bl: [-8, 4], fa: [40, 90], ba: [-30, 60], lean: -6, w: 130 }, 0.06), F({ fl: [98, 0], bl: [-12, 2], fa: [30, 100], ba: [-50, 40], lean: -18, bx: -1, w: 140 }, 0.13), F({ fl: [50, 80], bl: [-10, 4], lean: -4, w: 130 }, 0.08)],
  round: [F({ fl: [70, 100], bl: [-6, 4], fa: [60, 70], ba: [-40, 50], lean: -10, w: 120 }, 0.07), F({ fl: [108, 4], bl: [-18, 2], fa: [-20, 40], ba: [-60, 30], lean: -28, bx: -2, w: 90 }, 0.14), F({ fl: [60, 70], bl: [-10, 4], lean: -6, w: 120 }, 0.1)],
  jump: [F({ fl: [40, 80], bl: [-10, 70], fa: [60, 70], ba: [40, 80], lean: 8, w: 150, w2: 140 }, 0.2)],
  fall: [F({ fl: [20, 40], bl: [-20, 30], fa: [90, 30], ba: [70, 40], lean: 4, w: 120, w2: 120 }, 0.2)],
  jkick: [F({ fl: [102, 0], bl: [-20, 95], fa: [50, 80], ba: [-40, 60], lean: -16, w: 140 }, 0.3)],
  guard: [F({ fa: [62, 120], ba: [52, 125], fl: [22, 18], bl: [-20, 14], lean: -4, by: 1, w: 165, w2: 160 }, 0.3)],
  hurt: [F({ fa: [-30, 30], ba: [-60, 30], fl: [10, 20], bl: [-25, 15], lean: -22, tilt: -18, eye: 'hurt', mouth: 1, w: 40, w2: 40 }, 0.2)],
  hurt2: [F({ fa: [60, 40], ba: [30, 30], fl: [20, 30], bl: [-10, 20], lean: 30, tilt: 20, eye: 'hurt', mouth: 1, by: 2, w: 60, w2: 60 }, 0.2)],
  air: [F({ fa: [-110, 20], ba: [-140, 20], fl: [40, 30], bl: [70, 40], lean: -60, by: -2, tilt: -10, eye: 'hurt', mouth: 1, w: -40, w2: -60 }, 0.2)],
  down: [F({ fa: [-110, 0], ba: [-80, 10], fl: [88, 4], bl: [80, 10], lean: -90, by: 13, bx: 4, tilt: -90, eye: 'closed', w: -80, w2: -80 }, 0.3)],
  dizzy: [F({ fa: [5, 10], ba: [-5, 10], fl: [8, 10], bl: [-8, 8], lean: -8, tilt: -14, eye: 'closed', w: 15, w2: 15 }, 0.3), F({ fa: [8, 10], ba: [-8, 10], fl: [8, 10], bl: [-8, 8], lean: 2, tilt: 12, eye: 'closed', w: 18, w2: 18 }, 0.3)],
  getup: [F({ fa: [-10, 40], ba: [-40, 20], fl: [70, 120], bl: [10, 130], lean: 30, by: 7, w: 60, w2: 60 }, 0.14), F({ fa: [20, 60], ba: [0, 60], fl: [40, 80], bl: [-10, 70], lean: 20, by: 3, w: 100, w2: 100 }, 0.12)],
  grab: [F({ fa: [82, 15], ba: [75, 20], fl: [24, 10], bl: [-22, 8], lean: 12, w: 160, w2: 150 }, 0.2)],
  knee: [F({ fa: [70, 40], ba: [70, 40], fl: [95, 120], bl: [-6, 4], lean: 14, w: 160, w2: 150 }, 0.1)],
  throw: [F({ fa: [140, 10], ba: [130, 10], fl: [20, 10], bl: [-30, 10], lean: -10, w: 170 }, 0.1), F({ fa: [60, 0], ba: [50, 0], fl: [35, 6], bl: [-28, 6], lean: 22, bx: 2, w: 80 }, 0.2)],
  carry: [F({ fa: [168, 12], ba: [162, 12], fl: [12, 6], bl: [-10, 6], lean: -2, w: 175, w2: 175 }, 0.3)],
  slash: [F({ fa: [175, 20], ba: [120, 50], fl: [18, 12], bl: [-22, 10], lean: -6, w: 205, w2: 190 }, 0.08), F({ fa: [70, -10], ba: [-20, 60], fl: [34, 8], bl: [-30, 6], lean: 18, bx: 2, w: 55, w2: 30 }, 0.1), F({ fa: [50, 10], ba: [0, 70], lean: 12, w: 40, w2: 40 }, 0.12)],
  slash2: [F({ fa: [20, 40], ba: [40, 60], fl: [18, 12], bl: [-22, 10], lean: 6, w: 20, w2: 40 }, 0.07), F({ fa: [140, -20], ba: [-30, 40], fl: [30, 6], bl: [-30, 6], lean: 4, bx: 1.5, w: 150, w2: 170 }, 0.1), F({ fa: [120, 0], ba: [0, 60], lean: 2, w: 160, w2: 150 }, 0.1)],
  thrust: [F({ fa: [40, 60], ba: [60, 70], fl: [20, 20], bl: [-20, 14], lean: 0, bx: -2, w: 90, w2: 90 }, 0.08), F({ fa: [90, 0], ba: [85, 10], fl: [45, 2], bl: [-42, 2], lean: 22, bx: 4, by: 1.5, w: 90, w2: 90 }, 0.14), F({ fa: [70, 20], ba: [60, 40], lean: 12, w: 100, w2: 100 }, 0.1)],
  spin: [F({ fa: [90, 0], ba: [-90, 0], lean: 0, w: 90, w2: -90, fl: [20, 10], bl: [-20, 10] }, 0.06), F({ fa: [30, 0], ba: [-150, 0], lean: 0, w: 20, w2: -160, fl: [10, 10], bl: [-10, 10] }, 0.06), F({ fa: [-90, 0], ba: [90, 0], lean: 0, w: -90, w2: 90, fl: [-20, 10], bl: [20, 10] }, 0.06), F({ fa: [-150, 0], ba: [30, 0], lean: 0, w: -160, w2: 20, fl: [-10, 10], bl: [10, 10] }, 0.06)],
  cast: [F({ fa: [150, 10], ba: [140, 10], fl: [12, 6], bl: [-12, 6], lean: -8, tilt: -10, w: 175, mouth: 1 }, 0.3)],
  shout: [F({ fa: [100, -40], ba: [-80, 20], fl: [30, 10], bl: [-30, 10], lean: -10, tilt: -12, mouth: 1, w: 120 }, 0.3)],
  shoot: [F({ fa: [90, 0], ba: [88, 150], fl: [22, 6], bl: [-22, 6], lean: -2, w: 180 }, 0.2)],
  victory: [F({ fa: [172, 0], ba: [-20, 40], fl: [10, 4], bl: [-10, 4], lean: -4, tilt: -6, w: 178, mouth: 1 }, 0.5)],
  sit: [F({ fa: [40, 60], ba: [30, 70], fl: [88, 92], bl: [80, 95], lean: 0, by: 7.5, w: 40 }, 1)],
  bow: [F({ fa: [70, 90], ba: [70, 95], fl: [6, 0], bl: [-6, 0], lean: 30, tilt: 10, w: 30 }, 1)],
};
export const ANIM_NAMES = Object.keys(ANIMS);

// every frame of every animation of a look, packed into one canvas (rows of 12)
export const COLS = 12;
const sheetCache = new Map();
export function sheetFor(L) {
  const key = L.key || JSON.stringify(L);
  if (sheetCache.has(key)) return sheetCache.get(key);
  const list = []; for (const n of ANIM_NAMES) ANIMS[n].forEach((f, i) => list.push([n, i, f]));
  const rows = Math.ceil(list.length / COLS), cv = document.createElement('canvas'); cv.width = COLS * FW; cv.height = rows * FH;
  const ctx = cv.getContext('2d'), idx = {};
  list.forEach(([n, i, f], k) => { const px = drawFrame(L, f.o), im = new ImageData(px, FW, FH); ctx.putImageData(im, (k % COLS) * FW, Math.floor(k / COLS) * FH); (idx[n] ||= [])[i] = k; });
  const S = { canvas: cv, idx, cols: COLS, rows, n: list.length };
  sheetCache.set(key, S); return S;
}
// a single still (for menus): a square around the figure, at its own pixels
export function stillCanvas(L, anim = 'stand', i = 0) {
  const px = drawFrame(L, ANIMS[anim][i].o), c = document.createElement('canvas'); c.width = FW; c.height = FH; c.getContext('2d').putImageData(new ImageData(px, FW, FH), 0, 0);
  const n = 124, o = document.createElement('canvas'); o.width = o.height = n; o.getContext('2d').drawImage(c, OX - n / 2, OY + 6 - n, n, n, 0, 0, n, n); return o;
}
// a head-and-shoulders crop for dialogue
export function portrait(L) {
  const px = drawFrame(L, ANIMS.stand[0].o), hc = lastHead, c = document.createElement('canvas'); c.width = FW; c.height = FH; c.getContext('2d').putImageData(new ImageData(px, FW, FH), 0, 0);
  const k = L.size || 1, w = Math.round(46 * k), h = Math.round(43 * k), o = document.createElement('canvas'); o.width = w; o.height = h;
  o.getContext('2d').drawImage(c, Math.round(hc[0] - w / 2 + 2 * k), Math.round(hc[1] - 19 * k), w, h, 0, 0, w, h); return o;
}
