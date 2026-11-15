// Window manager: windows on desktop, sheets on phones.
import { g } from './glyphs.js';
import { Sound } from './audio.js';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const MENU_H = 30, DOCK_SPACE = 96, PAD = 8;

const listeners = new Set();
const wins = new Map(); // id -> record
let resolver = () => null;
let zTop = 100;
let layer = null, sheetLayer = null, mobileQuery = null;
let cascade = 0;

const isMobile = () => mobileQuery.matches;
const emit = () => listeners.forEach(f => f(WM.state()));

function originRect(origin) {
  if (!origin) return null;
  if (origin instanceof Element) return origin.getBoundingClientRect();
  return origin;
}

function dockRectFor(id) {
  const key = id.startsWith('project:') ? 'work' : id;
  const el = document.querySelector(`.dock [data-app="${key}"] .dock__icon`);
  return el ? el.getBoundingClientRect() : null;
}

function fromRectTransform(o, f) {
  const s = Math.max(0.08, Math.min(o.width / f.width, o.height / f.height));
  const dx = (o.left + o.width / 2) - (f.left + f.width / 2);
  const dy = (o.top + o.height / 2) - (f.top + f.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

function deskRect() {
  return { top: MENU_H + PAD, left: PAD, width: innerWidth - PAD * 2, height: innerHeight - MENU_H - PAD - DOCK_SPACE };
}

function applyRect(rec) {
  const { el, r } = rec;
  el.style.left = r.x + 'px'; el.style.top = r.y + 'px';
  el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
}

function clampRect(r) {
  r.y = Math.max(MENU_H + 2, Math.min(r.y, innerHeight - 44));
  r.x = Math.max(-r.w + 120, Math.min(r.x, innerWidth - 120));
  return r;
}

function setHash(id) {
  const map = (i) => i.startsWith('project:') ? '#/work/' + i.slice(8) : '#/' + i;
  const url = id ? map(id) : location.pathname + location.search;
  try { history.replaceState(null, '', url); } catch { /* sandboxed */ }
}

function topWindow() {
  let best = null;
  wins.forEach(rec => { if (!rec.minimized && (!best || rec.z > best.z)) best = rec; });
  return best;
}

function buildChrome(id, def, mobile) {
  const el = document.createElement('section');
  el.className = (mobile ? 'sheet ' : 'win ') + (def.cls || '');
  el.dataset.id = id;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', def.title);
  el.tabIndex = -1;
  el.dataset.layer = mobile ? 'Sheet / ' + def.title : 'Window / ' + def.title;
  if (mobile) {
    el.innerHTML = `
      <header class="sheet__bar" data-layer="Sheet / Nav bar">
        <button class="sheet__back" type="button" aria-label="Back to home">${g('chevron-left', 20)}<span>Home</span></button>
        <div class="sheet__title"><span class="win__icon">${def.icon()}</span><span class="win__name">${def.title}</span></div>
        <div class="win__tools"></div>
      </header>
      <div class="win__body"></div>
      <div class="sheet__indicator" aria-hidden="true"></div>`;
  } else {
    el.innerHTML = `
      <header class="win__bar" data-layer="Window / Title bar">
        <div class="lights" data-layer="Traffic lights">
          <button class="light light--close" type="button" aria-label="Close ${def.title}">${g('x', 8)}</button>
          <button class="light light--min" type="button" aria-label="Minimise ${def.title}">${g('minus', 8)}</button>
          <button class="light light--max" type="button" aria-label="Zoom ${def.title}">${g('maximize-2', 7)}</button>
        </div>
        <div class="win__title"><span class="win__icon">${def.icon()}</span><span class="win__name">${def.title}</span></div>
        <div class="win__tools"></div>
      </header>
      <div class="win__body"></div>
      ${def.resizable === false ? '' : '<span class="rz rz--e" data-rz="e"></span><span class="rz rz--s" data-rz="s"></span><span class="rz rz--w" data-rz="w"></span><span class="rz rz--se" data-rz="se"></span><span class="rz rz--sw" data-rz="sw"></span>'}`;
  }
  return el;
}

function attachDrag(rec) {
  const { el } = rec;
  const bar = el.querySelector('.win__bar');
  const ghost = document.querySelector('.snap-ghost');
  let start = null, snap = null;

  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button, input, a, .win__tools')) return;
    WM.focus(rec.id);
    start = { px: e.clientX, py: e.clientY, x: rec.r.x, y: rec.r.y, moved: false };
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.px, dy = e.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 3) return;
    if (!start.moved) {
      start.moved = true; el.classList.add('is-dragging');
      if (rec.max) { // pull a maximised window back to its old size, under the pointer
        const prev = rec.prev || { w: 900, h: 600 };
        const ratio = (e.clientX - rec.r.x) / rec.r.w;
        rec.r = { x: e.clientX - prev.w * ratio, y: rec.r.y, w: prev.w, h: prev.h };
        start.x = rec.r.x; start.y = rec.r.y; start.px = e.clientX; start.py = e.clientY;
        rec.max = false; el.classList.remove('is-max');
      }
    }
    rec.r.x = start.x + (e.clientX - start.px); rec.r.y = start.y + (e.clientY - start.py);
    clampRect(rec.r); applyRect(rec);
    // edge snapping
    const d = deskRect();
    let next = null;
    if (e.clientY <= MENU_H + 2) next = { ...d };
    else if (e.clientX <= 3) next = { top: d.top, left: d.left, width: d.width / 2 - 4, height: d.height };
    else if (e.clientX >= innerWidth - 4) next = { top: d.top, left: d.left + d.width / 2 + 4, width: d.width / 2 - 4, height: d.height };
    if (JSON.stringify(next) !== JSON.stringify(snap)) {
      snap = next;
      if (snap) { Object.assign(ghost.style, { left: snap.left + 'px', top: snap.top + 'px', width: snap.width + 'px', height: snap.height + 'px' }); ghost.classList.add('is-on'); }
      else ghost.classList.remove('is-on');
    }
  });
  const end = () => {
    if (!start) return;
    el.classList.remove('is-dragging');
    if (snap) {
      rec.prev = { ...rec.r };
      animateTo(rec, { x: snap.left, y: snap.top, w: snap.width, h: snap.height });
      rec.max = snap.width >= deskRect().width - 1; el.classList.toggle('is-max', rec.max);
    }
    ghost.classList.remove('is-on'); snap = null; start = null;
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button, input, .win__tools')) WM.toggleMax(rec.id); });

  // resize
  el.querySelectorAll('.rz').forEach(h => {
    let s = null;
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); WM.focus(rec.id);
      s = { px: e.clientX, py: e.clientY, ...rec.r }; h.setPointerCapture(e.pointerId); el.classList.add('is-resizing');
    });
    h.addEventListener('pointermove', (e) => {
      if (!s) return;
      const dir = h.dataset.rz, dx = e.clientX - s.px, dy = e.clientY - s.py;
      const minW = rec.def.minW || 380, minH = rec.def.minH || 260;
      if (dir.includes('e')) rec.r.w = Math.max(minW, s.w + dx);
      if (dir.includes('s')) rec.r.h = Math.max(minH, Math.min(s.h + dy, innerHeight - s.y - 4));
      if (dir.includes('w')) { const w = Math.max(minW, s.w - dx); rec.r.x = s.x + (s.w - w); rec.r.w = w; }
      rec.max = false; el.classList.remove('is-max');
      applyRect(rec);
    });
    const done = () => { s = null; el.classList.remove('is-resizing'); };
    h.addEventListener('pointerup', done); h.addEventListener('pointercancel', done);
  });

  el.querySelector('.light--close').addEventListener('click', () => WM.close(rec.id));
  el.querySelector('.light--min').addEventListener('click', () => WM.minimize(rec.id));
  el.querySelector('.light--max').addEventListener('click', () => WM.toggleMax(rec.id));
}

