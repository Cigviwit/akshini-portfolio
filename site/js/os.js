// AkshiniOS — the shell: boot, menu bar, desktop, dock, spotlight, inspect, phone home screen.
import { PERSON, PROJECTS } from './data.js';
import { ICONS, STAR, folderIcon } from './icons.js';
import { g } from './glyphs.js';
import { WM } from './wm.js';
import { createApps } from './apps.js';
import { mountWallpaper, WALLPAPERS } from './wallpaper.js';
import { Sound, Radio } from './audio.js';
import { notify, copyText } from './ui.js';
import { playHello } from './hello.js';
import { createPresence } from './presence.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQ = matchMedia('(max-width: 760px)');
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('aos.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('aos.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const typing = () => { const a = document.activeElement; return a && (a.matches('input, textarea, select') || a.isContentEditable); };

// ---------------- theme & wallpaper ----------------
const wall = mountWallpaper($('.wall__gl'), $('.wall__fallback'));
let wallChoice = store.get('wall', null);
function setTheme(t) {
  root.dataset.theme = t;
  try { localStorage.setItem('aos.theme', t); } catch { /* */ }
  $('meta[name=theme-color]').content = t === 'dark' ? '#15110E' : '#F3EEE6';
  if (!wallChoice) wall.set(t === 'dark' ? 'dusk' : 'chai');
  Sound.play('click');
  refreshMenus();
}
function setWallpaper(id) {
  wallChoice = id; store.set('wall', id); wall.set(id);
  if (WALLPAPERS[id].dark !== (root.dataset.theme === 'dark')) { root.dataset.theme = WALLPAPERS[id].dark ? 'dark' : 'light'; try { localStorage.setItem('aos.theme', root.dataset.theme); } catch { /* */ } }
  refreshMenus();
}
wall.set(wallChoice || (root.dataset.theme === 'dark' ? 'dusk' : 'chai'), true);

// ---------------- apps & window manager ----------------
const sys = {
  open: (id, origin, appOpts) => { closeMenus(); return WM.open(id, { origin, appOpts }); },
  setTheme, setWallpaper,
  toggleInspect: () => toggleInspect(),
};
const { APPS, resolve } = createApps(sys);
WM.init({ windowLayer: $('#windows'), sheets: $('.sheets'), resolve, mobile: mobileQ });

// ---------------- menu bar ----------------
$('.mb--logo').innerHTML = STAR(14);
$('[data-action=inspect]').innerHTML = g('scan', 15);
$('[data-action=spotlight]').innerHTML = g('search', 15);
$('[data-menu=cc]').innerHTML = g('sliders-horizontal', 15);

const fmtClock = () => new Date().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', '');
const puneParts = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: PERSON.tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { h: +p.hour % 24, m: +p.minute, s: +p.second };
};
const nowLine = (h) => {
  if (h < 6) return 'Probably asleep, dreaming in 8pt grids.';
  if (h < 9) return 'First cup of adrak chai. Inbox next.';
  if (h < 13) return 'In class or deep in a Figma file.';
  if (h < 14) return 'Lunch, then back to the wireframes.';
  if (h < 18) return 'Prototyping, testing, iterating.';
  if (h < 21) return 'Second chai. Sketching new ideas.';
  return 'Reading fiction, or kerning things.';
};
const ticks = $('.aclock__ticks');
ticks.innerHTML = Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="${i % 3 ? 9 : 8}" x2="50" y2="${i % 3 ? 12 : 14}" transform="rotate(${i * 30} 50 50)"/>`).join('');
function tick() {
  $('.mb--clock').textContent = fmtClock();
  const { h, m, s } = puneParts();
  $('.aclock__h').setAttribute('transform', `rotate(${(h % 12) * 30 + m * .5} 50 50)`);
  $('.aclock__m').setAttribute('transform', `rotate(${m * 6 + s * .1} 50 50)`);
  $('.aclock__s').setAttribute('transform', `rotate(${s * 6} 50 50)`);
  $('.clock-pune').textContent = new Date().toLocaleTimeString('en-GB', { timeZone: PERSON.tz, hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
  $('.widget__now').textContent = nowLine(h);
  $('.sbar__time').textContent = new Date().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: false });
}
tick(); setInterval(tick, 1000);
$('.sbar__icons').innerHTML = g('wifi', 15) + g('battery-full', 20);

// ---------------- menus ----------------
const menus = $('.menus');
let openMenu = null;
const go = (id) => () => sys.open(id);
const extLink = (u) => () => window.open(u, '_blank', 'noopener');
function menuDef(key) {
  const st = WM.state();
  const dark = root.dataset.theme === 'dark';
  const cur = wall.get();
  switch (key) {
    case 'logo': return [
      { label: 'About This OS', act: go('aboutos') },
      '-',
      { label: 'System Settings…', act: go('skills') },
      { label: 'Recent Items', sub: PROJECTS.map(p => ({ label: p.name, act: go('project:' + p.id) })) },
      '-',
      { label: 'Lock Screen', key: `${MOD} L`, act: lock },
      { label: 'Restart…', act: restart },
    ];
    case 'app': return [
      { label: `About ${st.focusedTitle || 'Finder'}`, act: go(st.focused && !st.focused.startsWith('project:') ? 'aboutos' : 'about') },
      '-',
      { label: `Quit ${st.focusedTitle || 'Finder'}`, key: 'Esc', act: () => WM.closeTop(), disabled: !st.focused },
    ];
    case 'file': return [
      { label: 'New Sticky Note', act: () => addSticky() },
      { label: 'New Message', act: go('contact') },
      { label: 'Open Résumé', act: go('resume') },
      '-',
      { label: 'Close Window', key: 'Esc', act: () => WM.closeTop(), disabled: !st.focused },
    ];
    case 'view': return [
      { label: 'Light', check: !dark, act: () => setTheme('light') },
      { label: 'Dark', check: dark, act: () => setTheme('dark') },
      '-',
      ...Object.entries(WALLPAPERS).map(([id, w]) => ({ label: `${w.name} wallpaper`, check: cur === w, act: () => setWallpaper(id) })),
      '-',
      { label: 'Inspect Mode', key: 'I', check: root.classList.contains('is-inspect'), act: toggleInspect },
      { label: 'Clean Up Desktop', act: cleanUp },
    ];
    case 'go': return [
      { label: 'Work', act: go('work') },
      { label: 'About', act: go('about') },
      { label: 'Skills', act: go('skills') },
      { label: 'Process', act: go('process') },
      { label: 'Experience', act: go('experience') },
      { label: 'Résumé', act: go('resume') },
      { label: 'Terminal', act: go('terminal') },
      '-',
      { label: 'LinkedIn ↗', act: extLink(PERSON.linkedin) },
      { label: 'Behance ↗', act: extLink(PERSON.behance) },
    ];
    case 'help': return [
      { label: 'Read Me', act: go('readme') },
      { label: 'Take the Tour', act: () => presence.follow() },
      { label: 'Search…', key: `${MOD} K`, act: openSpotlight },
    ];
    default: return [];
  }
}
function renderMenuList(items) {
  return `<div class="menu" role="menu">${items.map((it, i) => it === '-' ? '<div class="menu__sep" role="separator"></div>' :
    `<button class="menu__i${it.sub ? ' has-sub' : ''}" type="button" role="menuitem" data-i="${i}" ${it.disabled ? 'disabled' : ''}>
      <span class="menu__check">${it.check ? g('check', 13) : ''}</span><span class="menu__l">${it.label}</span>${it.key ? `<span class="menu__k">${it.key}</span>` : ''}${it.sub ? g('chevron-right', 13, 'menu__arrow') : ''}
      ${it.sub ? renderMenuList(it.sub).replace('class="menu"', 'class="menu menu--sub"') : ''}
    </button>`).join('')}</div>`;
}
function showMenu(key, btn) {
  closeMenus(true);
  openMenu = key;
  btn.classList.add('is-open');
  if (key === 'cc') { showCC(btn); return; }
  const items = menuDef(key);
  menus.innerHTML = renderMenuList(items);
  const m = $('.menu', menus);
  const r = btn.getBoundingClientRect();
  m.style.left = Math.min(r.left, innerWidth - 260) + 'px'; m.style.top = '30px';
  m.addEventListener('click', (e) => {
    const b = e.target.closest('.menu__i'); if (!b || b.disabled) return;
    const sub = b.closest('.menu--sub');
    let it;
    if (sub) { const parent = sub.closest('.has-sub'); it = items[+parent.dataset.i].sub[+b.dataset.i]; }
    else { it = items[+b.dataset.i]; if (it.sub) return; }
    closeMenus(); it.act && it.act(); Sound.play('click');
  });
}
function closeMenus(keep) {
  menus.innerHTML = ''; $$('.menubar .is-open').forEach(b => b.classList.remove('is-open'));
  openMenu = null;
  if (!keep) closeCtx();
}
function refreshMenus() {
  if (!openMenu) return;
  const btn = $(`.menubar [data-menu="${openMenu}"]`); if (btn) showMenu(openMenu, btn);
}
$('.menubar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-menu]');
  if (b) { e.stopPropagation(); if (openMenu === b.dataset.menu) closeMenus(); else showMenu(b.dataset.menu, b); return; }
  const a = e.target.closest('[data-action]');
  if (a?.dataset.action === 'inspect') toggleInspect();
  if (a?.dataset.action === 'spotlight') openSpotlight();
});
$('.menubar').addEventListener('pointerover', (e) => {
  const b = e.target.closest('[data-menu]');
  if (b && openMenu && openMenu !== b.dataset.menu && b.dataset.menu !== 'cc' && openMenu !== 'cc') showMenu(b.dataset.menu, b);
});
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.menus, .menubar [data-menu], .ctx')) closeMenus();
});
WM.onChange((st) => {
  $('.mb__appname').textContent = st.focusedTitle || 'Finder';
  $$('.dock__item').forEach(d => {
    const id = d.dataset.app;
    const running = st.open.some(o => o === id || (id === 'work' && o.startsWith('project:')));
    d.classList.toggle('is-running', running);
  });
});

// ---------------- control centre ----------------
function showCC(btn) {
  const dark = root.dataset.theme === 'dark', insp = root.classList.contains('is-inspect');
  menus.innerHTML = `
    <div class="cc" data-layer="Control Centre">
      <div class="cc__tile cc__tile--wide">
        <p class="cc__k">Appearance</p>
        <div class="seg seg--full" role="group" aria-label="Appearance">
          <button type="button" class="seg__b ${!dark ? 'is-on' : ''}" data-cc="light">${g('sun', 15)}Light</button>
          <button type="button" class="seg__b ${dark ? 'is-on' : ''}" data-cc="dark">${g('moon', 15)}Dark</button>
        </div>
      </div>
      <button type="button" class="cc__tile cc__toggle ${insp ? 'is-on' : ''}" data-cc="inspect"><span class="cc__ic">${g('scan', 16)}</span><span><strong>Inspect</strong><small>${insp ? 'On' : 'Off'} · press I</small></span></button>
      <button type="button" class="cc__tile cc__toggle ${Sound.on ? 'is-on' : ''}" data-cc="sound"><span class="cc__ic">${g(Sound.on ? 'volume-2' : 'volume-x', 16)}</span><span><strong>UI sounds</strong><small>${Sound.on ? 'On' : 'Off'}</small></span></button>
      <div class="cc__tile cc__tile--wide">
        <p class="cc__k">Wallpaper</p>
        <div class="swatches">${Object.entries(WALLPAPERS).map(([id, w]) => `<button type="button" class="swatch ${wall.get() === w ? 'is-on' : ''}" data-cc="wall" data-w="${id}" style="background:${w.css}" aria-label="${w.name} wallpaper"><span>${w.name}</span></button>`).join('')}</div>
      </div>
      <div class="cc__tile cc__tile--wide cc__now">
        <span class="cc__art">${ICONS.radio()}</span>
        <span><strong>Chai & Rain</strong><small>Generative ambient</small></span>
        <button type="button" class="cc__play" data-cc="radio" aria-label="${Radio.playing ? 'Pause' : 'Play'} radio">${g(Radio.playing ? 'pause' : 'play', 18)}</button>
      </div>
    </div>`;
  const cc = $('.cc', menus);
  cc.style.right = '8px'; cc.style.top = '34px';
  cc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cc]'); if (!b) return;
    const k = b.dataset.cc;
    if (k === 'light' || k === 'dark') setTheme(k);
    if (k === 'inspect') { closeMenus(); toggleInspect(); return; }
    if (k === 'sound') { Sound.on = !Sound.on; store.set('uisound', Sound.on); Sound.play('pop'); }
    if (k === 'wall') setWallpaper(b.dataset.w);
    if (k === 'radio') Radio.toggle();
    showCC(btn);
  });
  btn.classList.add('is-open');
}
Sound.on = store.get('uisound', true);
// sounds are on by default; the first click or key unlocks audio
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => Sound.unlock(), { once: true, capture: true }));

// ---------------- dock ----------------
const DOCK = ['work', 'about', 'skills', 'process', 'experience', 'resume', 'contact', '|', 'terminal', 'radio', '|', 'trash'];
const tray = $('.dock__tray');
tray.innerHTML = DOCK.map(id => id === '|' ? '<span class="dock__sep" aria-hidden="true"></span>' : `
  <button class="dock__item" type="button" data-app="${id}" aria-label="${APPS[id].title}">
    <span class="dock__tip">${id === 'work' ? 'Work' : id === 'resume' ? 'Résumé' : id === 'contact' ? 'Mail' : APPS[id].title.replace(' — akshini@os', '')}</span>
    <span class="dock__icon">${APPS[id].icon()}</span>
    <span class="dock__dot"></span>
  </button>`).join('');
tray.addEventListener('click', (e) => {
  const b = e.target.closest('.dock__item'); if (!b) return;
  const id = b.dataset.app;
  if (id === 'work' && !WM.isOpen('work')) {
    const minProj = WM.state().minimized.filter(m => m.startsWith('project:')).pop();
    if (minProj) { WM.restore(minProj); return; }
  }
  if (!WM.isOpen(id) && !reduceMotion) b.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 620, easing: 'ease-out' });
  sys.open(id, b.querySelector('.dock__icon'));
});
if (!reduceMotion) {
  const items = () => $$('.dock__item', tray);
  tray.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    items().forEach(it => {
      const r = it.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = Math.max(0, 1 - d / 150);
      it.style.setProperty('--mag', (1 + 0.5 * k * k * (3 - 2 * k)).toFixed(3));
    });
    tray.classList.add('is-mag');
  });
  tray.addEventListener('pointerleave', () => { tray.classList.remove('is-mag'); items().forEach(it => it.style.setProperty('--mag', 1)); });
}

// ---------------- desktop icons ----------------
const ICON_ITEMS = [
  ...PROJECTS.map(p => ({ id: 'project:' + p.id, label: p.name, icon: folderIcon(p) })),
  { id: 'resume', label: 'Résumé.pdf', icon: ICONS.pdf() },
  { id: 'readme', label: 'Read Me.txt', icon: ICONS.readme() },
];
const iconsEl = $('.icons');
const desk = $('#desk');
let iconPos = store.get('icons', {});
function defaultPos(i) {
  const w = desk.clientWidth, h = desk.clientHeight;
  const perCol = Math.max(3, Math.floor((h - 150) / 108));
  const col = Math.floor(i / perCol), row = i % perCol;
  return { x: w - 112 - col * 104, y: 22 + row * 108 };
}
function placeIcons(animate) {
  $$('.dicon', iconsEl).forEach((el, i) => {
    const p = iconPos[el.dataset.item] || defaultPos(i);
    const x = Math.max(0, Math.min(p.x, desk.clientWidth - 96)), y = Math.max(0, Math.min(p.y, desk.clientHeight - 110));
    if (animate && !reduceMotion) el.animate([{ left: el.style.left, top: el.style.top }, { left: x + 'px', top: y + 'px' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    el.style.left = x + 'px'; el.style.top = y + 'px';
  });
}
iconsEl.innerHTML = ICON_ITEMS.map(it => `
  <button class="dicon" type="button" role="listitem" data-item="${it.id}" data-layer="Desktop icon / ${it.label}">
    <span class="dicon__img">${it.icon}</span><span class="dicon__label">${it.label}</span>
  </button>`).join('');
placeIcons();
addEventListener('resize', () => placeIcons());
function cleanUp() { iconPos = {}; store.set('icons', iconPos); placeIcons(true); }
let hintShown = store.get('dblhint', false);
(() => {
  let drag = null;
  iconsEl.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.dicon'); if (!el || e.button !== 0) return;
    if (!e.shiftKey && !el.classList.contains('is-sel')) $$('.dicon.is-sel').forEach(x => x.classList.remove('is-sel'));
    el.classList.add('is-sel');
    const sel = $$('.dicon.is-sel');
    drag = { px: e.clientX, py: e.clientY, moved: false, touch: e.pointerType !== 'mouse', el, start: sel.map(s => ({ s, x: parseFloat(s.style.left), y: parseFloat(s.style.top) })) };
    el.setPointerCapture(e.pointerId);
  });
  iconsEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    drag.start.forEach(({ s, x, y }) => { s.style.left = x + dx + 'px'; s.style.top = y + dy + 'px'; s.classList.add('is-drag'); });
  });
  iconsEl.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.moved) {
      drag.start.forEach(({ s }) => { s.classList.remove('is-drag'); iconPos[s.dataset.item] = { x: parseFloat(s.style.left), y: parseFloat(s.style.top) }; });
      store.set('icons', iconPos); placeIcons();
    } else if (drag.touch) {
      sys.open(drag.el.dataset.item, drag.el.querySelector('.dicon__img'));
    } else if (!hintShown) {
      const el = drag.el;
      clearTimeout(el._hint);
      el._hint = setTimeout(() => { if (!WM.isOpen(el.dataset.item)) { showHint(el, 'Double-click to open'); } }, 520);
    }
    drag = null;
  });
  iconsEl.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.dicon'); if (!el) return;
    clearTimeout(el._hint); hideHint();
    hintShown = true; store.set('dblhint', true);
    sys.open(el.dataset.item, el.querySelector('.dicon__img'));
  });
  iconsEl.addEventListener('keydown', (e) => {
    const el = e.target.closest('.dicon'); if (el && e.key === 'Enter') { e.preventDefault(); sys.open(el.dataset.item, el.querySelector('.dicon__img')); }
  });
})();
let hintEl = null;
function showHint(el, text) {
  hideHint();
  hintEl = document.createElement('div'); hintEl.className = 'hint'; hintEl.textContent = text;
  const r = el.getBoundingClientRect();
  hintEl.style.left = r.left + r.width / 2 + 'px'; hintEl.style.top = r.bottom + 6 + 'px';
  document.body.appendChild(hintEl);
  setTimeout(hideHint, 2200);
}
function hideHint() { hintEl?.remove(); hintEl = null; }

// rubber-band selection on the desktop
(() => {
  let band = null, s = null;
  desk.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.dicon, .hero, .widget, .dsticky, button, a')) return;
    $$('.dicon.is-sel').forEach(x => x.classList.remove('is-sel'));
    s = { x: e.clientX, y: e.clientY };
    band = document.createElement('div'); band.className = 'band'; document.body.appendChild(band);
    desk.setPointerCapture(e.pointerId);
  });
  desk.addEventListener('pointermove', (e) => {
    if (!band) return;
    const l = Math.min(s.x, e.clientX), t = Math.min(s.y, e.clientY), w = Math.abs(e.clientX - s.x), h = Math.abs(e.clientY - s.y);
    Object.assign(band.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
    $$('.dicon').forEach(ic => { const r = ic.getBoundingClientRect(); ic.classList.toggle('is-sel', r.right > l && r.left < l + w && r.bottom > t && r.top < t + h); });
  });
  const end = () => { band?.remove(); band = null; };
  desk.addEventListener('pointerup', end); desk.addEventListener('pointercancel', end);
})();

// ---------------- hero & widget buttons ----------------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open-app]');
  if (b) sys.open(b.dataset.openApp, b);
});
$('.hero__star').innerHTML = STAR(12);
const radioWidget = $('.widget--radio');
radioWidget.addEventListener('click', () => Radio.toggle());
Radio.on(() => {
  radioWidget.classList.toggle('is-on', Radio.playing);
  $('.radio-state').textContent = `Ambient radio · ${Radio.playing ? 'Pause' : 'Play'}`;
  radioWidget.setAttribute('aria-label', `${Radio.playing ? 'Pause' : 'Play'} ambient radio`);
});

// ---------------- context menu & desktop stickies ----------------
let ctxEl = null;
function closeCtx() { ctxEl?.remove(); ctxEl = null; }
desk.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.dsticky [contenteditable]')) return;
  e.preventDefault(); closeMenus();
  const items = [
    { label: 'New Sticky Note', act: () => addSticky(e.clientX, e.clientY) },
    { label: 'Change Wallpaper', act: () => { const ids = Object.keys(WALLPAPERS); const i = ids.indexOf(Object.keys(WALLPAPERS).find(k => WALLPAPERS[k] === wall.get())); setWallpaper(ids[(i + 1) % ids.length]); } },
    { label: root.dataset.theme === 'dark' ? 'Use Light Appearance' : 'Use Dark Appearance', act: () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark') },
    '-',
    { label: 'Inspect Mode', key: 'I', act: toggleInspect },
    { label: 'Clean Up', act: cleanUp },
    '-',
    { label: 'Open Terminal Here', act: go('terminal') },
    { label: 'About This OS', act: go('aboutos') },
  ];
  ctxEl = document.createElement('div'); ctxEl.className = 'ctx';
  ctxEl.innerHTML = renderMenuList(items);
  document.body.appendChild(ctxEl);
  const m = $('.menu', ctxEl);
  m.style.left = Math.min(e.clientX, innerWidth - 250) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - 300) + 'px';
  m.addEventListener('click', (ev) => { const b = ev.target.closest('.menu__i'); if (!b) return; const it = items[+b.dataset.i]; closeCtx(); it.act(); });
});

let notes = store.get('stickies', []);
const stickyColors = ['#F6CB6A', '#B9D3AA', '#F6B79A', '#B9D3EC'];
function renderStickies() {
  const wrap = $('.stickies');
  wrap.innerHTML = notes.map((n, i) => `
    <div class="dsticky" style="left:${n.x}px;top:${n.y}px;--c:${n.c}" data-i="${i}" data-layer="Sticky note">
      <div class="dsticky__bar"><button type="button" class="dsticky__x" aria-label="Delete note">${g('x', 12)}</button></div>
      <div class="dsticky__t" contenteditable="true" spellcheck="false" aria-label="Sticky note">${n.t.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</div>
    </div>`).join('');
}
function addSticky(x, y) {
  const r = desk.getBoundingClientRect();
  notes.push({ x: (x ?? r.width / 2 - 100) - r.left - 20, y: (y ?? r.height / 3) - r.top - 10, t: '', c: stickyColors[notes.length % stickyColors.length] });
  store.set('stickies', notes); renderStickies();
  const last = $$('.dsticky__t').pop(); last.focus();
  Sound.play('pop');
}
(() => {
  const wrap = $('.stickies');
  let d = null;
  wrap.addEventListener('pointerdown', (e) => {
    const s = e.target.closest('.dsticky'); if (!s) return;
    if (e.target.closest('.dsticky__x')) return;
    if (e.target.closest('.dsticky__bar')) { d = { s, px: e.clientX, py: e.clientY, x: parseFloat(s.style.left), y: parseFloat(s.style.top) }; s.setPointerCapture(e.pointerId); }
  });
  wrap.addEventListener('pointermove', (e) => { if (!d) return; d.s.style.left = d.x + e.clientX - d.px + 'px'; d.s.style.top = d.y + e.clientY - d.py + 'px'; });
  wrap.addEventListener('pointerup', () => { if (!d) return; const i = +d.s.dataset.i; notes[i].x = parseFloat(d.s.style.left); notes[i].y = parseFloat(d.s.style.top); store.set('stickies', notes); d = null; });
  wrap.addEventListener('click', (e) => { const x = e.target.closest('.dsticky__x'); if (x) { notes.splice(+x.closest('.dsticky').dataset.i, 1); store.set('stickies', notes); renderStickies(); } });
  wrap.addEventListener('input', (e) => { const t = e.target.closest('.dsticky__t'); if (t) { notes[+t.closest('.dsticky').dataset.i].t = t.innerText; store.set('stickies', notes); } });
})();
renderStickies();

// ---------------- spotlight ----------------
let spot = null;
function spotItems() {
  const apps = Object.entries(APPS).map(([id, a]) => ({ kind: 'Apps', label: a.title.replace(' — akshini@os', ''), sub: a.menu, icon: a.icon(), kw: a.kw || '', act: () => sys.open(id) }));
  const projects = PROJECTS.map(p => ({ kind: 'Case studies', label: p.name, sub: p.tagline, icon: `<img src="${p.thumb}" alt="">`, kw: p.tags.join(' ') + ' ' + p.category + ' ' + p.domain, act: () => sys.open('project:' + p.id) }));
  const actions = [
    { label: root.dataset.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', kw: 'theme appearance night', ic: root.dataset.theme === 'dark' ? 'sun' : 'moon', act: () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark') },
    { label: 'Inspect Mode', kw: 'redlines specs dev mode measure', ic: 'scan', act: toggleInspect },
    { label: 'Copy Email Address', kw: 'contact mail ' + PERSON.email, ic: 'copy', act: () => copyText(PERSON.email, 'Email copied') },
    { label: 'Download Résumé PDF', kw: 'cv resume', ic: 'download', act: () => window.open(PERSON.resumePdf, '_blank', 'noopener') },
    { label: 'Open LinkedIn', kw: 'social profile', ic: 'external-link', act: () => window.open(PERSON.linkedin, '_blank', 'noopener') },
    { label: 'Open Behance', kw: 'social portfolio', ic: 'external-link', act: () => window.open(PERSON.behance, '_blank', 'noopener') },
    { label: 'Take the Tour', kw: 'help guide', ic: 'sparkles', act: () => presence.follow() },
    { label: 'Lock Screen', kw: 'sleep', ic: 'monitor', act: lock },
    ...Object.entries(WALLPAPERS).map(([id, w]) => ({ label: `Wallpaper: ${w.name}`, kw: 'background', ic: 'palette', act: () => setWallpaper(id) })),
  ].map(a => ({ ...a, kind: 'Actions', icon: `<span class="spot__glyph">${g(a.ic, 16)}</span>`, sub: '' }));
  return [...projects, ...apps, ...actions];
}
function openSpotlight() {
  closeMenus();
  if (spot) { $('input', spot).focus(); return; }
  spot = document.createElement('div');
  spot.className = 'spot';
  spot.setAttribute('role', 'dialog'); spot.setAttribute('aria-label', 'Search');
  spot.innerHTML = `
    <div class="spot__panel" data-layer="Spotlight">
      <label class="spot__field">${g('search', 20)}<input type="text" placeholder="Search work, apps and actions" aria-label="Search" autocomplete="off" spellcheck="false"><kbd>esc</kbd></label>
      <div class="spot__res" role="listbox"></div>
    </div>`;
  document.body.appendChild(spot);
  const input = $('input', spot), res = $('.spot__res', spot);
  const all = spotItems();
  let shown = [], sel = 0;
  const score = (it, q) => {
    const l = it.label.toLowerCase();
    if (!q) return it.kind === 'Case studies' ? 2 : it.kind === 'Apps' ? 1 : 0;
    if (l.startsWith(q)) return 10;
    if (l.split(/[\s—:]+/).some(w => w.startsWith(q))) return 7;
    if (l.includes(q)) return 5;
    if ((it.kw + ' ' + it.sub).toLowerCase().includes(q)) return 3;
    return 0;
  };
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = all.map(it => ({ it, s: score(it, q) })).filter(x => x.s > 0 || !q).sort((a, b) => b.s - a.s).slice(0, q ? 9 : 8).map(x => x.it);
    if (!q) shown = all.filter(it => it.kind === 'Case studies').concat(all.filter(it => it.kind === 'Apps').slice(0, 4));
    sel = 0;
    let lastKind = '';
    res.innerHTML = shown.length ? shown.map((it, i) => {
      const head = it.kind !== lastKind ? `<p class="spot__k">${i === 0 && q ? 'Top hit' : it.kind}</p>` : '';
      lastKind = it.kind;
      return `${head}<button type="button" class="spot__i ${i === 0 ? 'is-sel' : ''}" role="option" data-i="${i}"><span class="spot__ic">${it.icon}</span><span class="spot__l">${it.label}</span><span class="spot__s">${it.sub || ''}</span></button>`;
    }).join('') : `<p class="spot__none">No results for “${input.value.replace(/[<>&]/g, '')}”</p>`;
  };
  const move = (d) => { sel = (sel + d + shown.length) % shown.length; $$('.spot__i', res).forEach((b, i) => b.classList.toggle('is-sel', i === sel)); $$('.spot__i', res)[sel]?.scrollIntoView({ block: 'nearest' }); };
  const run = (i) => { const it = shown[i]; closeSpotlight(); it && it.act(); };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSpotlight(); }
  });
  res.addEventListener('click', (e) => { const b = e.target.closest('.spot__i'); if (b) run(+b.dataset.i); });
  spot.addEventListener('pointerdown', (e) => { if (e.target === spot) closeSpotlight(); });
  render();
  requestAnimationFrame(() => input.focus());
  Sound.play('pop');
}
function closeSpotlight() { if (!spot) return; const s = spot; spot = null; s.classList.add('is-out'); setTimeout(() => s.remove(), 160); }

// ---------------- inspect mode ----------------
const insp = $('.inspect');
const iBox = $('.inspect__box'), iPad = $('.inspect__pad'), iCard = $('.inspect__card'), iSize = $('.inspect__size'), iBanner = $('.inspect__banner');
iBanner.innerHTML = `${g('scan', 14)}<span><strong>Inspect mode</strong> · hover anything to see its specs</span><kbd>I</kbd><span>or</span><kbd>esc</kbd><span>to exit</span>`;
const px = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const toHex = (c) => {
  if (!c || c === 'transparent') return null;
  px.clearRect(0, 0, 1, 1); px.fillStyle = '#000'; px.fillStyle = c; px.fillRect(0, 0, 1, 1);
  const [r, gg, b, a255] = px.getImageData(0, 0, 1, 1).data;
  const a = Math.round(a255 / 2.55) / 100;
  if (a === 0) return null;
  const hx = '#' + [r, gg, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  return a < 1 ? `${hx} · ${Math.round(a * 100)}%` : hx;
};
let redlines = [];
function clearRed() { redlines.forEach(r => r.remove()); redlines = []; }
function redline(x1, y1, x2, y2, label) {
  const l = document.createElement('div');
  const vertical = x1 === x2;
  l.className = 'redline ' + (vertical ? 'redline--v' : 'redline--h');
  Object.assign(l.style, vertical ? { left: x1 + 'px', top: Math.min(y1, y2) + 'px', height: Math.abs(y2 - y1) + 'px' } : { top: y1 + 'px', left: Math.min(x1, x2) + 'px', width: Math.abs(x2 - x1) + 'px' });
  l.innerHTML = `<span>${Math.round(label)}</span>`;
  insp.appendChild(l); redlines.push(l);
}
function inspectAt(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === document.body || el === root || el.closest('.inspect')) return;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  Object.assign(iBox.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  iSize.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
  Object.assign(iPad.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderTopWidth: cs.paddingTop, borderRightWidth: cs.paddingRight, borderBottomWidth: cs.paddingBottom, borderLeftWidth: cs.paddingLeft });
  clearRed();
  const parent = el.parentElement;
  if (parent && parent !== document.body) {
    const pr = parent.getBoundingClientRect();
    const midY = r.top + r.height / 2, midX = r.left + r.width / 2;
    if (r.left - pr.left > 1) redline(pr.left, midY, r.left, midY, r.left - pr.left);
    if (r.top - pr.top > 1) redline(midX, pr.top, midX, r.top, r.top - pr.top);
    if (pr.right - r.right > 1) redline(r.right, midY, pr.right, midY, pr.right - r.right);
  }
  const layer = el.closest('[data-layer]')?.dataset.layer || '';
  const tag = el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '');
  const fam = cs.fontFamily.split(',')[0].replace(/"/g, '');
  const color = toHex(cs.color), bg = toHex(cs.backgroundColor);
  const rad = cs.borderTopLeftRadius;
  const rows = [
    ['Font', `${fam} · ${cs.fontWeight}`],
    ['Size', `${parseFloat(cs.fontSize)} / ${cs.lineHeight === 'normal' ? 'auto' : Math.round(parseFloat(cs.lineHeight))}`],
    color && ['Text', `<i class="sw" style="background:${cs.color}"></i>${color}`],
    bg && ['Fill', `<i class="sw" style="background:${cs.backgroundColor}"></i>${bg}`],
    rad !== '0px' && ['Radius', rad],
    (cs.paddingTop !== '0px' || cs.paddingLeft !== '0px') && ['Padding', `${parseFloat(cs.paddingTop)} ${parseFloat(cs.paddingRight)} ${parseFloat(cs.paddingBottom)} ${parseFloat(cs.paddingLeft)}`],
    cs.display.includes('flex') || cs.display.includes('grid') ? ['Layout', `${cs.display}${cs.gap && cs.gap !== 'normal' ? ' · gap ' + cs.gap : ''}`] : null,
  ].filter(Boolean);
  iCard.innerHTML = `<p class="inspect__layer">${layer || 'Layer'}</p><p class="inspect__tag">${tag}</p><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const cw = 250, ch = iCard.offsetHeight || 180;
  let x = e.clientX + 18, y = e.clientY + 18;
  if (x + cw > innerWidth - 8) x = e.clientX - cw - 18;
  if (y + ch > innerHeight - 8) y = e.clientY - ch - 18;
  iCard.style.transform = `translate(${x}px, ${y}px)`;
}
let inspectRaf = 0, lastEv = null;
const onInspectMove = (e) => { lastEv = e; if (!inspectRaf) inspectRaf = requestAnimationFrame(() => { inspectRaf = 0; inspectAt(lastEv); }); };
function toggleInspect(force) {
  const on = typeof force === 'boolean' ? force : !root.classList.contains('is-inspect');
  root.classList.toggle('is-inspect', on);
  $('[data-action=inspect]').setAttribute('aria-pressed', on);
  if (on) { document.addEventListener('pointermove', onInspectMove); notify({ title: 'Inspect mode on', body: 'Every element shows its real specs — the way I hand off to developers.', icon: `<span class="ni ni--insp">${g('scan', 16)}</span>`, timeout: 3200 }); }
  else { document.removeEventListener('pointermove', onInspectMove); clearRed(); }
  Sound.play('click');
}

