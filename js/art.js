// Pixel characters drawn in code. Each frame is a little skeleton put in a pose (angles in degrees: 0 points
// straight down, positive turns toward the way the figure faces); the limbs, robe, head and weapon are filled in,
// then every part is shaded (lit from the upper left) and the whole figure gets a dark coloured outline.
// A look (L) says what the person wears; a sheet holds every frame of every animation for one look.
export const FW = 72, FH = 72;            // frame size in pixels; the feet stand at (36, 66)
const OX = 36, OY = 66;
const R = Math.PI / 180;

const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (c, f) => { const [r, g, b] = hexRGB(c); return f >= 1 ? toHex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)) : toHex(r * f, g * f, b * f); };
export const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const pack = (c) => { const [r, g, b] = hexRGB(c); return (r << 16) | (g << 8) | b; };

// ---------------------------------------------------------------- a frame buffer: colour + which part each pixel belongs to
class Buf {
  constructor() { this.c = new Int32Array(FW * FH).fill(-1); this.p = new Int16Array(FW * FH); this.part = 1; }
  set(x, y, col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= FW || y >= FH) return; const i = y * FW + x; this.c[i] = col; this.p[i] = this.part; }
  disc(cx, cy, r, col) { const c = pack(col), r2 = r * r; for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r2 + 0.25) this.set(x, y, c); } }
  seg(x0, y0, x1, y1, w, col) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let i = 0; i <= n; i++) { const t = i / n; this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, col); } }
  // a tapering limb: width w0 at the start, w1 at the end
  limb(a, b, w0, w1, col) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); for (let i = 0; i <= n; i++) { const t = i / n; this.disc(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (w0 + (w1 - w0) * t) / 2, col); } }
  poly(pts, col) {
    const c = pack(col); let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  next() { this.part++; }
  // shade every part (light from the upper left), outline the figure, and hand back the pixels
  finish(outline) {
    const W = FW, H = FH, c = this.c, p = this.p, out = new Uint8ClampedArray(W * H * 4), col = new Int32Array(c);
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
    const mul = (v, f) => { let r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255; if (f >= 1) { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); } else { r *= f; g *= f; b *= f; } return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (c[i] < 0) continue; const k = p[i];
      const up = at(x, y - 1), dn = at(x, y + 1), rt = at(x + 1, y), lf = at(x - 1, y), dn2 = at(x, y + 2);
      const other = (j) => j < 0 || c[j] < 0 || p[j] !== k, behind = (j) => j >= 0 && c[j] >= 0 && p[j] < k;
      let f = 1;
      if (other(up) || other(lf)) f = 1.16;
      if (other(dn) || other(rt)) f = 0.8; else if (other(dn2)) f = 0.9;
      if (behind(up) || behind(lf) || behind(rt) || behind(dn)) f *= 0.82;     // a seam against what lies behind
      col[i] = mul(c[i], f);
    }
    const oc = pack(outline || '#1a1018');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      if (c[i] >= 0) { const v = col[i]; out[o] = (v >> 16) & 255; out[o + 1] = (v >> 8) & 255; out[o + 2] = v & 255; out[o + 3] = 255; continue; }
      let n = -1; for (const j of [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]) if (j >= 0 && c[j] >= 0) { n = j; break; }
      if (n >= 0) { const v = mul(c[n], 0.28), m = (a, b) => Math.round(a * 0.5 + b * 0.5); out[o] = m((v >> 16) & 255, (oc >> 16) & 255); out[o + 1] = m((v >> 8) & 255, (oc >> 8) & 255); out[o + 2] = m(v & 255, oc & 255); out[o + 3] = 255; }
    }
    return out;
  }
}

// ---------------------------------------------------------------- the skeleton
const dirOf = (a) => [Math.sin(a * R), Math.cos(a * R)];             // 0 = down, 90 = forward, 180 = up
const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];

// defaults every pose starts from
const BASE = { bx: 0, by: 0, lean: 4, hd: [0, 0], fa: [20, 60], ba: [-15, 50], fl: [10, 8], bl: [-10, 6], w: 120, w2: null, eye: 'open', mouth: 0, tilt: 0, fx: 0 };

