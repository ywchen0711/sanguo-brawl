// The HD-2D look: pixel-art people standing in a lit 3D diorama, seen through a tilt-shift lens with bloom and a
// warm colour grade. One unit of the world is 16 pixels of sprite.
import * as THREE from '../lib/three.module.min.js';
import { EffectComposer } from '../lib/addons/EffectComposer.js';
import { RenderPass } from '../lib/addons/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/OutputPass.js';
import { ShaderPass } from '../lib/addons/ShaderPass.js';
import { frameCanvas, ANIMS, ANIM_NAMES, FW, FH, OY, PPU } from './art.js?v=8';
export { THREE };
export const PX = 1 / 16;

const TiltShift = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.5 }, band: { value: 0.2 }, amount: { value: 2.4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res, dir; uniform float focus, band, amount; varying vec2 vUv;
    void main(){
      float d = max(0.0, abs(vUv.y - focus) - band);
      float r = clamp(d * 4.0, 0.0, 1.0) * amount;
      vec2 st = dir / res * r;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += texture2D(tDiffuse, vUv + st * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv - st * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv + st * 3.2307692308) * 0.0702702703;
      c += texture2D(tDiffuse, vUv - st * 3.2307692308) * 0.0702702703;
      gl_FragColor = c;
    }`,
};
const Grade = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.04 }, contrast: { value: 1.06 }, tint: { value: new THREE.Vector3(1.02, 1.0, 0.96) }, vig: { value: 0.55 }, fade: { value: 0 }, flash: { value: 0 }, flashColor: { value: new THREE.Vector3(1, 1, 1) }, gray: { value: 0 } },
  vertexShader: TiltShift.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat, contrast, vig, fade, flash, gray; uniform vec3 tint, flashColor; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, sat * (1.0 - gray));
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      c.rgb *= tint;
      float l2 = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += mix(vec3(-0.02, 0.0, 0.05), vec3(0.04, 0.02, -0.03), smoothstep(0.15, 0.85, l2)) * (1.0 - gray);
      vec2 d = vUv - 0.5; c.rgb *= 1.0 - dot(d, d) * vig * 1.8;
      c.rgb = mix(c.rgb, flashColor, flash);
      c.rgb *= 1.0 - fade;
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
    }`,
};

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType }));
  const rp = new RenderPass(scene, camera); composer.addPass(rp);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.38, 0.55, 0.86); composer.addPass(bloom);
  const tsH = new ShaderPass(TiltShift), tsV = new ShaderPass(TiltShift); tsV.uniforms.dir.value.set(0, 1); composer.addPass(tsH); composer.addPass(tsV);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade); composer.addPass(grade);
  const V = {
    renderer, scene, camera, composer, bloom, grade, tsH, tsV, shake: 0, shakeT: 0,
    resize() {
      const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      composer.setSize(w, h); const s = renderer.getDrawingBufferSize(new THREE.Vector2()); tsH.uniforms.res.value.copy(s); tsV.uniforms.res.value.copy(s);
      // a narrow screen sees less of the road: pull the camera back a little
      V.portrait = w / h < 1.2;
    },
    tilt(focus, band, amount) { for (const p of [tsH, tsV]) { p.uniforms.focus.value = focus; p.uniforms.band.value = band; p.uniforms.amount.value = amount; } },
    render() { composer.render(); },
  };
  V.resize(); window.addEventListener('resize', () => V.resize());
  return V;
}