// ---------------- lock screen & restart ----------------
function lock() {
  if ($('.lock')) return;
  const l = document.createElement('div'); l.className = 'lock'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Lock screen');
  const t = () => new Date().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: false });
  l.innerHTML = `
    <p class="lock__date">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <p class="lock__time">${t()}</p>
    <div class="lock__user"><img src="assets/avatar.webp" alt=""><strong>${PERSON.name}</strong><button class="btn btn--glass" type="button">Click to unlock</button></div>`;
  document.body.appendChild(l);
  const iv = setInterval(() => { $('.lock__time', l).textContent = t(); }, 5000);
  const un = () => { clearInterval(iv); l.classList.add('is-out'); document.removeEventListener('keydown', un, true); setTimeout(() => l.remove(), 520); Sound.play('open'); };
  l.addEventListener('click', un);
  setTimeout(() => document.addEventListener('keydown', un, true), 300);
}
function restart() {
  [...WM.state().open].forEach(id => WM.close(id, { instant: true }));
  presence.stop();
  root.classList.remove('is-ready', 'no-boot', 'is-booted', 'is-settled');
  boot(true);
}

// ---------------- keyboard ----------------
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); spot ? closeSpotlight() : openSpotlight(); return; }
  if (mod && e.key.toLowerCase() === 'l' && !mobileQ.matches) { e.preventDefault(); lock(); return; }
  if (e.key === 'Escape') {
    if (spot) { closeSpotlight(); return; }
    if (openMenu || ctxEl) { closeMenus(); return; }
    if (root.classList.contains('is-inspect')) { toggleInspect(false); return; }
    if (presence.isFollowing()) { presence.stop(); return; }
    if (!typing()) WM.closeTop();
    return;
  }
  if (typing() || mod || e.altKey) return;
  if (e.key === 'i' || e.key === 'I') toggleInspect();
  if (e.key === '?') sys.open('readme');
  if (e.key === '/') { if (presence.openChat()) e.preventDefault(); }
});