export function drawFrame(L, pose) {
  const P = { ...BASE, ...pose }, s = L.size || 1, B = new Buf();
  const fat = L.fat ? 1 : 0, skin = L.skin || '#f0c49a', robe = L.robe || '#4a6a9a', robe2 = L.robe2 || shade(robe, 0.7);
  const sleeve = L.armor && !L.bare ? L.armor : robe, pants = L.pants || shade(robe, 0.6), boots = L.boots || '#3a2a22';
  // pelvis, the legs below it
  const pel = [OX + P.bx * s, OY - 16.5 * s + P.by * s];
  const thigh = 8.2 * s, shin = 8 * s;
  const leg = (side, [a, k]) => { const hip = [pel[0] + side * s, pel[1] + 0.5]; const d1 = dirOf(a), knee = add(hip, d1, thigh); const b = a - k, d2 = dirOf(b), ank = add(knee, d2, shin); const fwd = [Math.cos(b * R), -Math.sin(b * R)]; return { hip, knee, ank, toe: add(ank, fwd, 3.6 * s), b }; };
  const FL = leg(1, P.fl), BL = leg(-1, P.bl);
  const lean = P.lean, up = [Math.sin(lean * R), -Math.cos(lean * R)], fw = [Math.cos(lean * R), Math.sin(lean * R)];
  const neck = add(pel, up, 13.5 * s);
  const headC = add(add(neck, [Math.sin((lean * 0.6 + P.tilt) * R), -Math.cos((lean * 0.6 + P.tilt) * R)], 6.4 * s), [P.hd[0] * s, P.hd[1] * s], 1);
  const hr = 6.3 * s * (L.head || 1);
  const shF = add(add(neck, fw, 1.2 * s), up, -2 * s), shB = add(add(neck, fw, -1.8 * s), up, -2 * s);
  const arm = (sh, [a, e]) => { const elb = add(sh, dirOf(a), 6.6 * s), wr = add(elb, dirOf(a + e), 6 * s); return { sh, elb, wr, hand: add(wr, dirOf(a + e), 1.2 * s), ang: a + e }; };
  const FA = arm(shF, P.fa), BA = arm(shB, P.ba);

  const drawLeg = (G, dark) => {
    const pc = dark ? shade(pants, 0.82) : pants, bc = dark ? shade(boots, 0.82) : boots;
    B.limb(G.hip, G.knee, 5.4 * s + fat, 4.6 * s, pc); B.next();
    B.limb(G.knee, G.ank, 4.4 * s, 3.8 * s, L.bareLeg ? (dark ? shade(skin, 0.85) : skin) : pc);
    B.limb(add(G.knee, dirOf(G.b), shin * 0.45), G.ank, 4.4 * s, 4 * s, bc); B.limb(G.ank, G.toe, 3.4 * s, 2.6 * s, bc); B.next();
  };
  const drawArm = (A, dark, wpnAfter) => {
    const sc = dark ? shade(sleeve, 0.8) : sleeve, sk = dark ? shade(skin, 0.85) : skin;
    B.limb(A.sh, A.elb, (4.6 + fat * 0.8) * s, 4 * s, L.bare ? sk : sc); B.next();
    const fore = L.bare ? sk : L.bracer ? (dark ? shade(L.bracer, 0.8) : L.bracer) : L.sleeveLong ? sc : sk;
    B.limb(A.elb, A.wr, 4 * s, 3.4 * s, fore); if (L.sleeveLong && !L.bare) B.limb(A.elb, add(A.elb, dirOf(A.ang), 3.8 * s), 4.6 * s, 4.8 * s, sc);
    B.next(); if (wpnAfter) wpnAfter(); B.disc(A.hand[0], A.hand[1], 1.9 * s, sk); B.next();
  };
  // ---- behind: the back arm (and a second weapon), the back leg, a cape
  if (P.w2 != null && L.wpn2) { drawWeapon(B, L.wpn2, BA.hand, P.w2, s, true); B.next(); }
  drawArm(BA, true);
  drawLeg(BL, true);
  if (L.cape) { const c0 = add(neck, fw, -1.5 * s), sway = P.cape ?? 0; B.poly([c0, add(c0, fw, -3 * s), [pel[0] - (8 + sway) * s, pel[1] + 9 * s], [pel[0] - (2 + sway * 0.5) * s, pel[1] + 10 * s]], shade(L.cape, 0.85)); B.next(); }
  // ---- the body
  const ww = (5 + fat * 2.4) * s, cw = (5.4 + fat * 1.6) * s;
  const belly = add(add(pel, up, 6 * s), fw, (fat ? 8.5 : 5.2) * s);
  B.poly([add(pel, fw, -ww), add(neck, fw, -cw + 0.6), add(neck, fw, cw * 0.75), belly, add(pel, fw, ww)], L.bare ? skin : L.armor || robe);
  if (L.armor && !L.bare) { // plates over a robe: the collar and lapel show
    B.next(); B.poly([add(neck, fw, -1.5 * s), add(neck, fw, 2.5 * s), add(add(neck, up, -5 * s), fw, 1 * s)], L.robe2 ? robe2 : robe);
    B.next(); for (let i = 1; i <= 3; i++) { const a = add(add(pel, up, i * 3.2 * s), fw, -ww + 1), b = add(add(pel, up, i * 3.2 * s), fw, ww * 0.9 + (i === 2 ? 1 : 0)); B.seg(a[0], a[1], b[0], b[1], 0.8, shade(L.armor, 0.72)); }
  } else if (!L.bare) { B.next(); const a = add(neck, fw, 1.5 * s), b = add(add(pel, up, 5 * s), fw, 3.2 * s); B.seg(a[0], a[1], b[0], b[1], 1.6 * s, robe2); }
  if (L.bare) { B.next(); const n = add(add(neck, up, -4 * s), fw, 3.2 * s); B.disc(n[0], n[1], 0.7, shade(skin, 0.75)); }
  B.next(); const bl0 = add(add(pel, up, 1.6 * s), fw, -ww - 0.3), bl1 = add(add(pel, up, 1.6 * s), fw, ww + fat * 1.5 + 0.3); B.seg(bl0[0], bl0[1], bl1[0], bl1[1], 2 * s, L.belt || '#6a4a2a');
  if (L.beltGold) { B.next(); const m = add(add(pel, up, 1.6 * s), fw, ww * 0.6 + fat); B.disc(m[0], m[1], 1.3 * s, '#e0b040'); }
  B.next();
  // the skirt of the robe (or armour tassets), following the legs
  if (L.skirt !== 0) {
    const len = L.skirt || 0.55, kF = [FL.hip[0] + (FL.ank[0] - FL.hip[0]) * len, FL.hip[1] + (FL.ank[1] - FL.hip[1]) * len], kB = [BL.hip[0] + (BL.ank[0] - BL.hip[0]) * len, BL.hip[1] + (BL.ank[1] - BL.hip[1]) * len];
    const sk = L.skirtC || (L.armor ? shade(L.armor, 0.9) : robe), wx = add(pel, up, 2 * s);
    B.poly([add(wx, fw, -ww - 0.5), add(wx, fw, ww + fat + 0.5), [Math.max(kF[0], kB[0]) + 2.4 * s, Math.max(kF[1], kB[1]) + 1], [Math.min(kF[0], kB[0]) - 2.4 * s, Math.max(kF[1], kB[1]) + 1]], sk);
    if (L.armor && L.skirtC == null) { B.next(); const y = Math.max(kF[1], kB[1]); B.seg(Math.min(kF[0], kB[0]) - 2, y, Math.max(kF[0], kB[0]) + 2, y, 1, shade(L.armor, 0.7)); }
    B.next();
  }
  drawLeg(FL, false);
  // ---- the head
  drawHead(B, L, headC, hr, s, P, lean);
  // ---- the weapon in the front hand, gripped by it; the front arm over the body
  drawArm(FA, false, () => { if (L.wpn && P.w != null) { drawWeapon(B, L.wpn, FA.hand, P.w, s, false, L.wpnC); B.next(); } });
  if (L.shield) { const c = add(FA.wr, [0, 0], 0); B.disc(c[0] + 1, c[1], 4.2 * s, L.shield); B.next(); B.disc(c[0] + 1, c[1], 1.4 * s, '#d8c070'); B.next(); }
  return B.finish(L.outline);
}

