// Builds the diorama for one stretch of road: the ground, the street or path through it, houses with their signs,
// trees and rocks, camps and walls, the hills behind and the sky, and the light of the hour.
// The walkable band runs along x from 0 to len, and in depth from z = 0 (the back) to z = D (the front).
import { THREE, PX, pxTex, rng, groundTex, paveTex, wallTex, roofTex, thatchTex, waterTex, signTex, cutout, cutoutMesh } from './render.js?v=7';
export const D = 5.2;

const sh = (c, f) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))); return `rgb(${m(r)},${m(g)},${m(b)})`; };
const MOODS = {
  day:   { sky: ['#7ab4e8', '#cfe4f0'], fog: '#c8dce4', sun: '#fff2dc', sunI: 2.6, hemi: ['#bcd8f0', '#6a5a3a'], hemiI: 1.15, amb: 0.25, tint: [1.02, 1.0, 0.96], exposure: 1.08, lamps: false },
  dusk:  { sky: ['#5a5a9a', '#f0a070'], fog: '#d8a088', sun: '#ffb070', sunI: 2.2, hemi: ['#a890c0', '#5a3a2a'], hemiI: 0.95, amb: 0.2, tint: [1.07, 0.98, 0.9], exposure: 1.05, lamps: true },
  night: { sky: ['#0e1430', '#2a3060'], fog: '#1a2040', sun: '#8aa0e0', sunI: 0.9, hemi: ['#4a5a9a', '#1a1a2a'], hemiI: 0.7, amb: 0.15, tint: [0.9, 0.96, 1.12], exposure: 1.15, lamps: true },
  mist:  { sky: ['#9aa8b0', '#d8dcd8'], fog: '#c8d0d0', sun: '#f0f0e8', sunI: 1.6, hemi: ['#c8d0d8', '#5a6a5a'], hemiI: 1.2, amb: 0.3, tint: [0.98, 1.0, 1.02], exposure: 1.1, lamps: false },
  fire:  { sky: ['#3a1410', '#c0502a'], fog: '#6a3020', sun: '#ff8a40', sunI: 2, hemi: ['#c06040', '#2a1010'], hemiI: 0.8, amb: 0.2, tint: [1.12, 0.94, 0.84], exposure: 1.1, lamps: true },
};
const GROUNDS = {
  grass: () => groundTex('#6a9a48', { tufts: 10, flowers: 4, seed: 4 }), meadow: () => groundTex('#7aa850', { tufts: 14, flowers: 12, seed: 8 }),
  dirt: () => groundTex('#9a7a52', { stones: 6, n: 110, seed: 6 }), sand: () => groundTex('#d8c08a', { n: 80, seed: 12 }), snow: () => groundTex('#e8eef2', { n: 50, seed: 14 }),
  pave: () => paveTex('#9a9488', { seed: 3 }), dark: () => groundTex('#4a5a38', { tufts: 8, seed: 16 }), red: () => groundTex('#9a5a3a', { stones: 4, seed: 18 }), jungle: () => groundTex('#4a7a3a', { tufts: 16, seed: 20 }),
};