// ---------------- Akshini's presence (collaborator cursor, follow mode, cursor chat) ----------------
const presence = createPresence({
  WM,
  open: (id, origin, appOpts) => sys.open(id, origin, appOpts),
  closeAll: () => [...WM.state().open].forEach(id => WM.close(id)),
  isMobile: () => mobileQ.matches,
  reduce: reduceMotion,
  store,
});

// ---------------- phone home screen ----------------
function buildPhone() {
  $('.hwork').innerHTML = `
    <div class="hwork__head"><p>Case studies</p><button type="button" class="hwork__all" data-p="work">See all</button></div>
    <div class="hwork__row">${PROJECTS.map(p => `
      <button type="button" class="hcard" data-p="project:${p.id}"><span class="hcard__img"><img src="${p.thumb}" alt="" loading="lazy"></span><span class="hcard__name">${p.name}</span><span class="hcard__tag">${p.category}</span></button>`).join('')}</div>`;
  const grid = ['about', 'skills', 'process', 'experience', 'radio', 'readme', 'trash', 'aboutos'];
  const dock = ['work', 'resume', 'contact', 'terminal'];
  const label = { work: 'Work', about: 'About', skills: 'Skills', process: 'Process', experience: 'Experience', resume: 'Résumé', contact: 'Mail', terminal: 'Terminal', radio: 'Radio', readme: 'Read Me', trash: 'Trash', aboutos: 'This OS' };
  const icon = (id) => `<button type="button" class="happ" role="listitem" data-p="${id}"><span class="happ__ic">${id === 'aboutos' ? `<span class="happ__logo">${STAR(26)}</span>` : APPS[id].icon()}</span><span class="happ__l">${label[id]}</span></button>`;
  $('.hgrid').innerHTML = grid.map(icon).join('');
  $('.hdock').innerHTML = dock.map(icon).join('');
  $('#phone').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    sys.open(b.dataset.p, b.querySelector('.happ__ic, .hcard__img') || b);
  });
}
buildPhone();