function animateTo(rec, r) {
  const { el } = rec;
  if (reduce()) { rec.r = r; applyRect(rec); return; }
  el.classList.add('is-tweening');
  rec.r = r; applyRect(rec);
  clearTimeout(rec.tw); rec.tw = setTimeout(() => el.classList.remove('is-tweening'), 340);
}

export const WM = {
  init({ windowLayer, sheets, resolve, mobile }) {
    layer = windowLayer; sheetLayer = sheets; resolver = resolve; mobileQuery = mobile;
    mobileQuery.addEventListener('change', () => { [...wins.keys()].forEach(id => WM.close(id, { instant: true })); });
    addEventListener('resize', () => {
      wins.forEach(rec => {
        if (rec.mobile) return;
        if (rec.max) { const d = deskRect(); rec.r = { x: d.left, y: d.top, w: d.width, h: d.height }; }
        else { rec.r.w = Math.min(rec.r.w, innerWidth - PAD * 2); rec.r.h = Math.min(rec.r.h, innerHeight - MENU_H - PAD * 2); clampRect(rec.r); }
        applyRect(rec);
      });
    });
  },
  onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  state() {
    const top = topWindow();
    return { open: [...wins.keys()], minimized: [...wins.values()].filter(r => r.minimized).map(r => r.id), focused: top ? top.id : null, focusedTitle: top ? top.def.menu || top.def.title : null };
  },
  isOpen: (id) => wins.has(id),
  get: (id) => wins.get(id),

  open(id, opts = {}) {
    const existing = wins.get(id);
    if (existing) {
      if (existing.minimized) WM.restore(id); else WM.focus(id);
      if (opts.onOpen) opts.onOpen(existing);
      return existing;
    }
    const def = resolver(id, opts.appOpts);
    if (!def) return null;
    const mobile = isMobile();
    const el = buildChrome(id, def, mobile);
    const rec = { id, def, el, mobile, r: null, z: ++zTop, minimized: false, max: false, cleanup: null };
    wins.set(id, rec);
    el.style.zIndex = rec.z;

    const body = el.querySelector('.win__body');
    const tools = el.querySelector('.win__tools');
    const ctx = {
      id, el, body, tools,
      close: () => WM.close(id),
      setTitle: (t) => { el.querySelector('.win__name').textContent = t; el.setAttribute('aria-label', t); },
      open: (otherId, o) => WM.open(otherId, o),
    };

    if (mobile) {
      sheetLayer.appendChild(el);
      el.querySelector('.sheet__back').addEventListener('click', () => WM.close(id));
      // swipe down on the nav bar to dismiss
      const bar = el.querySelector('.sheet__bar'); let sy = null;
      bar.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) { sy = e.clientY; bar.setPointerCapture(e.pointerId); } });
      bar.addEventListener('pointermove', (e) => { if (sy !== null) { const d = Math.max(0, e.clientY - sy); el.style.transform = `translateY(${d}px)`; } });
      bar.addEventListener('pointerup', (e) => { if (sy === null) return; const d = e.clientY - sy; sy = null; el.style.transform = ''; if (d > 110) WM.close(id); });
    } else {
      const d = deskRect();
      const w = Math.min(def.w || 860, d.width), h = Math.min(def.h || 600, d.height);
      const off = (cascade++ % 6) * 26;
      const at = opts.appOpts && opts.appOpts.at;
      if (at) { cascade--; rec.r = clampRect({ x: at.left, y: at.top, w: at.width, h: at.height }); }
      else {
        const x = Math.round(d.left + (d.width - w) / 2 + off - 52), y = Math.round(d.top + Math.max(0, (d.height - h) / 2 - 10) + off * .6);
        const yy = Math.max(d.top, Math.min(y, d.top + d.height - h));
        rec.r = clampRect({ x: Math.max(d.left, Math.min(x, d.left + d.width - w)), y: yy, w, h });
      }
      applyRect(rec);
      layer.appendChild(el);
      attachDrag(rec);
      el.addEventListener('pointerdown', () => WM.focus(id), true);
    }

    rec.cleanup = def.render(ctx) || null;
    if (opts.onOpen) opts.onOpen(rec);

    // entrance
    const o = originRect(opts.origin);
    const f = el.getBoundingClientRect();
    if (reduce()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140 });
    else if (o) el.animate([{ transform: fromRectTransform(o, f), opacity: 0, borderRadius: '22px' }, { transform: 'none', opacity: 1 }], { duration: mobile ? 420 : 480, easing: EASE });
    else el.animate([{ transform: mobile ? 'translateY(40px)' : 'scale(.96) translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE });
    Sound.play('open');
    WM.focus(id);
    requestAnimationFrame(() => el.focus({ preventScroll: true }));
    return rec;
  },

  focus(id) {
    const rec = wins.get(id); if (!rec) return;
    if (rec.z !== zTop) { rec.z = ++zTop; rec.el.style.zIndex = rec.z; }
    wins.forEach(r => r.el.classList.toggle('is-active', r === rec));
    setHash(id);
    emit();
  },

  close(id, { instant = false } = {}) {
    const rec = wins.get(id); if (!rec) return;
    wins.delete(id);
    if (typeof rec.cleanup === 'function') rec.cleanup();
    const finish = () => { rec.el.remove(); };
    if (instant || reduce()) finish();
    else {
      const a = rec.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: rec.mobile ? 'translateY(60px)' : 'scale(.965)' }], { duration: rec.mobile ? 260 : 180, easing: EASE, fill: 'forwards' });
      a.onfinish = finish;
      Sound.play('close');
    }
    const top = topWindow();
    if (top) WM.focus(top.id); else { setHash(null); emit(); }
  },

  closeTop() { const t = topWindow(); if (t) WM.close(t.id); },

  minimize(id) {
    const rec = wins.get(id); if (!rec || rec.mobile || rec.minimized) return;
    rec.minimized = true;
    const to = dockRectFor(id);
    const f = rec.el.getBoundingClientRect();
    const done = () => { rec.el.style.visibility = 'hidden'; rec.el.classList.add('is-min'); };
    if (to && !reduce()) {
      const a = rec.el.animate([{ transform: 'none', opacity: 1 }, { transform: fromRectTransform(to, f), opacity: .2 }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      a.onfinish = () => { done(); a.cancel(); };
    } else done();
    Sound.play('close');
    const top = topWindow();
    wins.forEach(r => r.el.classList.toggle('is-active', r === top));
    if (top) setHash(top.id); else setHash(null);
    emit();
  },

  restore(id) {
    const rec = wins.get(id); if (!rec || !rec.minimized) return;
    rec.minimized = false; rec.el.style.visibility = ''; rec.el.classList.remove('is-min');
    const from = dockRectFor(id);
    if (from && !reduce()) rec.el.animate([{ transform: fromRectTransform(from, rec.el.getBoundingClientRect()), opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE });
    Sound.play('open');
    WM.focus(id);
  },

  toggleMax(id) {
    const rec = wins.get(id); if (!rec || rec.mobile) return;
    if (rec.max) { animateTo(rec, rec.prev || { x: 120, y: 80, w: 860, h: 600 }); rec.max = false; }
    else { rec.prev = { ...rec.r }; const d = deskRect(); animateTo(rec, { x: d.left, y: d.top, w: d.width, h: d.height }); rec.max = true; }
    rec.el.classList.toggle('is-max', rec.max);
  },
};