// ---------------------------------------------------------------- people: one textured plane each, standing upright
// Each frame of a look is its own small texture, drawn the first time it is needed; the rest of a look's frames
// are filled in a few at a time between screen frames (prefillLooks). At most 28 looks are kept.
const lookCache = new Map(), pending = [];
function lookEntry(L) {
  const key = L.key || JSON.stringify(L); let E = lookCache.get(key);
  if (E) { lookCache.delete(key); lookCache.set(key, E); return E; }
  E = { L, tex: new Map(), todo: [] }; for (const n of ANIM_NAMES) ANIMS[n].forEach((f, i) => E.todo.push([n, i]));
  lookCache.set(key, E); pending.push(E);
  while (lookCache.size > 28) { const [k0, E0] = lookCache.entries().next().value; lookCache.delete(k0); for (const t of E0.tex.values()) t.dispose(); }
  return E;
}
function frameTex(E, anim, i) {
  const a = ANIMS[anim] ? anim : 'stand', n = ANIMS[a].length, k = a + ':' + (i % n);
  let t = E.tex.get(k);
  if (!t) { t = new THREE.CanvasTexture(frameCanvas(E.L, a, i % n)); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; E.tex.set(k, t); }
  return t;
}
export function prefillLooks(ms = 3) {
  const t0 = performance.now();
  while (pending.length && performance.now() - t0 < ms) { const E = pending[0], f = E.todo.pop(); if (!f) { pending.shift(); continue; } frameTex(E, f[0], f[1]); }
}
const SPX = 1 / PPU;   // people are drawn at three times the pixels of the scenery
const planeGeo = new THREE.PlaneGeometry(FW * SPX, FH * SPX); planeGeo.translate(0, (FH * SPX) / 2 - (FH - OY) * SPX, 0);   // the feet at the origin
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
export class Body {
  constructor(scene, L) {
    this.scene = scene; this.setLook(L);
    this.blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); this.blob.renderOrder = 1; scene.add(this.blob);
  }
  setLook(L) {
    this.E = lookEntry(L); this.L = L; const t = frameTex(this.E, 'stand', 0); this.cur = t;
    if (this.mesh) { const m = this.mesh.material; m.map = t; m.emissiveMap = t; this.mesh.customDepthMaterial.map = t; return; }
    const mat = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color('#383838'), emissiveMap: t });
    this.mesh = new THREE.Mesh(planeGeo, mat); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
    this.scene.add(this.mesh);
  }
  frame(anim, i, face) {
    const t = frameTex(this.E, anim, i);
    if (t !== this.cur) { this.cur = t; const m = this.mesh.material; m.map = t; m.emissiveMap = t; this.mesh.customDepthMaterial.map = t; }
    this.mesh.scale.x = face < 0 ? -1 : 1;
  }
  place(x, y, z, tiltX = -0.32) { this.mesh.position.set(x, y, z); this.mesh.rotation.x = tiltX; this.blob.position.set(x, 0.02, z + 0.05); const k = Math.max(0.4, 1 - y * 0.12) * (this.L.size || 1); this.blob.scale.set(1.5 * k, 1, 0.6 * k); }
  flash(on, col = '#ffffff') { this.mesh.material.emissive.set(on ? col : '#383838'); }
  visible(v) { this.mesh.visible = v; this.blob.visible = v; }
  dispose() { this.scene.remove(this.mesh); this.scene.remove(this.blob); this.mesh.material.dispose(); this.mesh.customDepthMaterial.dispose(); this.blob.material.dispose(); }
}
export const animLen = (a) => (ANIMS[a] || ANIMS.stand).length;
export const animDur = (a, i) => (ANIMS[a] || ANIMS.stand)[i % animLen(a)].t;