function drawHead(B, L, c, r, s, P, lean) {
  const skin = L.skin || '#f0c49a', hair = L.hair || '#1e1814', [cx, cy] = c;
  // ear and neck under the head
  B.disc(cx - 0.6 * s, cy + r * 0.75, 2.2 * s, shade(skin, 0.85)); B.next();
  B.disc(cx, cy, r, skin); B.disc(cx + r * 0.95, cy + 0.6 * s, 1.1 * s, skin);     // the nose
  B.disc(cx + r * 0.25, cy + r * 0.55, r * 0.72, skin);                         // a strong jaw
  B.next();
  // hair over the back and top of the head
  const hairC = hair, rr = r + 0.7;
  for (let y = Math.floor(cy - rr - 1); y <= Math.ceil(cy + rr); y++) for (let x = Math.floor(cx - rr - 1); x <= Math.ceil(cx + rr); x++) {
    const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > rr * rr) continue;
    if (dx < -r * 0.38 + dy * 0.22 && dy < r * 0.45 || dy < -r * 0.5 + Math.max(0, dx) * 0.12 || (dx < -r * 0.05 && dy < -r * 0.25)) B.set(x, y, pack(hairC));
  }
  if (L.longHair) B.limb([cx - r * 0.6, cy], [cx - r * 1.1 - 1, cy + r + 4 * s], 4 * s, 2.5 * s, hairC);
  B.next();
  // the face, looking forward
  const ex = cx + r * 0.42, ey = cy - r * 0.02;
  if (P.eye === 'closed' || P.eye === 'hurt') { B.seg(ex - 1, ey, ex + 1, ey + (P.eye === 'hurt' ? -0.6 : 0), 0.8, '#2a1a18'); }
  else { B.set(ex, ey, pack('#1a1210')); B.set(ex, ey + 1, pack('#1a1210')); B.set(ex - 1, ey, pack('#f4f0e8')); B.set(ex - 1, ey + 1, pack(shade(skin, 0.8))); }
  B.next();
  const brow = L.brow || (L.fierce ? 1.2 : 0.8); B.seg(ex - 1.6, ey - 2 - (L.fierce ? 0 : 0.3), ex + 1.6, ey - 2 + (L.fierce ? 0.6 : -0.2), brow, shade(hair, 0.9)); B.next();
  if (P.mouth) { B.disc(cx + r * 0.66, cy + r * 0.52, 1.3 * s, '#5a1a1a'); B.next(); } else { B.set(cx + r * 0.7, cy + r * 0.52, pack(shade(skin, 0.62))); B.next(); }
  if (L.paint) { B.seg(cx + r * 0.1, cy + r * 0.2, cx + r * 0.7, cy + r * 0.2, 0.8, L.paint); B.next(); }
  // the beard
  const bc = L.beardC || hair;
  if (L.beard === 'long') { B.poly([[cx + r * 0.92, cy + r * 0.66], [cx + r * 0.05, cy + r * 0.8], [cx + r * 0.1, cy + r * 1.2 + 6 * s], [cx + r * 0.5, cy + r * 1.3 + 9 * s], [cx + r * 0.95, cy + r * 1.05 + 3 * s]], bc); B.seg(cx + r * 0.62, cy + r * 0.4, cx + r * 1.02, cy + r * 0.5, 0.9, bc); B.seg(cx + r * 0.62, cy + r * 0.4, cx + r * 0.45, cy + r * 0.75, 0.9, bc); }
  if (L.beard === 'bushy') { for (let i = 0; i < 6; i++) { const a = (0 + i * 28) * R; B.disc(cx + Math.cos(a) * r * 0.7 + r * 0.12, cy + Math.sin(a) * r * 0.45 + r * 0.78, 1.9 * s, bc); } B.seg(cx + r * 0.6, cy + r * 0.35, cx + r * 1.15, cy + r * 0.1, 1.1, bc); }
  if (L.beard === 'goatee') { B.poly([[cx + r * 0.7, cy + r * 0.7], [cx + r * 0.2, cy + r * 0.75], [cx + r * 0.5, cy + r * 1.35]], bc); B.seg(cx + r * 0.55, cy + r * 0.38, cx + r * 1.0, cy + r * 0.45, 0.9, bc); }
  if (L.beard === 'stubble') { for (const [dx, dy] of [[0.3, 0.8], [0.6, 0.75], [0.1, 0.65], [0.45, 0.95]]) B.set(cx + r * dx, cy + r * dy, pack(shade(skin, 0.7))); }
  if (L.beard === 'mustache') B.seg(cx + r * 0.5, cy + r * 0.38, cx + r * 1.0, cy + r * 0.45, 1, bc);
  B.next();
  // what is on the head
  const hc = L.hatC || '#3a3a5a', h2 = L.hatC2 || '#c03030';
  const top = [cx - r * 0.1, cy - r];
  switch (L.hat) {
    case 'bun': B.disc(top[0] - 0.5, top[1] - 1.4 * s, 2.4 * s, hair); B.next(); B.seg(top[0] - 2.5, top[1] + 0.2, top[0] + 1.5, top[1] + 0.2, 1, hc); break;
    case 'crown': B.disc(top[0] - 0.5, top[1] - 1.2 * s, 2.2 * s, hair); B.next(); B.poly([[top[0] - 2.6 * s, top[1] - 0.4], [top[0] + 2 * s, top[1] - 0.4], [top[0] + 1.6 * s, top[1] - 4.4 * s], [top[0] - 2.2 * s, top[1] - 4.4 * s]], hc); B.next(); B.seg(top[0] - 4.5 * s, top[1] - 2.6 * s, top[0] + 4 * s, top[1] - 2.6 * s, 0.9, '#e8d070'); break;
    case 'band': { B.seg(cx - r * 0.95, cy - r * 0.35, cx + r * 0.85, cy - r * 0.5, 2 * s, hc); const k = [cx - r * 0.95, cy - r * 0.3]; B.limb(k, [k[0] - 5 * s, k[1] + 4 * s - (P.cape || 0) * 0.3], 1.6 * s, 1, hc); B.limb(k, [k[0] - 4 * s, k[1] + 6.5 * s], 1.4 * s, 1, hc); break; }
    case 'turban': { for (let y = Math.floor(cy - r - 2); y <= cy - r * 0.15; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= (r + 1.2) ** 2) B.set(x, y, pack(hc)); } B.next(); B.seg(cx - r, cy - r * 0.25, cx + r * 0.9, cy - r * 0.35, 1.2, shade(hc, 0.8)); const k = [cx - r * 0.9, cy - r * 0.3]; B.limb(k, [k[0] - 5 * s, k[1] + 5 * s], 2 * s, 1.2, hc); break; }
    case 'helm': case 'plume': case 'feathers': {
      for (let y = Math.floor(cy - r - 2); y <= cy - r * 0.18; y++) for (let x = Math.floor(cx - r - 1.5); x <= cx + r + 1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= (r + 1.4) ** 2) B.set(x, y, pack(hc)); }
      B.limb([cx - r * 0.75, cy - r * 0.2], [cx - r * 0.9, cy + r * 0.55], 3 * s, 2.4 * s, shade(hc, 0.85)); B.next();
      B.seg(cx - r - 1, cy - r * 0.18, cx + r + 1.2, cy - r * 0.22, 1.3 * s, shade(hc, 0.75)); B.next();
      B.disc(cx + r * 0.1, cy - r * 0.75, 1.2 * s, '#e8c860'); B.next();
      if (L.hat === 'plume') { B.limb([cx - r * 0.1, cy - r - 1], [cx - r * 0.1 - 3 * s, cy - r - 4.5 * s], 2.4 * s, 1.6 * s, h2); B.limb([cx - r * 0.3 - 3 * s, cy - r - 4 * s], [cx - r - 5 * s, cy - r + 2 * s], 2.6 * s, 1.2 * s, h2); }
      if (L.hat === 'feathers') for (const k of [0, 1]) { let p = [cx - r * 0.2 + k * 2, cy - r - 1]; for (let i = 0; i < 9; i++) { const a = (160 - i * 13 - k * 8) * R, q = [p[0] - Math.cos(a - Math.PI / 2) * 2.2 * s, p[1] - Math.sin(a + Math.PI / 2) * 2.2 * s]; const d = [Math.sin((175 + i * 14 + k * 6) * R), Math.cos((175 + i * 14 + k * 6) * R)], n = add(p, d, 2.4 * s); B.seg(p[0], p[1], n[0], n[1], (1.6 - i * 0.1) * s, i % 3 === 2 ? shade(h2, 1.25) : h2); p = n; void q; } }
      break;
    }
    case 'scholar': B.poly([[cx - r * 0.9, cy - r * 0.55], [cx + r * 0.8, cy - r * 0.7], [cx + r * 0.6, cy - r - 3.5 * s], [cx - r * 0.8, cy - r - 3 * s]], hc); B.next(); B.limb([cx - r * 0.85, cy - r * 0.6], [cx - r - 5 * s, cy + 2 * s], 2 * s, 1.4, hc); break;
    case 'hood': for (let y = Math.floor(cy - r - 2); y <= cy + r * 0.6; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r * 0.5; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= (r + 1.6) ** 2 && (dx < r * 0.15 || dy < -r * 0.55)) B.set(x, y, pack(hc)); } break;
    case 'bald': break;
    default: break;
  }
  B.next();
}

