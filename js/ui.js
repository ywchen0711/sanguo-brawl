// Menus, dialogue, notices and the heads-up display, all in HTML over the canvas. A menu is a list driven by the
// arrow keys (or a tap); dialogue waits for a key. Every opened panel is a promise.
import { audio } from './audio.js?v=8';
const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export class UI {
  constructor() { this.stack = []; this.root = $('#ui'); this.toasts = $('#toasts'); this.dlg = $('#dialog'); }
  get busy() { return this.stack.length > 0; }
  // ---- a list to choose from. items: { n, sub, d, off, k, img } ; returns the chosen item's k (or null)
  choose(items, o = {}) {
    return new Promise((done) => {
      const el = document.createElement('div'); el.className = 'panel menu' + (o.cls ? ' ' + o.cls : '');
      let sel = Math.max(0, items.findIndex((it) => !it.off)); if (o.start != null) sel = o.start;
      const render = () => {
        el.innerHTML = (o.title ? `<div class="ptitle">${o.title}</div>` : '') + (o.head ? `<div class="phead">${o.head}</div>` : '') +
          `<div class="plist">${items.map((it, i) => `<div class="pit${i === sel ? ' on' : ''}${it.off ? ' off' : ''}" data-i="${i}">${it.img ? `<span class="pimg"></span>` : ''}<span class="pn">${it.n}</span>${it.sub != null ? `<span class="psub">${it.sub}</span>` : ''}</div>`).join('')}</div>` +
          `<div class="pdesc">${items[sel]?.d || ''}</div>` + (o.foot ? `<div class="pfoot">${o.foot}</div>` : '');
        items.forEach((it, i) => { if (it.img) el.querySelectorAll('.pit')[i].querySelector('.pimg').appendChild(it.img); });
        el.querySelectorAll('.pit').forEach((d) => { d.onclick = () => { const i = +d.dataset.i; if (items[i].off) return; if (sel !== i) { sel = i; render(); if (!o.tapOnce) return; } pick(); }; });
        const on = el.querySelector('.pit.on'); on?.scrollIntoView({ block: 'nearest' }); o.onMove?.(items[sel], el);
      };
      const pick = () => { const it = items[sel]; if (!it || it.off) { audio.sfx('nosp'); return; } audio.sfx('select'); close(it.k); };
      const close = (v) => { this.stack = this.stack.filter((s) => s !== handler); el.remove(); done(v); };
      const handler = { key: (k) => {
        if (k === 'up' || k === 'down') { const n = items.length; let i = sel; for (let c = 0; c < n; c++) { i = (i + (k === 'up' ? -1 : 1) + n) % n; if (!items[i].off || o.browse) break; } if (i !== sel) { sel = i; audio.sfx('move'); render(); } }
        else if (k === 'ok') pick();
        else if (k === 'back' && o.cancel !== false) { audio.sfx('back'); close(null); }
        else if (k === 'left' || k === 'right') { if (o.onSide) { o.onSide(items[sel], k); render(); } }
      }, el };
      this.stack.push(handler); this.root.appendChild(el); render();
      this.refresh = render;
    });
  }
  // ---- dialogue: speaker, words (\n for a new box), an optional portrait canvas
  async say(name, text, face) {
    for (const part of String(text).split('\n\n')) await new Promise((done) => {
      const el = this.dlg; el.innerHTML = `${face ? '<div class="dface"></div>' : ''}<div class="dbody">${name ? `<div class="dname">${esc(name)}</div>` : ''}<div class="dtext"></div><div class="dnext">▼</div></div>`; el.classList.add('on');
      if (face) el.querySelector('.dface').appendChild(face);
      const tx = el.querySelector('.dtext'), full = esc(part).replace(/\n/g, '<br>'); let i = 0, shown = false;
      const tick = setInterval(() => { i += 2; tx.innerHTML = full.slice(0, i); if (i >= full.length) { clearInterval(tick); shown = true; } }, 22);
      const handler = { key: (k) => { if (k !== 'ok' && k !== 'back') return; if (!shown) { clearInterval(tick); tx.innerHTML = full; shown = true; return; } this.stack = this.stack.filter((s) => s !== handler); el.classList.remove('on'); done(); } };
      el.onclick = () => handler.key('ok');
      this.stack.push(handler);
    });
  }
  async ask(name, text, items, face) { await this.sayOpen(name, text, face); const k = await this.choose(items, { cls: 'askm', cancel: items.some((i) => i.k == null) }); this.dlg.classList.remove('on'); return k; }
  sayOpen(name, text, face) { const el = this.dlg; el.innerHTML = `${face ? '<div class="dface"></div>' : ''}<div class="dbody">${name ? `<div class="dname">${esc(name)}</div>` : ''}<div class="dtext">${esc(text).replace(/\n/g, '<br>')}</div></div>`; if (face) el.querySelector('.dface').appendChild(face); el.classList.add('on'); }
  toast(html, ms = 2600) { const e = document.createElement('div'); e.className = 'toast'; e.innerHTML = html; this.toasts.appendChild(e); setTimeout(() => e.classList.add('out'), ms); setTimeout(() => e.remove(), ms + 500); }
  banner(html, ms = 2400) { const e = document.createElement('div'); e.className = 'banner'; e.innerHTML = html; document.body.appendChild(e); setTimeout(() => e.classList.add('out'), ms); setTimeout(() => e.remove(), ms + 700); }
  key(k) { const h = this.stack[this.stack.length - 1]; if (h) { h.key(k); return true; } return false; }
  // a full panel of text (help, status) that closes on any key
  sheet(html, cls = '') {
    return new Promise((done) => { const el = document.createElement('div'); el.className = 'panel sheet ' + cls; el.innerHTML = html + '<div class="pfoot">按任意鍵返回</div>'; this.root.appendChild(el); const handler = { key: (k) => { if (['ok', 'back'].includes(k)) { this.stack = this.stack.filter((s) => s !== handler); el.remove(); audio.sfx('back'); done(); } } }; el.onclick = () => handler.key('ok'); this.stack.push(handler); });
  }
  fade(on, ms = 350) { const f = $('#fade'); f.style.transition = `opacity ${ms}ms`; f.style.opacity = on ? 1 : 0; return new Promise((r) => setTimeout(r, ms)); }
}
