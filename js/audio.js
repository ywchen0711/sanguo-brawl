// Sound made in code: blows (noise bursts through filters), blades (a bright swish), a 古箏-like pluck for the music
// and drums for a fight. Nothing is loaded.
let ctx = null, master = null, musicG = null, sfxG = null, noiseBuf = null;
export const audio = {
  on: true, vol: 0.8, music: 0.5,
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = this.vol; master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.gain.value = 0.9; sfxG.connect(master);
    musicG = ctx.createGain(); musicG.gain.value = this.music * 0.5; musicG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  setVol(v) { this.vol = v; if (master) master.gain.value = v; },
  setMusic(v) { this.music = v; if (musicG) musicG.gain.value = v * 0.5; },
  noise(t0, dur, f0, f1, q, g, type = 'bandpass') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const a = ctx.createGain(); a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(0.001, t0 + dur); s.connect(f); f.connect(a); a.connect(sfxG); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  },
  tone(t0, dur, f0, f1, g, type = 'sine', out = sfxG) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const a = ctx.createGain(); a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(g, t0 + 0.005); a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(a); a.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  sfx(n) {
    if (!ctx || !this.on) return; const t = ctx.currentTime, r = 0.9 + Math.random() * 0.2;
    switch (n) {
      case 'punch': this.noise(t, 0.08, 1400 * r, 300, 1.2, 0.5); this.tone(t, 0.07, 160 * r, 70, 0.4); break;
      case 'kick': this.noise(t, 0.1, 900 * r, 200, 1, 0.5); this.tone(t, 0.09, 120 * r, 55, 0.5); break;
      case 'hit': this.noise(t, 0.09, 2400 * r, 500, 1.5, 0.55); this.tone(t, 0.08, 220 * r, 80, 0.45, 'triangle'); break;
      case 'smash': this.noise(t, 0.2, 1800 * r, 120, 0.8, 0.75); this.tone(t, 0.18, 140 * r, 40, 0.7); break;
      case 'cut': this.noise(t, 0.12, 5000 * r, 1500, 2, 0.45, 'highpass'); this.noise(t, 0.08, 1800, 400, 1.2, 0.35); break;
      case 'blade': this.noise(t, 0.14, 3000 * r, 6000, 3, 0.25); break;
      case 'blade2': this.noise(t, 0.22, 2000 * r, 7000, 2.5, 0.32); break;
      case 'guard': this.tone(t, 0.12, 1800 * r, 1200, 0.25, 'square'); this.noise(t, 0.06, 4000, 2000, 2, 0.3); break;
      case 'thud': this.tone(t, 0.18, 90 * r, 40, 0.6); this.noise(t, 0.14, 400, 80, 0.8, 0.4, 'lowpass'); break;
      case 'jump': this.noise(t, 0.12, 600, 1800, 1, 0.12); break;
      case 'whoosh': this.noise(t, 0.3, 400, 3000, 1, 0.22); break;
      case 'throw': this.noise(t, 0.2, 500, 2000, 1, 0.25); break;
      case 'grab': this.noise(t, 0.06, 900, 400, 1, 0.3); break;
      case 'wood': this.noise(t, 0.12, 700 * r, 300, 3, 0.5); this.tone(t, 0.1, 300 * r, 200, 0.3, 'triangle'); break;
      case 'quake': this.tone(t, 0.6, 70, 30, 0.9); this.noise(t, 0.6, 300, 60, 0.7, 0.7, 'lowpass'); break;
      case 'roar': for (let i = 0; i < 3; i++) this.tone(t + i * 0.02, 0.7, 120 + i * 40, 90, 0.35, 'sawtooth'); this.noise(t, 0.7, 600, 200, 0.6, 0.4); break;
      case 'ki': this.tone(t, 0.35, 300, 900, 0.3, 'sine'); this.tone(t, 0.35, 450, 1300, 0.15, 'triangle'); break;
      case 'fire': this.noise(t, 0.6, 600, 2500, 0.6, 0.5); break;
      case 'thunder': this.noise(t, 0.9, 3000, 80, 0.5, 0.9); this.tone(t, 0.6, 60, 30, 0.8); break;
      case 'bow': this.tone(t, 0.12, 300, 150, 0.3, 'triangle'); this.noise(t, 0.15, 3000, 5000, 3, 0.2); break;
      case 'bell': for (const f of [1800, 2400]) this.tone(t, 0.4, f * r, null, 0.12, 'sine'); this.noise(t, 0.2, 2000, 6000, 2, 0.25); break;
      case 'heal': for (let i = 0; i < 4; i++) this.tone(t + i * 0.07, 0.3, [523, 659, 784, 1046][i], null, 0.15, 'sine'); break;
      case 'buff': this.tone(t, 0.5, 200, 400, 0.3, 'sawtooth'); this.tone(t + 0.05, 0.5, 300, 600, 0.2, 'square'); break;
      case 'coin': this.tone(t, 0.08, 1320, null, 0.18, 'square'); this.tone(t + 0.06, 0.18, 1760, null, 0.15, 'square'); break;
      case 'eat': this.noise(t, 0.08, 1200, 600, 2, 0.25); this.noise(t + 0.12, 0.08, 1200, 600, 2, 0.25); this.tone(t + 0.25, 0.25, 660, 880, 0.15); break;
      case 'level': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(t + i * 0.08, 0.35, f, null, 0.18, 'triangle')); break;
      case 'select': this.tone(t, 0.06, 880, null, 0.12, 'square'); break;
      case 'move': this.tone(t, 0.04, 660, null, 0.08, 'square'); break;
      case 'back': this.tone(t, 0.08, 440, 330, 0.1, 'square'); break;
      case 'ko': this.tone(t, 0.5, 400, 60, 0.4, 'sawtooth'); break;
      case 'gong': for (const f of [110, 165, 220, 330]) this.tone(t, 2.4, f, f * 0.97, 0.25, 'sine'); this.noise(t, 0.4, 800, 200, 0.5, 0.3); break;
      case 'nosp': this.tone(t, 0.12, 200, 150, 0.15, 'square'); break;
      default: break;
    }
  },
  // ---------------------------------------------------------------- music: a pentatonic tune on a plucked string, drums for a fight
  track: null, timer: null,
  play(name) {
    if (!ctx || this.track === name) return; this.track = name; clearInterval(this.timer); if (!name) return;
    const T = TRACKS[name]; let step = 0; const beat = 60 / T.bpm / 2; let next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => {
      if (!ctx) return; while (next < ctx.currentTime + 0.25) { this.stepMusic(T, step, next, beat); step++; next += beat; }
    }, 60);
  },
  pluck(t, f, g = 0.18, dur = 1.2) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), a = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.002; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur * 0.6);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.25; o.connect(a); o2.connect(g2); g2.connect(a); a.connect(fl); fl.connect(musicG); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  drum(t, kind) {
    if (kind === 'B') { const o = ctx.createOscillator(), a = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25); a.gain.setValueAtTime(0.5, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(a); a.connect(musicG); o.start(t); o.stop(t + 0.32); }
    else { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'S' ? 1800 : 6000; const a = ctx.createGain(); a.gain.setValueAtTime(kind === 'S' ? 0.25 : 0.06, t); a.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'S' ? 0.15 : 0.04)); s.connect(f); f.connect(a); a.connect(musicG); s.start(t, Math.random()); s.stop(t + 0.2); }
  },
  stepMusic(T, step, t, beat) {
    const n = T.mel[step % T.mel.length]; if (n != null && n !== '-') this.pluck(t, 220 * Math.pow(2, n / 12), 0.16, beat * 3.5);
    const b = T.bass[Math.floor(step / 2) % T.bass.length]; if (step % 2 === 0 && b != null) this.pluck(t, 55 * Math.pow(2, b / 12), 0.2, beat * 4);
    if (T.drums) { const d = T.drums[step % T.drums.length]; if (d !== '.') this.drum(t, d); }
  },
};
// scale degrees in semitones above A (pentatonic: 0 2 4 7 9 12 …)
const TRACKS = {
  town:  { bpm: 92, mel: [12, '-', 9, 7, 9, '-', 4, '-', 7, '-', 9, 12, 14, '-', 12, '-', 9, '-', 7, 4, 7, '-', 2, '-', 4, '-', 7, 9, 7, '-', '-', '-'], bass: [0, 0, 5, 5, 7, 7, 0, 0], drums: null },
  field: { bpm: 112, mel: [7, 9, 12, '-', 9, 7, 4, '-', 2, 4, 7, '-', 9, '-', 7, '-', 12, 14, 16, '-', 14, 12, 9, '-', 7, 9, 12, 9, 7, '-', 4, '-'], bass: [0, 7, 5, 7, 0, 7, 9, 7], drums: ['B', '.', 'h', '.', 'S', '.', 'h', 'h', 'B', 'B', 'h', '.', 'S', '.', 'h', '.'] },
  boss:  { bpm: 140, mel: [0, 3, 5, 7, 10, 7, 5, 3, 12, '-', 10, 7, 5, '-', 3, '-', 0, 3, 5, 7, 10, 12, 15, '-', 14, 12, 10, 7, 5, 7, 3, '-'], bass: [0, 0, -2, -2, -4, -4, -5, -2], drums: ['B', 'h', 'S', 'h', 'B', 'B', 'S', 'h', 'B', 'h', 'S', 'h', 'B', 'S', 'S', 'S'] },
  calm:  { bpm: 70, mel: [9, '-', '-', 7, 4, '-', '-', '-', 2, '-', 4, '-', 7, '-', '-', '-', 12, '-', '-', 9, 7, '-', '-', '-', 4, '-', 2, '-', 0, '-', '-', '-'], bass: [0, 0, 7, 7, 5, 5, 0, 0], drums: null },
};