// a weapon held at hand h, pointing at angle a (0 down, 90 forward, 180 up)
function drawWeapon(B, kind, h, a, s, back, colour) {
  const d = dirOf(a), p = [Math.cos(a * R), -Math.sin(a * R)], steel = back ? '#a8b0bc' : '#dfe6ee', wood = back ? '#5a3a20' : '#7a5028', gold = '#e0b040';
  const at = (l, w = 0) => [h[0] + d[0] * l * s + p[0] * w * s, h[1] + d[1] * l * s + p[1] * w * s];
  const line = (l0, l1, w, c) => { const A = at(l0), Bp = at(l1); B.seg(A[0], A[1], Bp[0], Bp[1], w * s, c); };
  switch (kind) {
    case 'sword': line(-3, 0, 1.6, '#4a2a1a'); B.next(); line(1, 1, 4, gold); B.next(); line(1.5, 15, 1.9, steel); B.next(); line(3, 14, 0.6, '#ffffff'); break;
    case 'saber': line(-3, 0, 1.6, '#3a2a1a'); B.next(); line(1, 1, 3.6, gold); B.next(); B.poly([at(1.5, -0.8), at(14, -0.6), at(17, 1.2), at(1.5, 1.4)], steel); break;
    case 'knife': line(-2, 0, 1.4, '#4a2a1a'); B.next(); line(1, 8, 1.8, steel); break;
    case 'club': line(-3, 13, 2.6, wood); B.next(); line(9, 13, 3.6, shade(wood, 0.85)); break;
    case 'staff': line(-12, 15, 1.8, colour || wood); B.next(); B.disc(...at(16), 2.4 * s, gold); B.next(); B.disc(...at(16), 1.1 * s, '#e04040'); break;
    case 'spear': line(-12, 17, 1.7, colour || wood); B.next(); B.poly([at(16, -1.4), at(16, 1.4), at(22, 0)], steel); B.next(); B.disc(...at(15.5), 1.8 * s, '#c02828'); break;
    case 'snake': line(-12, 15, 1.7, colour || '#2a2a2a'); B.next(); { let q = at(15); for (let i = 0; i < 4; i++) { const n = at(16 + i * 2, i % 2 ? -1.2 : 1.2); B.seg(q[0], q[1], n[0], n[1], 1.6 * s, steel); q = n; } const t = at(24.5); B.seg(q[0], q[1], t[0], t[1], 1.2 * s, steel); } B.next(); B.disc(...at(14.5), 1.8 * s, '#c02828'); break;
    case 'glaive': line(-13, 14, 1.9, colour || '#2a5a3a'); B.next(); B.poly([at(11, -1), at(13, 4.5), at(18, 6.5), at(25, 3.5), at(22, 0.8), at(14, -1.4)], steel); B.next(); B.seg(...at(12, 0.5), ...at(21, 3.6), 0.6, '#ffffff'); B.next(); B.disc(...at(12.5, 0), 1.8 * s, '#3a9a5a'); B.next(); line(-14, -12, 2.2, gold); break;
    case 'halberd': line(-12, 17, 1.7, colour || '#7a2020'); B.next(); B.poly([at(16, -1.3), at(16, 1.3), at(23, 0)], steel); B.next(); B.poly([at(13, 1), at(17.5, 1), at(17, 5.2), at(15, 6), at(14, 3)], steel); B.poly([at(13, -1), at(17.5, -1), at(17, -5.2), at(15, -6), at(14, -3)], steel); B.next(); B.disc(...at(12.5), 1.6 * s, '#e0b040'); break;
    case 'axe': line(-3, 14, 2.2, wood); B.next(); B.poly([at(9, 0.5), at(8, 6), at(12, 8), at(15, 6), at(14, 0.5)], steel); break;
    case 'jis': line(-2, 9, 1.6, '#4a3a2a'); B.next(); B.poly([at(8.5, -1), at(8.5, 1), at(13, 0)], steel); B.poly([at(6.5, 1), at(9.5, 1), at(9, 4.4), at(7, 4.4)], steel); break;
    case 'fan': line(-2, 3, 1.4, '#6a4a2a'); B.next(); B.poly([at(3, -1), at(8, -5), at(12, -3), at(13, 1.5), at(10, 5), at(3, 1)], '#f4f0e8'); B.next(); B.seg(...at(4, 0), ...at(11, -2), 0.5, '#c8c0b0'); B.seg(...at(4, 0), ...at(11, 2), 0.5, '#c8c0b0'); break;
    case 'bow': { let q = at(-9, 3); for (let i = 1; i <= 8; i++) { const t = -9 + i * 2.25, n = at(t, 3 + Math.sin(i / 8 * Math.PI) * -6); B.seg(q[0], q[1], n[0], n[1], 1.6 * s, '#6a3a1a'); q = n; } B.next(); B.seg(...at(-9, 3), ...at(9, 3), 0.6, '#e8e0d0'); break; }
    case 'mace': line(-3, 11, 2, wood); B.next(); B.disc(...at(13), 3.4 * s, '#6a6a72'); B.next(); for (const k of [-1, 1]) B.disc(...at(13, k * 3.2), 1 * s, '#9a9aa2'); break;
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
// a single still (for portraits and menus)
export function stillCanvas(L, anim = 'stand', i = 0, scale = 2) {
  const px = drawFrame(L, ANIMS[anim][i].o), c = document.createElement('canvas'); c.width = FW; c.height = FH; c.getContext('2d').putImageData(new ImageData(px, FW, FH), 0, 0);
  if (scale === 1) return c; const o = document.createElement('canvas'); o.width = FW * scale; o.height = FH * scale; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o;
}
// a head-and-shoulders crop for dialogue
export function portrait(L, scale = 3) {
  const px = drawFrame(L, ANIMS.stand[0].o), c = document.createElement('canvas'); c.width = FW; c.height = FH; c.getContext('2d').putImageData(new ImageData(px, FW, FH), 0, 0);
  const o = document.createElement('canvas'), w = 30, h = 28; o.width = w * scale; o.height = h * scale; const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
  const top = Math.max(0, OY - Math.round(46 * (L.size || 1)) - 8);
  x.drawImage(c, OX - 15, top, w, h, 0, 0, w * scale, h * scale); return o;
}