// ---------------- boot: the first-start "hello" ----------------
let booted = false;
function afterBoot({ greeted = false, quiet = false } = {}) {
  if (booted) return; booted = true;
  root.classList.add('is-ready');
  setTimeout(() => root.classList.add('is-settled'), 1700);
  try { sessionStorage.setItem('aos.booted', '1'); } catch { /* */ }
  const route = parseHash();
  if (route) setTimeout(() => sys.open(route), 450);
  if (quiet || root.classList.contains('is-still')) return; // ?still: for screenshots, no cursor or banners
  if (greeted && !route) setTimeout(() => presence.greet(), 1300);
  else setTimeout(() => presence.appear(), 1200);
  let welcomed = false; try { welcomed = !!sessionStorage.getItem('aos.welcomed'); } catch { /* */ }
  if (!welcomed) {
    const tryWelcome = (n) => setTimeout(() => {
      if (presence.isBusy() && n < 6) return tryWelcome(n + 1);
      try { sessionStorage.setItem('aos.welcomed', '1'); } catch { /* */ }
      notify({ title: 'Akshini is open to new work', body: 'Summer ’26 internships, freelance and design roles.', icon: ICONS.contact(), action: () => sys.open('contact'), actionLabel: 'Say hello', timeout: 7000 });
    }, n === 0 ? (route ? 2500 : 20000) : 6000);
    tryWelcome(0);
  }
}
async function boot(force) {
  booted = false;
  if (!force && root.classList.contains('no-boot')) { root.classList.add('is-booted'); setTimeout(() => afterBoot(), 30); return; }
  const res = await playHello($('.hello'), { reduce: reduceMotion });
  if (res.gesture) { Sound.unlock(); Sound.chime(); }
  root.classList.add('is-booted');
  setTimeout(() => afterBoot({ greeted: true }), 260);
}
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const [a, b] = h.split('/');
  if (a === 'work' && b && PROJECTS.some(p => p.id === b)) return 'project:' + b;
  if (APPS[a]) return a;
  return null;
}
addEventListener('hashchange', () => { const r = parseHash(); if (r && WM.state().focused !== r) sys.open(r); });

// expose a tiny API for the console-curious
window.AkshiniOS = { open: sys.open, inspect: toggleInspect, theme: setTheme, wallpaper: setWallpaper, hire: () => sys.open('contact', null, { subject: 'We’d like to hire you' }) };
console.log('%c✦ AkshiniOS 26 %c Hi, fellow inspector. Try AkshiniOS.hire()', 'background:#1C1915;color:#F3EEE6;padding:4px 8px;border-radius:4px', 'color:#C65A2E');

boot();