// ---------------------------------------------------------------- pixel textures drawn in code
export function pxTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function rng(seed) { let s = seed >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const shadeHex = (c, f) => { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))); return `rgb(${m(r)},${m(g)},${m(b)})`; };
// a speckled ground tile (grass, dirt, sand, snow…): base colour, darker and lighter flecks, a few tufts
export function groundTex(base, opts = {}) {
  const r = rng(opts.seed || 3);
  return pxTex(32, 32, (x) => {
    x.fillStyle = base; x.fillRect(0, 0, 32, 32);
    for (let i = 0; i < (opts.n || 90); i++) { x.fillStyle = shadeHex(base, r() < 0.5 ? 0.86 + r() * 0.06 : 1.06 + r() * 0.06); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + (r() < 0.3 ? 1 : 0), 1); }
    if (opts.tufts) for (let i = 0; i < opts.tufts; i++) { const tx = Math.floor(r() * 30), ty = Math.floor(r() * 30); x.fillStyle = shadeHex(base, 1.18); x.fillRect(tx, ty, 1, 2); x.fillRect(tx + 2, ty + 1, 1, 2); x.fillStyle = shadeHex(base, 0.75); x.fillRect(tx + 1, ty + 2, 1, 1); }
    if (opts.stones) for (let i = 0; i < opts.stones; i++) { const tx = Math.floor(r() * 30), ty = Math.floor(r() * 30); x.fillStyle = '#9a948a'; x.fillRect(tx, ty, 2, 1); x.fillStyle = '#6a645a'; x.fillRect(tx, ty + 1, 2, 1); }
    if (opts.flowers) for (let i = 0; i < opts.flowers; i++) { x.fillStyle = ['#f0e070', '#f0a0c0', '#ffffff', '#e06060'][Math.floor(r() * 4)]; x.fillRect(Math.floor(r() * 31), Math.floor(r() * 31), 1, 1); }
  }, opts.repeat);
}
// paving stones: an irregular brick bond
export function paveTex(base, opts = {}) {
  const r = rng(opts.seed || 5);
  return pxTex(32, 32, (x) => {
    x.fillStyle = shadeHex(base, 0.62); x.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 4; row++) { let cx = row % 2 ? -4 : 0; while (cx < 32) { const w = 6 + Math.floor(r() * 5); x.fillStyle = shadeHex(base, 0.9 + r() * 0.2); x.fillRect(cx + 1, row * 8 + 1, w - 1, 7); x.fillStyle = shadeHex(base, 1.15); x.fillRect(cx + 1, row * 8 + 1, w - 1, 1); x.fillStyle = shadeHex(base, 0.8); x.fillRect(cx + 1, row * 8 + 7, w - 1, 1); cx += w; } }
  }, opts.repeat);
}
// walls of houses: plaster between dark timbers, or plain boards, or stone blocks
export function wallTex(kind, col, opts = {}) {
  const r = rng(opts.seed || 9);
  return pxTex(32, 32, (x) => {
    if (kind === 'plaster') { x.fillStyle = col; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 60; i++) { x.fillStyle = shadeHex(col, 0.93 + r() * 0.1); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1); } x.fillStyle = '#4a3020'; x.fillRect(0, 0, 32, 3); x.fillRect(0, 29, 32, 3); x.fillRect(0, 0, 3, 32); x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 32, 1); x.fillRect(0, 29, 32, 1); }
    else if (kind === 'boards') { for (let i = 0; i < 8; i++) { x.fillStyle = shadeHex(col, 0.85 + r() * 0.25); x.fillRect(i * 4, 0, 4, 32); x.fillStyle = shadeHex(col, 0.6); x.fillRect(i * 4 + 3, 0, 1, 32); } }
    else if (kind === 'stone') { x.fillStyle = shadeHex(col, 0.55); x.fillRect(0, 0, 32, 32); for (let row = 0; row < 4; row++) for (let c = 0; c < 3; c++) { const ox = (row % 2) * 5 + c * 11 - 2; x.fillStyle = shadeHex(col, 0.85 + r() * 0.25); x.fillRect(ox + 1, row * 8 + 1, 10, 7); x.fillStyle = shadeHex(col, 1.18); x.fillRect(ox + 1, row * 8 + 1, 10, 1); } }
    else if (kind === 'brick') { x.fillStyle = '#5a4a40'; x.fillRect(0, 0, 32, 32); for (let row = 0; row < 8; row++) for (let c = 0; c < 5; c++) { const ox = (row % 2) * 4 + c * 8 - 4; x.fillStyle = shadeHex(col, 0.85 + r() * 0.25); x.fillRect(ox + 1, row * 4 + 1, 7, 3); } }
    else if (kind === 'cloth') { x.fillStyle = col; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 32; i += 8) { x.fillStyle = shadeHex(col, 0.8); x.fillRect(i, 0, 1, 32); } for (let i = 0; i < 40; i++) { x.fillStyle = shadeHex(col, 0.9 + r() * 0.1); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 2); } }
  }, opts.repeat);
}
// roof tiles: rows of half-round tiles
export function roofTex(col, opts = {}) {
  return pxTex(32, 32, (x) => {
    x.fillStyle = shadeHex(col, 0.55); x.fillRect(0, 0, 32, 32);
    for (let c = 0; c < 8; c++) { x.fillStyle = shadeHex(col, 1); x.fillRect(c * 4, 0, 3, 32); x.fillStyle = shadeHex(col, 1.25); x.fillRect(c * 4, 0, 1, 32); }
    for (let row = 0; row < 4; row++) { x.fillStyle = shadeHex(col, 0.7); x.fillRect(0, row * 8 + 7, 32, 1); }
  }, opts.repeat);
}
export function thatchTex(col = '#b89a5a') {
  const r = rng(11);
  return pxTex(32, 32, (x) => { x.fillStyle = shadeHex(col, 0.8); x.fillRect(0, 0, 32, 32); for (let i = 0; i < 160; i++) { x.fillStyle = shadeHex(col, 0.8 + r() * 0.45); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 3 + Math.floor(r() * 3)); } });
}
export function waterTex() {
  const r = rng(21);
  return pxTex(64, 64, (x) => { x.fillStyle = '#2e6a8a'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 70; i++) { const y = Math.floor(r() * 64), xx = Math.floor(r() * 60); x.fillStyle = r() < 0.5 ? '#4a8aaa' : '#7ab8d0'; x.fillRect(xx, y, 3 + Math.floor(r() * 5), 1); } });
}
// a sign board with characters painted on it
export function signTex(text, bg = '#3a2414', fg = '#f0d080', w = 96, h = 32) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d');
  x.fillStyle = '#1e140c'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = bg; x.fillRect(4, 4, c.width - 8, c.height - 8);
  x.fillStyle = fg; x.font = `900 ${Math.round(h * 1.15)}px "Noto Serif TC", serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// a flat pixel-art cut-out (trees, bushes, rocks, banners) as a canvas
export function cutout(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
export function cutoutMesh(canvas, scale = PX, opts = {}) {
  const t = new THREE.CanvasTexture(canvas); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.PlaneGeometry(canvas.width * scale, canvas.height * scale); g.translate(0, canvas.height * scale / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(opts.glow || '#202020'), emissiveMap: t }));
  m.castShadow = opts.shadow !== false; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  return m;
}
