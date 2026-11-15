// The first-start "hello": a handwritten greeting that writes itself in a few of Akshini's languages.
const WORDS = [
  { t: 'hello', f: 'latin' },
  { t: 'नमस्कार', f: 'deva' },   // Marathi — Pune
  { t: 'hola', f: 'latin' },
  { t: 'bonjour', f: 'latin' },
  { t: 'नमस्ते', f: 'deva' },     // Hindi
  { t: 'ciao', f: 'latin' },
  { t: 'hallo', f: 'latin' },
];

const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function playHello(el, { reduce = false } = {}) {
  const text = el.querySelector('.hello__word');
  const clip = el.querySelector('.hello__clip');
  if (matchMedia('(pointer: coarse)').matches) el.querySelector('.hello__go span').textContent = 'Tap anywhere to begin';
  let done = false, resolveFn;
  const result = new Promise(r => { resolveFn = r; });

  const finish = (gesture) => {
    if (done) return; done = true;
    el.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('keydown', onKey, true);
    resolveFn({ gesture });
  };
  const onPointer = () => finish(true);
  const onKey = (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; e.preventDefault(); e.stopPropagation(); finish(true); };
  el.addEventListener('pointerdown', onPointer);
  document.addEventListener('keydown', onKey, true);

  const draw = (w, dur) => new Promise(res => {
    text.textContent = w.t;
    text.dataset.f = w.f;
    text.style.opacity = '1';
    const bb = text.getBBox();
    const L = 2400;
    text.style.strokeDasharray = `${L} ${L}`;
    clip.setAttribute('x', bb.x - 30);
    clip.setAttribute('y', bb.y - 60);
    clip.setAttribute('height', bb.height + 120);
    clip.setAttribute('width', 0);
    text.style.strokeDashoffset = String(L);
    text.style.fillOpacity = '0';
    if (reduce) { clip.setAttribute('width', bb.width + 60); text.style.strokeDashoffset = '0'; text.style.fillOpacity = '1'; return res(); }
    const t0 = performance.now();
    const step = (now) => {
      if (done) return res();
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      clip.setAttribute('width', (bb.width + 60) * Math.max(0, Math.min(1, e * 1.08)));
      text.style.strokeDashoffset = String(L * (1 - e));
      text.style.fillOpacity = String(Math.max(0, (e - .62) / .38));
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });

  const fade = (ms) => new Promise(res => {
    if (reduce) return res();
    const a = text.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(6px)' }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = () => { a.cancel(); text.style.opacity = '0'; res(); };
  });

  (async () => {
    // wait for the handwriting faces, but never for long
    try {
      await Promise.race([
        Promise.all([document.fonts.load('300px Sacramento', 'hello'), document.fonts.load('200px Kalam', 'नमस्ते')]),
        sleep(1600),
      ]);
    } catch { /* fonts unavailable: system script fallback */ }
    if (done) return;
    el.classList.add('is-live');
    if (reduce) {
      await draw(WORDS[0], 0);
      el.classList.add('is-hint');
      await sleep(7000);
      finish(false);
      return;
    }
    await sleep(350);
    for (let i = 0; i < WORDS.length && !done; i++) {
      await draw(WORDS[i], i === 0 ? 2600 : 1500);
      if (i === 0) el.classList.add('is-hint');
      await sleep(i === 0 ? 1500 : 850);
      if (done) break;
      await fade(420);
      await sleep(160);
    }
    if (!done) { await draw(WORDS[0], 1800); await sleep(900); finish(false); }
  })();

  return result;
}
