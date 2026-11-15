// Akshini's presence: a Figma-style collaborator cursor that greets, guides ("Follow Akshini"),
// reacts to what you open, answers cursor chat (press /) and wanders over when you go quiet.
import { PROJECTS } from './data.js';
import { STAR } from './icons.js';
import { Sound } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const STOP = Symbol('stop');
const rand = (a, b) => a + Math.random() * (b - a);

const APP_NOTES = {
  work: 'Every case study lives in here. Click one to open it.',
  process: 'Go on, drag the stickies around. Add your own with the sticky tool.',
  skills: 'Try switching one off. I dare you.',
  terminal: 'Type <b>help</b>. Or skip straight to <b>sudo hire-akshini</b>.',
  contact: 'I read every message, and usually reply within 24 hours.',
  resume: 'Want the original? The PDF button is up in the top right.',
  radio: 'This music is composed live in your browser. It never repeats.',
  experience: 'Click a bar on the timeline to jump to that role.',
  trash: 'Things I promise never to ship.',
};

export function createPresence({ WM, open, closeAll, isMobile, reduce, store }) {
  const root = document.documentElement;
  const layer = $('.presence'), cur = $('.pcur'), bub = $('.pbub'), chat = $('.cchat'), chatIn = $('.cchat__in');
  const pill = $('.follow-pill');
  const pos = { x: innerWidth * .7, y: innerHeight + 40 };
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let mv = 0, busy = false, following = false, cancels = [], speaking = false, lastInput = performance.now(), nudges = 0, bobTimer = 0, on = false;
  const seen = new Set(JSON.parse(sessionStorage.getItem('aos.seen') || '[]'));
  const markSeen = (k) => { seen.add(k); try { sessionStorage.setItem('aos.seen', JSON.stringify([...seen])); } catch { /* */ } };

  // ---------- primitives ----------
  const place = (x, y) => {
    pos.x = x; pos.y = y;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cur.classList.toggle('is-flip', x > innerWidth - 120);
    if (speaking) placeBubble();
  };
  place(pos.x, pos.y);

  const placeBubble = () => {
    const w = bub.offsetWidth || 280, h = bub.offsetHeight || 80;
    let x = pos.x + 24, y = pos.y + 30, left = false;
    if (x + w > innerWidth - 12) { x = pos.x - w - 8; left = true; }
    if (y + h > innerHeight - 10) y = Math.max(40, pos.y - h - 10);
    bub.classList.toggle('is-left', left);
    bub.style.left = x + 'px'; bub.style.top = y + 'px';
  };

  let mvDone = null;
  const cancelMove = () => { cancelAnimationFrame(mv); if (mvDone) { const f = mvDone; mvDone = null; f(); } };
  const moveTo = (x, y, speed = 1) => new Promise((res) => {
    cancelMove();
    mvDone = res;
    x = Math.max(6, Math.min(innerWidth - 30, x)); y = Math.max(4, Math.min(innerHeight - 30, y));
    const sx = pos.x, sy = pos.y, d = Math.hypot(x - sx, y - sy);
    if (reduce || d < 2) { place(x, y); mvDone = null; return res(); }
    const dur = Math.min(1400, Math.max(420, d * .85)) / speed;
    const nx = -(y - sy) / d, ny = (x - sx) / d, bend = Math.min(110, d * .16) * (Math.random() < .5 ? -1 : 1);
    const cx = (sx + x) / 2 + nx * bend, cy = (sy + y) / 2 + ny * bend;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, u = 1 - e;
      place(u * u * sx + 2 * u * e * cx + e * e * x, u * u * sy + 2 * u * e * cy + e * e * y);
      if (t < 1) mv = requestAnimationFrame(step); else { mvDone = null; res(); }
    };
    mv = requestAnimationFrame(step);
  });

  const pointAt = (el, fx = .5, fy = .5, speed = 1) => {
    if (!el) return Promise.resolve();
    // aim at the visible content (text runs), not the whole block box
    let r = el.getBoundingClientRect();
    if (!el.children.length && el.textContent.trim()) {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const t = rg.getBoundingClientRect(); if (t.width && t.height) r = t;
    }
    return moveTo(r.left + r.width * fx, r.top + r.height * fy, speed);
  };

  const hush = () => { speaking = false; bub.classList.remove('is-on'); };

  // say(): show a bubble; resolves with the chosen action key, or 'timeout'
  let sayResolve = null;
  const say = (html, { actions = [], hold = 3200 } = {}) => new Promise((res) => {
    if (sayResolve) sayResolve('replaced');
    sayResolve = res;
    bub.innerHTML = `<div>${html}</div>${actions.length ? `<div class="pbub__acts">${actions.map((a, i) => `<button type="button" class="pbub__b${i === 0 ? ' pbub__b--primary' : ''}" data-k="${a.k}">${a.label}</button>`).join('')}</div>` : ''}`;
    speaking = true; placeBubble(); bub.classList.add('is-on');
    Sound.play('pop');
    const t = setTimeout(() => { if (sayResolve === res) { sayResolve = null; hush(); res('timeout'); } }, hold);
    bub.onclick = (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      clearTimeout(t); sayResolve = null; hush(); Sound.play('click'); res(b.dataset.k);
    };
  });

  const press = (x = pos.x, y = pos.y) => {
    cur.classList.add('is-press'); setTimeout(() => cur.classList.remove('is-press'), 160);
    const r = document.createElement('span'); r.className = 'pripple'; r.style.left = x + 2 + 'px'; r.style.top = y + 2 + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    Sound.play('click');
  };

  const parkSpot = () => {
    const dock = $('.dock__tray');
    if (dock) { const r = dock.getBoundingClientRect(); return { x: Math.min(innerWidth - 120, r.right + 46), y: r.top + 12 }; }
    return { x: innerWidth - 200, y: innerHeight - 120 };
  };
  const park = () => { const p = parkSpot(); return moveTo(p.x, p.y, .8); };

  // gentle idle drift so she feels present
  const startBob = () => {
    clearInterval(bobTimer);
    if (reduce) return;
    bobTimer = setInterval(() => {
      if (busy || speaking || following || document.hidden) return;
      const p = parkSpot();
      if (Math.hypot(pos.x - p.x, pos.y - p.y) > 60) return;
      moveTo(p.x + rand(-16, 16), p.y + rand(-12, 8), .3);
    }, 3800);
  };

  // run one scripted moment at a time; follow mode can cancel it
  const wait = (ms) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    cancels.push(() => { clearTimeout(t); rej(STOP); });
  });
  const guard = async (p) => { const r = await p; if (!following) throw STOP; return r; };

  // ---------- greeting ----------
  async function greet() {
    if (isMobile() || on) return appear();
    on = true; layer.classList.add('is-on'); startBob();
    busy = true;
    const name = $('.hero__name');
    place(innerWidth * .72, innerHeight + 40);
    await new Promise(r => setTimeout(r, 200));
    if (name) await pointAt(name, .97, .82); else await moveTo(innerWidth * .6, innerHeight * .4);
    const k = await say(`Hi, I’m Akshini ${STAR(11)} Welcome to my little OS. Want me to show you around?`, {
      actions: [{ k: 'tour', label: 'Show me around' }, { k: 'solo', label: 'I’ll explore' }], hold: 14000,
    });
    busy = false;
    if (k === 'tour') return follow();
    if (k === 'solo') {
      await say(`Have fun! Double-click a folder to start, and press <kbd>/</kbd> anytime to chat with me.`, { hold: 4200 });
    }
    if (!following) park();
  }

  function appear() {
    if (isMobile() || on) return;
    on = true; layer.classList.add('is-on');
    const p = parkSpot(); place(p.x + 80, innerHeight + 40); park(); startBob();
  }

  // ---------- follow mode ----------
  function stopFollow(reason) {
    if (!following) return;
    following = false;
    root.classList.remove('is-following');
    cancels.forEach(f => f()); cancels = [];
    cancelMove();
    if (sayResolve) { const r = sayResolve; sayResolve = null; r('stop'); }
    hush();
    document.removeEventListener('pointerdown', interrupt, true);
    document.removeEventListener('wheel', interrupt, true);
    document.removeEventListener('keydown', interrupt, true);
    if (reason === 'user') setTimeout(async () => { busy = true; await say('No problem. I’ll be right here if you need me: just click my cursor.', { hold: 3400 }); busy = false; park(); }, 200);
    else park();
  }
  const interrupt = (e) => {
    if (e.target && e.target.closest && e.target.closest('.follow-pill, .pbub, .pcur')) return;
    stopFollow('user');
  };
  pill.querySelector('button').addEventListener('click', () => stopFollow('user'));

  async function follow() {
    if (isMobile() || following) return;
    if (!on) { on = true; layer.classList.add('is-on'); startBob(); }
    following = true; busy = true; nudges = 99;
    root.classList.add('is-following');
    setTimeout(() => {
      document.addEventListener('pointerdown', interrupt, true);
      document.addEventListener('wheel', interrupt, true);
      document.addEventListener('keydown', interrupt, true);
    }, 300);
    const sayW = async (html, ms) => { await guard(say(html, { hold: ms })); };
    try {
      closeAll();
      await wait(250);
      await guard(moveTo(innerWidth / 2 + 40, innerHeight * .34));
      await sayW(`Follow me ${STAR(11)} I’ll open things for you. Touch anything to take over.`, 3000);

      // 1. Work
      const dockWork = $('.dock__item[data-app=work] .dock__icon');
      await guard(pointAt(dockWork));
      await wait(150); press(); open('work', dockWork);
      await wait(700);
      const work = WM.get('work');
      if (work) await guard(pointAt(work.el.querySelector('.finder__title h2'), 1.1, .5));
      await sayW('All my case studies live in here: research to shipped design.', 3000);

      // 2. Pill Mate
      const card = work && work.el.querySelector('.pcard[data-open="pill-mate"]');
      if (card) {
        await guard(pointAt(card, .5, .4));
        await wait(150); press(); open('project:pill-mate', card.querySelector('img'));
        await wait(800);
        const pm = WM.get('project:pill-mate');
        if (pm) {
          const body0 = pm.el.querySelector('.win__body'), title = pm.el.querySelector('.cs__title');
          if (body0 && title) { body0.scrollTo({ top: Math.max(0, title.offsetTop - 140), behavior: reduce ? 'auto' : 'smooth' }); await wait(900); }
          await guard(pointAt(title, 1.04, .62));
          await sayW('Pill Mate: a smart pill dispenser. Ten weeks with two industrial designers and an AI engineer. I designed the app.', 4200);
          const body = pm.el.querySelector('.win__body');
          const ch = pm.el.querySelector('.cs__ch');
          if (body && ch) {
            body.scrollTo({ top: ch.offsetTop - 30, behavior: reduce ? 'auto' : 'smooth' });
            await wait(1100);
            await guard(pointAt(pm.el.querySelector('.cs__fig'), .62, .4));
            await sayW('Every project is documented step by step: research, flows, hardware, final UI. Click any image to zoom.', 4000);
          }
          WM.close('project:pill-mate');
        }
      }
      WM.close('work');
      await wait(400);

      // 3. Process
      const dockProc = $('.dock__item[data-app=process] .dock__icon');
      await guard(pointAt(dockProc));
      await wait(150); press(); open('process', dockProc);
      await wait(900);
      const pr = WM.get('process');
      if (pr) {
        const st = pr.el.querySelectorAll('.sticky')[1];
        await guard(pointAt(st, .6, .5));
        await sayW('This is how I work: discovery, architecture, systems, validation. The stickies are real; drag them.', 4000);
        WM.close('process');
      }
      await wait(350);

      // 4. Inspect + search
      await guard(pointAt($('[data-action=inspect]'), .5, .7));
      await sayW('Press <kbd>I</kbd> anytime to inspect any pixel here. It’s all built to spec.', 3200);
      await guard(pointAt($('[data-action=spotlight]'), .5, .7, 1.4));
      await sayW(`And <kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd> finds anything.`, 2400);

      // 5. Say hello
      const dockMail = $('.dock__item[data-app=contact] .dock__icon');
      await guard(pointAt(dockMail, .5, .2));
      const k = await guard(say('That’s the tour! When you’re ready, say hello. I usually reply within a day.', {
        actions: [{ k: 'mail', label: 'Write to Akshini' }, { k: 'done', label: 'Explore on my own' }], hold: 9000,
      }));
      if (k === 'mail') { press(); open('contact', dockMail); }
    } catch (e) { if (e !== STOP) console.error(e); }
    finally {
      if (following) stopFollow('end');
      busy = false;
    }
  }

  // ---------- reactions to opened windows ----------
  let prevOpen = new Set();
  WM.onChange((st) => {
    const now = new Set(st.open);
    const fresh = [...now].filter(id => !prevOpen.has(id));
    prevOpen = now;
    if (!on || following || busy || isMobile() || !fresh.length) return;
    const id = fresh[fresh.length - 1];
    if (seen.has(id)) return;
    let note = APP_NOTES[id];
    if (id.startsWith('project:')) { const p = PROJECTS.find(x => 'project:' + x.id === id); note = p && p.note; }
    if (!note) return;
    markSeen(id);
    setTimeout(async () => {
      const rec = WM.get(id); if (!rec || busy || following) return;
      busy = true;
      const bar = rec.el.querySelector('.win__bar');
      const r = bar.getBoundingClientRect();
      await moveTo(Math.min(r.right - 70, r.left + r.width * .62), r.bottom + 6);
      await say(note, { hold: 4600 });
      busy = false;
      if (!following) park();
    }, 650);
  });

  // ---------- click her cursor ----------
  cur.addEventListener('click', async () => {
    if (following) return;
    busy = true;
    const k = await say('Hey! What can I do for you?', {
      actions: [{ k: 'tour', label: 'Show me around' }, { k: 'work', label: 'Your work' }, { k: 'mail', label: 'Message you' }], hold: 7000,
    });
    busy = false;
    if (k === 'tour') follow();
    else if (k === 'work') open('work', cur);
    else if (k === 'mail') open('contact', cur);
    else park();
  });

  // ---------- cursor chat ( / ) ----------
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; lastInput = performance.now();
    if (!chat.hidden) placeChat();
  }, { passive: true });
  addEventListener('keydown', () => { lastInput = performance.now(); }, true);
  const placeChat = () => {
    const x = Math.min(pointer.x + 14, innerWidth - 320), y = Math.min(pointer.y + 14, innerHeight - 50);
    chat.style.transform = `translate(${x}px, ${y}px)`;
  };
  function openChat() {
    if (isMobile() || following) return false;
    chat.hidden = false; chatIn.value = ''; placeChat();
    requestAnimationFrame(() => chatIn.focus());
    return true;
  }
  const closeChat = () => { chat.hidden = true; chatIn.blur(); };
  chatIn.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeChat(); } });
  chatIn.addEventListener('blur', () => { if (!chatIn.value.trim()) setTimeout(closeChat, 80); });
  chat.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatIn.value.trim(); if (!text) return closeChat();
    const r = chat.getBoundingClientRect();
    closeChat();
    const sent = document.createElement('div'); sent.className = 'cchat-sent'; sent.textContent = text;
    sent.style.left = r.left + 'px'; sent.style.top = r.top + 'px';
    document.body.appendChild(sent); setTimeout(() => sent.remove(), 3300);
    Sound.play('send');
    if (!on) appear();
    busy = true;
    await new Promise(res => setTimeout(res, 500));
    await moveTo(r.left + Math.min(r.width, 220) + 30, r.top - 6);
    const t = text.toLowerCase();
    let reply = 'Noted! Want to send that to me as a real message?';
    if (/\b(hire|hiring|intern|internship|job|role|position|opportunit|freelance|project|collab|work with)/.test(t)) reply = 'Ooh, that’s the best kind of message. Want to send it to me properly?';
    else if (/\b(hi|hey|hello|hii+|namaste|namaskar|hola|yo)\b/.test(t)) reply = `Hi back ${STAR(11)} Nice to have company. Shall I pass this to my inbox?`;
    else if (/love|nice|cool|amazing|great|beautiful|wow|awesome|stunning/.test(t)) reply = 'That made my day. Send it to my inbox so I can keep it?';
    else if (/\?\s*$/.test(t)) reply = 'Good question. Let me answer it properly: send it to my inbox?';
    const k = await say(reply, { actions: [{ k: 'send', label: 'Send to Akshini' }, { k: 'no', label: 'Not now' }], hold: 9000 });
    busy = false;
    if (k === 'send') open('contact', null, { message: text, subject: 'Hi from your portfolio' });
    else park();
  });

  // ---------- idle nudges ----------
  const tips = [
    () => [$('.dicon'), 'Psst. The folders are case studies. Double-click one.'],
    () => [$('.dock__item[data-app=terminal] .dock__icon'), 'Psst. There’s a Terminal. Try <b>sudo hire-akshini</b>.'],
    () => [$('[data-action=inspect]'), 'Press <kbd>I</kbd> and hover anything. You’ll see the redlines.'],
    () => [$('.widget--radio'), 'Need focus music? This radio composes itself live.'],
    () => [$('.dock__item[data-app=process] .dock__icon'), 'Curious how I work? My process board is in here.'],
  ];
  setInterval(async () => {
    if (!on || busy || following || speaking || isMobile() || document.hidden || nudges >= 3) return;
    if (performance.now() - lastInput < 26000) return;
    const [el, text] = tips[(nudges + Math.floor(rand(0, tips.length))) % tips.length]();
    if (!el || !el.getClientRects().length) return;
    nudges++; busy = true;
    await pointAt(el, .5, .55, .8);
    await say(text, { hold: 5000 });
    busy = false; lastInput = performance.now();
    park();
  }, 4000);

  addEventListener('resize', () => { if (on && !busy && !following) { const p = parkSpot(); place(p.x, p.y); } });

  return {
    greet, appear, follow, openChat,
    stop: () => stopFollow('user'),
    isFollowing: () => following,
    isBusy: () => busy || following || speaking,
    isChatting: () => !chat.hidden,
  };
}
