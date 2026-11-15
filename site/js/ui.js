// Shared OS surfaces: notifications, Quick Look, confetti, clipboard.
import { g } from './glyphs.js';
import { Sound } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Notifications (top-right banners) ----
export function notify({ title, body = '', icon = '', action = null, actionLabel = 'Open', timeout = 5200 }) {
  const stack = $('.notifs');
  const n = document.createElement('div');
  n.className = 'notif';
  n.setAttribute('role', 'status');
  n.dataset.layer = 'Notification';
  n.innerHTML = `
    <span class="notif__icon">${icon}</span>
    <span class="notif__text"><strong>${esc(title)}</strong>${body ? `<span>${esc(body)}</span>` : ''}</span>
    ${action ? `<button class="notif__act" type="button">${esc(actionLabel)}</button>` : ''}
    <button class="notif__x" type="button" aria-label="Dismiss">${g('x', 12)}</button>`;
  stack.appendChild(n);
  Sound.play('pop');
  const kill = () => { if (!n.isConnected) return; n.classList.add('is-out'); setTimeout(() => n.remove(), 260); };
  n.querySelector('.notif__x').addEventListener('click', kill);
  if (action) n.querySelector('.notif__act').addEventListener('click', () => { action(); kill(); });
  let t = setTimeout(kill, timeout);
  n.addEventListener('pointerenter', () => clearTimeout(t));
  n.addEventListener('pointerleave', () => { t = setTimeout(kill, 2400); });
  return kill;
}

export async function copyText(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); notify({ title: label, body: text, icon: `<span class="ni ni--ok">${g('check', 16)}</span>`, timeout: 2600 }); return true; }
  catch { notify({ title: 'Copy this', body: text, icon: `<span class="ni">${g('copy', 16)}</span>` }); return false; }
}

// ---- Quick Look ----
export function quickLook(items, index = 0) {
  let i = index, zoom = false;
  const ov = document.createElement('div');
  ov.className = 'ql';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Quick Look');
  ov.dataset.layer = 'Quick Look';
  ov.innerHTML = `
    <div class="ql__panel">
      <header class="ql__bar">
        <button class="ql__btn" data-q="close" type="button" aria-label="Close Quick Look">${g('x', 16)}</button>
        <span class="ql__name"></span>
        <span class="ql__count"></span>
        <button class="ql__btn" data-q="prev" type="button" aria-label="Previous image">${g('chevron-left', 18)}</button>
        <button class="ql__btn" data-q="next" type="button" aria-label="Next image">${g('chevron-right', 18)}</button>
        <button class="ql__btn" data-q="zoom" type="button" aria-label="Zoom">${g('zoom-in', 16)}</button>
      </header>
      <div class="ql__stage"><img alt=""></div>
    </div>`;
  document.body.appendChild(ov);
  const img = $('img', ov), stage = $('.ql__stage', ov);
  const show = () => {
    const it = items[i];
    img.src = it.src; img.alt = it.alt || '';
    $('.ql__name', ov).textContent = it.src.split('/').pop();
    $('.ql__count', ov).textContent = items.length > 1 ? `${i + 1} of ${items.length}` : '';
    zoom = false; stage.classList.remove('is-zoom'); img.style.transformOrigin = '50% 50%';
  };
  const close = () => { ov.classList.add('is-out'); document.removeEventListener('keydown', key, true); setTimeout(() => ov.remove(), 220); };
  const step = (d) => { i = (i + d + items.length) % items.length; show(); };
  const toggleZoom = (e) => {
    zoom = !zoom; stage.classList.toggle('is-zoom', zoom);
    if (zoom && e && e.clientX) { const r = img.getBoundingClientRect(); img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`; }
  };
  const key = (e) => {
    if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  };
  document.addEventListener('keydown', key, true);
  ov.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')?.dataset.q;
    if (q === 'close') close(); else if (q === 'prev') step(-1); else if (q === 'next') step(1); else if (q === 'zoom') toggleZoom();
    else if (e.target === img) toggleZoom(e);
    else if (e.target === ov || e.target === stage) close();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!zoom) return; const r = stage.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  if (items.length < 2) ov.querySelectorAll('[data-q=prev],[data-q=next]').forEach(b => b.hidden = true);
  show();
  Sound.play('pop');
  $('[data-q=close]', ov).focus();
}

// ---- Confetti (for very good decisions) ----
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  const cols = ['#C65A2E', '#F0B44C', '#9DBB8F', '#6FA8DC', '#F2A27C', '#1C1915'];
  const P = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, r: Math.random() * Math.PI,
    vr: (Math.random() - .5) * .3, s: 5 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], star: Math.random() < .25,
  }));
  let f = 0;
  const tick = () => {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(p => {
      p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
      if (p.star) { x.beginPath(); const s = p.s; x.moveTo(0, -s); x.quadraticCurveTo(0, 0, s, 0); x.quadraticCurveTo(0, 0, 0, s); x.quadraticCurveTo(0, 0, -s, 0); x.quadraticCurveTo(0, 0, 0, -s); x.fill(); }
      else x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      x.restore();
    });
    if (++f < 200) requestAnimationFrame(tick); else c.remove();
  };
  tick();
}