// ---------------------------------------------------------------- cut-out plants and rocks
function treeCanvas(kind, seed) {
  const r = rng(seed);
  if (kind === 'pine') return cutout(56, 96, (x) => {
    x.fillStyle = '#4a3020'; x.fillRect(26, 70, 5, 26); x.fillStyle = '#6a4a30'; x.fillRect(26, 70, 2, 26);
    for (let i = 0; i < 6; i++) { const y = 8 + i * 11, w = 10 + i * 4.5; x.fillStyle = '#1e3a26'; x.beginPath(); x.moveTo(28, y - 6); x.lineTo(28 - w, y + 12); x.lineTo(28 + w, y + 12); x.fill(); x.fillStyle = '#2e5a36'; x.beginPath(); x.moveTo(28, y - 4); x.lineTo(28 - w + 3, y + 10); x.lineTo(28 + 2, y + 10); x.fill(); x.fillStyle = '#4a7a46'; x.fillRect(22 - i, y + 4, 3, 1); }
  });
  if (kind === 'bamboo') return cutout(40, 110, (x) => {
    for (let k = 0; k < 4; k++) { const bx = 6 + k * 9 + Math.floor(r() * 3); x.fillStyle = '#5a8a3a'; x.fillRect(bx, 6 + k * 4, 3, 104); x.fillStyle = '#8aba5a'; x.fillRect(bx, 6 + k * 4, 1, 104); for (let y = 14; y < 110; y += 13) { x.fillStyle = '#3a5a2a'; x.fillRect(bx - 1, y, 5, 1); } for (let j = 0; j < 6; j++) { const ly = 8 + Math.floor(r() * 60); x.fillStyle = '#4a7a2e'; x.fillRect(bx + 3, ly, 7, 2); x.fillRect(bx - 6, ly + 5, 6, 2); } }
  });
  const peach = kind === 'peach', willow = kind === 'willow', dead = kind === 'dead';
  const leaf = peach ? ['#c86a8a', '#f0a0b8', '#ffd0dc'] : willow ? ['#4a7a3a', '#7aaa4a', '#a8d070'] : kind === 'autumn' ? ['#a8502a', '#d8803a', '#f0b050'] : kind === 'jungle' ? ['#1e5a2a', '#2e7a36', '#5aa040'] : ['#2e5a2a', '#4a7a36', '#7aa84a'];
  return cutout(72, 88, (x) => {
    x.fillStyle = '#4a3222'; x.fillRect(32, 46, 7, 42); x.fillStyle = '#6a4a32'; x.fillRect(32, 46, 2, 42); x.fillStyle = '#3a2418'; x.fillRect(37, 46, 2, 42);
    x.fillStyle = '#4a3222'; x.fillRect(24, 52, 9, 3); x.fillRect(38, 48, 10, 3);
    if (dead) { x.fillRect(20, 30, 3, 24); x.fillRect(46, 26, 3, 24); x.fillRect(34, 20, 3, 28); return; }
    const blob = (cx, cy, rad, c) => { x.fillStyle = c; for (let yy = -rad; yy <= rad; yy++) { const w = Math.round(Math.sqrt(rad * rad - yy * yy)); x.fillRect(cx - w, cy + yy, w * 2, 1); } };
    const puffs = [[36, 30, 18], [22, 38, 13], [50, 38, 13], [30, 20, 12], [44, 22, 12], [36, 44, 11]];
    for (const [cx, cy, rr] of puffs) blob(cx, cy + 2, rr, leaf[0]);
    for (const [cx, cy, rr] of puffs) blob(cx - 2, cy - 1, rr - 3, leaf[1]);
    for (const [cx, cy, rr] of puffs) blob(cx - 4, cy - 4, Math.max(2, rr - 9), leaf[2]);
    for (let i = 0; i < 40; i++) { x.fillStyle = leaf[Math.floor(r() * 3)]; x.fillRect(10 + Math.floor(r() * 52), 8 + Math.floor(r() * 44), 2, 2); }
    if (willow) for (let i = 0; i < 14; i++) { const sx = 14 + i * 3.4; x.fillStyle = leaf[i % 2 ? 1 : 0]; x.fillRect(sx, 36, 1, 22 + Math.floor(r() * 16)); }
    if (peach) for (let i = 0; i < 22; i++) { x.fillStyle = '#ffffff'; x.fillRect(12 + Math.floor(r() * 48), 10 + Math.floor(r() * 40), 1, 1); }
  });
}
function rockCanvas(seed, snow) { const r = rng(seed); return cutout(40, 26, (x) => { x.fillStyle = '#5a5650'; x.beginPath(); x.moveTo(2, 26); x.lineTo(6, 10); x.lineTo(16, 3); x.lineTo(28, 5); x.lineTo(37, 14); x.lineTo(39, 26); x.fill(); x.fillStyle = '#7a766e'; x.beginPath(); x.moveTo(7, 12); x.lineTo(16, 5); x.lineTo(26, 7); x.lineTo(20, 14); x.fill(); x.fillStyle = '#9a968c'; x.fillRect(14, 6, 6, 2); if (snow) { x.fillStyle = '#f0f4f8'; x.fillRect(10, 4, 18, 4); } for (let i = 0; i < 12; i++) { x.fillStyle = '#4a4640'; x.fillRect(6 + Math.floor(r() * 28), 12 + Math.floor(r() * 12), 2, 1); } }); }
function bushCanvas(seed, c = '#3a6a2e') { const r = rng(seed); return cutout(36, 20, (x) => { for (let i = 0; i < 26; i++) { const cx = 6 + r() * 24, cy = 8 + r() * 8, rad = 3 + r() * 5; x.fillStyle = i < 14 ? sh(c, 0.85) : i < 22 ? c : sh(c, 1.3); x.beginPath(); x.arc(cx, cy + (i < 14 ? 2 : 0), rad, 0, 6.3); x.fill(); } x.fillStyle = sh(c, 0.7); x.fillRect(4, 18, 28, 2); }); }
function grassCanvas(seed, c = '#5a8a3a') { const r = rng(seed); return cutout(24, 10, (x) => { for (let i = 0; i < 16; i++) { const gx = Math.floor(r() * 22), hh = 3 + Math.floor(r() * 7); x.fillStyle = i % 3 ? c : sh(c, 1.3); x.fillRect(gx, 10 - hh, 1, hh); } }); }
function flagCanvas(text, col) { return cutout(28, 72, (x) => { x.fillStyle = '#5a3a22'; x.fillRect(2, 0, 2, 72); x.fillStyle = col; x.fillRect(4, 4, 22, 30); x.fillStyle = sh(col, 0.75); x.fillRect(4, 30, 22, 4); x.fillStyle = '#1a1010'; x.font = '900 18px "Noto Serif TC", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 15, 19); }); }
function lanternCanvas() { return cutout(10, 14, (x) => { x.fillStyle = '#3a1a10'; x.fillRect(4, 0, 2, 2); x.fillStyle = '#d83a2a'; x.fillRect(1, 2, 8, 10); x.fillStyle = '#ff7a50'; x.fillRect(2, 3, 3, 8); x.fillStyle = '#e8c040'; x.fillRect(1, 2, 8, 1); x.fillRect(1, 11, 8, 1); x.fillStyle = '#3a1a10'; x.fillRect(4, 12, 2, 2); }); }

// ---------------------------------------------------------------- the stage
export class Stage {
  constructor(V) { this.V = V; this.group = null; this.lights = []; this.anim = []; this.doors = []; this.solid = []; }
  clear() { const sc = this.V.scene; if (this.group) { sc.remove(this.group); this.group.traverse((o) => { o.geometry?.dispose?.(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); } }); } this.group = new THREE.Group(); sc.add(this.group); this.lights = []; this.anim = []; this.doors = []; this.solid = []; }
  add(o) { this.group.add(o); return o; }
  build(Z) {
    this.clear(); const V = this.V, sc = V.scene, M = MOODS[Z.mood || 'day'], len = Z.len, r = rng(Z.seed || Z.len * 13 + 7); this.Z = Z; this.M = M;
    // sky and fog
    sc.background = skyTex(M.sky); sc.fog = new THREE.Fog(M.fog, 55, 190);
    V.renderer.toneMappingExposure = M.exposure; V.grade.uniforms.tint.value.set(...M.tint);
    const hemi = new THREE.HemisphereLight(M.hemi[0], M.hemi[1], M.hemiI); this.add(hemi);
    const amb = new THREE.AmbientLight('#ffffff', M.amb); this.add(amb);
    const sun = new THREE.DirectionalLight(M.sun, M.sunI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    const sc2 = sun.shadow.camera; sc2.left = -26; sc2.right = 26; sc2.top = 18; sc2.bottom = -18; sc2.near = 1; sc2.far = 90; this.add(sun); this.add(sun.target); this.sun = sun;
    // the ground: a wide field, with the road or street through the walkable band
    const gW = len + 160, ground = new THREE.Mesh(new THREE.PlaneGeometry(gW, 100), new THREE.MeshLambertMaterial({ map: (GROUNDS[Z.ground] || GROUNDS.grass)() }));
    ground.material.map.repeat.set(gW / 2, 50); ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.rotation.x = -Math.PI / 2; ground.position.set(len / 2, 0, -22); ground.receiveShadow = true; this.add(ground);
    if (Z.road !== 'none') {
      const roadT = (GROUNDS[Z.road || (Z.kind === 'town' ? 'pave' : 'dirt')] || GROUNDS.dirt)(); roadT.wrapS = roadT.wrapT = THREE.RepeatWrapping; roadT.repeat.set((len + 40) / 2, D / 2 + 0.6);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(len + 40, D + 1.2), new THREE.MeshLambertMaterial({ map: roadT })); road.rotation.x = -Math.PI / 2; road.position.set(len / 2, 0.01, D / 2); road.receiveShadow = true; this.add(road);
      // the road's ragged edges
      for (const ez of [-0.6, D + 0.6]) for (let x = -20; x < len + 20; x += 1.5 + r() * 2) { const m = cutoutMesh(grassCanvas(Math.floor(r() * 999), Z.ground === 'sand' ? '#a89a5a' : Z.ground === 'snow' ? '#c8d0d0' : '#5a8a3a'), PX, { shadow: false }); m.position.set(x, 0, ez + (r() - 0.5) * 0.4); m.rotation.x = -0.3; this.add(m); }
    }
    if (Z.water) this.water(Z);
    this.hills(Z, M);
    // what stands behind and in front of the road
    const B = Z.back || [];
    for (const it of B) this.thing(it, r, M);
    // filler: trees and rocks along the back and a few low things in front (blurred by the lens)
    const fill = Z.fill || (Z.kind === 'town' ? 'town' : 'field');
    if (fill !== 'none') {
      const trees = Z.trees || ['broad'];
      for (let x = -14; x < len + 14; x += 2.2 + r() * 3.5) {
        if (B.some((b) => b.x != null && Math.abs(b.x - x) < (b.w || 4) / 2 + 1.5)) continue;
        const z = -2.2 - r() * 7, k = trees[Math.floor(r() * trees.length)];
        if (fill === 'town' && r() < 0.65) continue;
        const t = cutoutMesh(treeCanvas(k, Math.floor(r() * 9999)), PX * (0.9 + r() * 0.5)); t.position.set(x, 0, z); this.add(t); this.solid.push(t);
        if (r() < 0.35) { const b = cutoutMesh(bushCanvas(Math.floor(r() * 999), k === 'jungle' ? '#2a5a2a' : '#3a6a2e')); b.position.set(x + 1 + r(), 0, z + 1.2); this.add(b); }
      }
      for (let x = -10; x < len + 10; x += 4 + r() * 6) {
        const z = D + 3 + r() * 4, roll = r();
        const m = roll < 0.4 ? cutoutMesh(bushCanvas(Math.floor(r() * 999)), PX * 1.05) : roll < 0.6 ? cutoutMesh(rockCanvas(Math.floor(r() * 999), Z.ground === 'snow'), PX * 0.9) : roll < 0.75 ? cutoutMesh(bushCanvas(Math.floor(r() * 999), '#4a7a36'), PX * 0.85) : cutoutMesh(grassCanvas(Math.floor(r() * 999)), PX * 1.5);
        m.position.set(x, 0, z); m.rotation.x = -0.25; this.add(m);
      }
    }
    // a few lights in the dark: lanterns on posts, braziers
    if (M.lamps && Z.lamps !== false) for (let x = 6; x < len; x += Z.kind === 'town' ? 10 : 18) this.lamp(x, -0.7);
    this.shade = 0; return this;
  }
  hills(Z, M) {
    const far = Z.hills || 'green', cols = { green: ['#5a7a6a', '#6a8a7a', '#8aa098'], snow: ['#8a98a8', '#a8b4c0', '#e0e8f0'], desert: ['#a88a6a', '#c0a080', '#d8c0a0'], dark: ['#2a3040', '#3a4050', '#4a5060'], red: ['#6a3a30', '#8a4a3a', '#a86a50'], jungle: ['#2a4a32', '#3a5a3a', '#5a7a5a'] }[far] || ['#5a7a6a', '#6a8a7a', '#8aa098'];
    [[-82, 5.2, cols[2], 0.9], [-66, 4.2, cols[1], 0.6], [-52, 3.2, cols[0], 0.4]].forEach(([z, ridge, c, rough], k) => {
      const r = rng(Z.len * 3 + k * 101), W = 512, H = 128;
      const cv = cutout(W, H, (x) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, H); let y = H * 0.4; for (let i = 0; i <= W; i += 8) { y += (r() - 0.5) * 22 * rough; y = Math.max(H * 0.12, Math.min(H * 0.8, y)); x.lineTo(i, y); } x.lineTo(W, H); x.fill(); if (far === 'snow' && k === 0) { x.fillStyle = '#f4f8fc'; for (let i = 0; i < 30; i++) x.fillRect(Math.floor(r() * W), H * 0.15 + r() * 14, 10, 2); } });
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const PH = 18, m = new THREE.Mesh(new THREE.PlaneGeometry(Z.len + 260, PH), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: true, depthWrite: false })); m.position.set(Z.len / 2, ridge + 0.4 * PH - PH / 2, z); m.renderOrder = -1; this.add(m);
    });
  }
  water(Z) {
    const t = waterTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((Z.len + 120) / 4, 6);
    const w = Z.water, z0 = w === 'front' ? D + 3 : -18, depth = w === 'front' ? 30 : 15;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Z.len + 120, depth), new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }));
    m.rotation.x = -Math.PI / 2; m.position.set(Z.len / 2, 0.03, z0 + (w === 'front' ? depth / 2 : -depth / 2 + 10)); this.add(m); this.anim.push((dt) => { t.offset.x += dt * 0.02; t.offset.y += dt * 0.01; });
  }
  lamp(x, z, light = true) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), new THREE.MeshLambertMaterial({ color: '#3a2a1a' })); post.position.set(x, 1.1, z); post.castShadow = true; this.add(post);
    const l = cutoutMesh(lanternCanvas(), PX * 1.4, { glow: '#ff8a50', shadow: false }); l.position.set(x + 0.25, 1.75, z + 0.05); this.add(l);
    if (light && this.lights.length < 6) { const p = new THREE.PointLight('#ff9a50', 6, 9, 1.6); p.position.set(x + 0.25, 2.1, z + 0.6); this.add(p); this.lights.push(p); this.anim.push((dt, t) => { p.intensity = 5.5 + Math.sin(t * 7 + x) * 0.6 + Math.sin(t * 13 + x * 3) * 0.3; }); }
  }
  // one built thing from a zone's list
  thing(it, r, M) {
    switch (it.k) {
      case 'house': return this.house(it, M);
      case 'tree': { const t = cutoutMesh(treeCanvas(it.kind || 'broad', it.seed || Math.floor(r() * 999)), PX * (it.s || 1.2)); t.position.set(it.x, 0, it.z ?? -2.5); this.add(t); return; }
      case 'trees': for (let x = it.x0; x < it.x1; x += it.gap || 2.5) { const t = cutoutMesh(treeCanvas(it.kind, Math.floor(r() * 9999)), PX * (1 + r() * 0.4)); t.position.set(x + r(), 0, (it.z ?? -2.5) - r() * 4); this.add(t); } return;
      case 'rock': { const m = cutoutMesh(rockCanvas(Math.floor(r() * 999), it.snow), PX * (it.s || 1.6)); m.position.set(it.x, 0, it.z ?? -1.2); this.add(m); return; }
      case 'fence': this.fence(it.x0, it.x1, it.z ?? -0.9, it.col); return;
      case 'tent': this.tent(it.x, it.z ?? -3.4, it.col || '#d8c060', it.w || 4); return;
      case 'palisade': this.palisade(it.x0, it.x1, it.z ?? -1.6); return;
      case 'wall': this.cityWall(it, M); return;
      case 'flag': { const f = cutoutMesh(flagCanvas(it.t || '黃', it.col || '#e8c820'), PX * 1.3); f.position.set(it.x, 0, it.z ?? -1); this.add(f); this.anim.push((dt, t) => { f.rotation.y = Math.sin(t * 2 + it.x) * 0.12; }); return; }
      case 'lamp': this.lamp(it.x, it.z ?? -0.7, it.light !== false); return;
      case 'well': { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.8, 12), new THREE.MeshLambertMaterial({ map: wallTex('stone', '#8a8478') })); g.position.set(it.x, 0.4, it.z ?? -1.5); g.castShadow = g.receiveShadow = true; this.add(g); const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.7, 4), new THREE.MeshLambertMaterial({ map: thatchTex() })); roof.position.set(it.x, 2.3, it.z ?? -1.5); roof.rotation.y = Math.PI / 4; roof.castShadow = true; this.add(roof); for (const dx of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), new THREE.MeshLambertMaterial({ color: '#4a3020' })); p.position.set(it.x + dx, 1.4, it.z ?? -1.5); this.add(p); } return; }
      case 'boat': this.boat(it); return;
      case 'pillars': for (let x = it.x0; x <= it.x1; x += it.gap || 4) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 5, 10), new THREE.MeshLambertMaterial({ color: '#a82a20' })); p.position.set(x, 2.5, it.z ?? -1.2); p.castShadow = true; this.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), new THREE.MeshLambertMaterial({ map: wallTex('stone', '#a8a090') })); b.position.set(x, 0.15, it.z ?? -1.2); this.add(b); } return;
      case 'sign': { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshLambertMaterial({ map: signTex(it.t, '#5a3a1e', '#f4e4b0', 128, 40) })); s.position.set(it.x, 1.7, it.z ?? -0.6); this.add(s); const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), new THREE.MeshLambertMaterial({ color: '#4a3020' })); p.position.set(it.x, 0.9, (it.z ?? -0.6) - 0.05); p.castShadow = true; this.add(p); return; }
      case 'crates': for (let i = 0; i < (it.n || 3); i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ map: wallTex('boards', '#8a6a3a') })); b.position.set(it.x + i * 0.95, 0.45 + (i === 2 ? 0.9 : 0), it.z ?? -1.2); if (i === 2) b.position.x = it.x + 0.5; b.castShadow = b.receiveShadow = true; this.add(b); } return;
      case 'rack': { const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: '#5a3a20' }); for (const dx of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), wood); p.position.set(dx, 0.8, 0); g.add(p); } const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), wood); bar.position.y = 1.4; g.add(bar); for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), new THREE.MeshLambertMaterial({ color: '#b8b8c0' })); s.position.set(-0.6 + i * 0.4, 1.1, 0.06); s.rotation.z = 0.08; g.add(s); } g.position.set(it.x, 0, it.z ?? -0.9); g.traverse((o) => { o.castShadow = true; }); this.add(g); return; }
      case 'fire': { const p = new THREE.PointLight('#ff7a30', 7, 10, 1.5); p.position.set(it.x, 1.2, (it.z ?? -1) + 0.4); this.add(p); this.lights.push(p); const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), new THREE.MeshLambertMaterial({ color: '#3a2214' })); logs.position.set(it.x, 0.15, it.z ?? -1); this.add(logs); const fl = cutoutMesh(cutout(16, 22, (x) => { x.fillStyle = '#ff6a20'; x.beginPath(); x.moveTo(8, 0); x.lineTo(15, 22); x.lineTo(1, 22); x.fill(); x.fillStyle = '#ffd040'; x.beginPath(); x.moveTo(8, 8); x.lineTo(12, 22); x.lineTo(4, 22); x.fill(); }), PX * 1.6, { glow: '#ff8a30', shadow: false }); fl.position.set(it.x, 0.25, it.z ?? -1); this.add(fl); this.anim.push((dt, t) => { p.intensity = 6 + Math.sin(t * 9 + it.x) * 1.5; fl.scale.y = 0.85 + Math.sin(t * 12 + it.x) * 0.15; }); return; }
      default: return;
    }
  }
  // a house facing the street: walls, a tiled gable roof with eaves, a door (that can be entered), a sign
  house(it, M) {
    const g = new THREE.Group(); g.position.y = it.y || 0; this.group.add(g); const add = (o) => g.add(o);
    const w = it.w || 6, d = it.d || 4, h = it.h || 3.2, x = it.x, z = it.z ?? -(d / 2 + 0.6), col = it.col || '#e8dcc0', roofC = it.roof || '#4a5a6a';
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: wallTex(it.wall || 'plaster', col, { repeat: [w / 2, h / 2] }) }));
    walls.material.map.wrapS = walls.material.map.wrapT = THREE.RepeatWrapping; walls.material.map.repeat.set(w / 2.2, h / 2.2);
    walls.position.set(x, h / 2, z); walls.castShadow = walls.receiveShadow = true; add(walls);
    // a stone footing
    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), new THREE.MeshLambertMaterial({ map: wallTex('stone', '#8a8478') })); base.position.set(x, 0.17, z); base.receiveShadow = true; add(base);
    // the roof: two sloping planes and the gable ends, with a ridge
    const rise = it.thatch ? 2 : 1.6, over = 0.7, slope = Math.hypot(d / 2 + over, rise), ang = Math.atan2(rise, d / 2 + over);
    const rt = it.thatch ? thatchTex() : roofTex(roofC); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set((w + 1.6) / 1.5, slope / 1.5);
    const rm = new THREE.MeshLambertMaterial({ map: rt, side: THREE.DoubleSide });
    for (const sgn of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.6, slope), rm); p.rotation.x = -Math.PI / 2 + sgn * (Math.PI / 2 - ang); p.rotation.x = sgn > 0 ? -(Math.PI / 2 - ang) : Math.PI + (Math.PI / 2 - ang); p.position.set(x, h + rise / 2, z + sgn * (d / 2 + over) / 2); p.castShadow = true; p.receiveShadow = true; add(p); }
    const gable = new THREE.Shape(); gable.moveTo(-d / 2, 0); gable.lineTo(d / 2, 0); gable.lineTo(0, rise); gable.lineTo(-d / 2, 0);
    for (const sx of [-w / 2, w / 2]) { const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), new THREE.MeshLambertMaterial({ color: sh(col, 0.85), side: THREE.DoubleSide })); g.rotation.y = Math.PI / 2; g.position.set(x + sx, h, z); add(g); }
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.28, 0.32), new THREE.MeshLambertMaterial({ color: it.thatch ? '#7a5a30' : sh(roofC, 0.7) })); ridge.position.set(x, h + rise + 0.05, z); ridge.castShadow = true; add(ridge);
    if (!it.thatch) for (const sx of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), ridge.material); tip.position.set(x + sx * (w / 2 + 1), h + rise + 0.25, z); tip.rotation.z = -sx * 0.5; add(tip); }
    // the front: posts, a door, windows, a sign board
    const fz = z + d / 2 + 0.01, dw = it.door === false ? 0 : 1.5;
    for (const sx of [-w / 2 + 0.15, w / 2 - 0.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.22), new THREE.MeshLambertMaterial({ color: '#5a2a1a' })); p.position.set(x + sx, h / 2, fz + 0.1); p.castShadow = true; add(p); }
    if (dw) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(dw, 2.2), new THREE.MeshLambertMaterial({ color: '#1e120c' })); door.position.set(x + (it.dx || 0), 1.1 + 0.35, fz); add(door);
      if (it.curtain) { const cur = new THREE.Mesh(new THREE.PlaneGeometry(dw, 0.8), new THREE.MeshLambertMaterial({ map: wallTex('cloth', it.curtain) })); cur.position.set(x + (it.dx || 0), 2.1, fz + 0.02); add(cur); }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.3, 0.2, 0.16), new THREE.MeshLambertMaterial({ color: '#5a2a1a' })); frame.position.set(x + (it.dx || 0), 2.6, fz + 0.06); add(frame);
      if (it.shop) this.doors.push({ x: x + (it.dx || 0), shop: it.shop, name: it.sign, id: it.id || it.shop });
    }
    for (const sx of it.windows || [-w / 2 + 1.1, w / 2 - 1.1]) { if (Math.abs(sx - (it.dx || 0)) < 1.4) continue; const wi = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshLambertMaterial({ map: lattice(), emissive: M.lamps ? new THREE.Color('#ffb060') : new THREE.Color('#000000'), emissiveIntensity: M.lamps ? 0.7 : 0 })); wi.position.set(x + sx, 1.9, fz + 0.01); add(wi); }
    if (it.sign) { const sw = Math.max(1.9, it.sign.length * 0.78 + 0.5), s = new THREE.Mesh(new THREE.PlaneGeometry(sw, 0.86), new THREE.MeshLambertMaterial({ map: signTex(it.sign, it.signBg || '#2a1a10', '#f4d878', Math.max(64, it.sign.length * 40 + 24), 36), emissive: new THREE.Color('#5a4a2a') })); s.position.set(x + (it.dx || 0), h + 0.2, fz + over + 0.15); s.rotation.x = -0.12; add(s); }
    if (it.lanterns !== false && (it.shop || it.lanterns)) for (const sx of [-1.1, 1.1]) { const l = cutoutMesh(lanternCanvas(), PX * 1.3, { glow: '#ff7a40', shadow: false }); l.position.set(x + (it.dx || 0) + sx, 1.85, fz + 0.25); add(l); this.anim.push((dt, t) => { l.rotation.z = Math.sin(t * 1.6 + sx + x) * 0.06; }); }
    if (M.lamps && it.shop && this.lights.length < 6) { const p = new THREE.PointLight('#ffa060', 4, 7, 1.6); p.position.set(x, 2.2, fz + 1); add(p); this.lights.push(p); }
  }
  fence(x0, x1, z, col = '#7a5a36') { const m = new THREE.MeshLambertMaterial({ color: col }); for (let x = x0; x <= x1; x += 1.2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), m); p.position.set(x, 0.5, z); p.castShadow = true; this.add(p); } for (const y of [0.4, 0.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.06), m); b.position.set((x0 + x1) / 2, y, z); b.castShadow = true; this.add(b); } }
  palisade(x0, x1, z) { const t = wallTex('boards', '#7a5a32'); const m = new THREE.MeshLambertMaterial({ map: t }); for (let x = x0; x <= x1; x += 0.42) { const hh = 2.6 + Math.sin(x * 7) * 0.2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, hh, 6), m); p.position.set(x, hh / 2, z); p.castShadow = true; this.add(p); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), m); tip.position.set(x, hh + 0.2, z); this.add(tip); } }
  tent(x, z, col, w) { const g = new THREE.Mesh(new THREE.ConeGeometry(w / 2, 2.8, 6, 1, true), new THREE.MeshLambertMaterial({ map: wallTex('cloth', col), side: THREE.DoubleSide })); g.position.set(x, 1.4, z); g.castShadow = true; this.add(g); const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshBasicMaterial({ color: '#2a1a0a' })); door.position.set(x, 0.6, z + w / 2 * 0.85); door.rotation.x = -0.35; this.add(door); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), new THREE.MeshLambertMaterial({ color: '#4a3020' })); pole.position.set(x, 3.2, z); this.add(pole); }
  cityWall(it, M) {
    const x0 = it.x0 ?? -20, x1 = it.x1 ?? this.Z.len + 20, z = it.z ?? -4, h = it.h || 7, t = wallTex('stone', it.col || '#8a8478');
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((x1 - x0) / 2.5, h / 2.5);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 3), new THREE.MeshLambertMaterial({ map: t })); wall.position.set((x0 + x1) / 2, h / 2, z - 1.5); wall.castShadow = wall.receiveShadow = true; this.add(wall);
    for (let x = x0; x < x1; x += 1.4) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.5), wall.material); b.position.set(x, h + 0.35, z - 0.2); b.castShadow = true; this.add(b); }
    if (it.gate != null) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.4), new THREE.MeshLambertMaterial({ color: '#1a100a' })); g.position.set(it.gate, 2.2, z + 0.02); this.add(g);
      const doorT = wallTex('boards', '#6a3a1a'); const dl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.2), new THREE.MeshLambertMaterial({ map: doorT })); dl.position.set(it.gate - 1.9, 2.1, z + 0.4); dl.rotation.y = 1.1; this.add(dl);
      this.house({ x: it.gate, z: z - 1.6, w: 9, d: 3.4, h: 2.6, col: '#a83a2a', wall: 'boards', roof: it.roofC || '#3a4a5a', door: false, sign: it.sign, signBg: '#1a1a2a', windows: [-3, 3], lanterns: true, y: h }, M);
    }
  }
  boat(it) { const hull = new THREE.Mesh(new THREE.BoxGeometry(it.w || 8, 1.2, 2.6), new THREE.MeshLambertMaterial({ map: wallTex('boards', '#6a4a2a') })); hull.position.set(it.x, 0.4, it.z ?? -6); hull.castShadow = true; this.add(hull); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6), new THREE.MeshLambertMaterial({ color: '#4a3020' })); mast.position.set(it.x, 3.6, it.z ?? -6); this.add(mast); const sail = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.6), new THREE.MeshLambertMaterial({ map: wallTex('cloth', it.sail || '#d8c8a0'), side: THREE.DoubleSide })); sail.position.set(it.x + 0.2, 4, (it.z ?? -6) + 0.1); this.add(sail); this.anim.push((dt, t) => { hull.position.y = 0.4 + Math.sin(t * 1.3 + it.x) * 0.06; hull.rotation.z = Math.sin(t * 1.1 + it.x) * 0.02; }); }
  // each frame: the sun follows the camera, lamps flicker, water flows
  update(dt, t, camX) {
    const s = this.sun; if (s) { s.position.set(camX - 14, 26, 22); s.target.position.set(camX, 0, 0); }
    for (const f of this.anim) f(dt, t);
  }
}
let latticeT = null;
function lattice() { if (latticeT) return latticeT; latticeT = pxTex(16, 16, (x) => { x.fillStyle = '#d8c8a0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#4a2a1a'; for (let i = 0; i < 16; i += 4) { x.fillRect(i, 0, 1, 16); x.fillRect(0, i, 16, 1); } x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16); }); return latticeT; }
function skyTex([a, b]) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
