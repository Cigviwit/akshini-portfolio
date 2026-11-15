// Every app in AkshiniOS. Each renderer fills ctx.body and may return a cleanup.
import { PERSON, PROJECTS, EXPERIENCE, SKILLS, TOOLS, PROCESS, TRASH } from './data.js';
import { ICONS, STAR, folderIcon } from './icons.js';
import { g } from './glyphs.js';
import { notify, quickLook, copyText, confetti, esc } from './ui.js';
import { Radio, Sound } from './audio.js';

const $ = (s, r) => r.querySelector(s);
const $$ = (s, r) => [...r.querySelectorAll(s)];
const ext = (href, label, icon = '') => `<a class="btn btn--ghost" href="${href}" target="_blank" rel="noopener">${icon}${label}<span class="btn__arrow">${g('arrow-up-right', 14)}</span></a>`;
const projectById = (id) => PROJECTS.find(p => p.id === id);

export function createApps(sys) {
  const open = (id, origin) => sys.open(id, origin);

  // ---------- Work (Finder) ----------
  function renderWork(ctx) {
    const tags = [...new Set(PROJECTS.flatMap(p => p.tags))];
    const dot = { 'Social Impact': '#D9573A', Mobile: '#3F78B5', Healthcare: '#3E8A62', IoT: '#D8962B', Sustainable: '#5C8A6E', Startup: '#2F4FB0' };
    ctx.body.innerHTML = `
      <div class="finder" data-view="grid" data-layer="Finder">
        <aside class="side" data-layer="Sidebar">
          <p class="side__h">Favourites</p>
          <button class="side__i is-on" type="button" data-filter="all">${g('layout-grid', 15)}<span>All work</span><span class="side__n">${PROJECTS.length}</span></button>
          <p class="side__h">Tags</p>
          ${tags.map(t => `<button class="side__i" type="button" data-filter="${t}"><i class="tagdot" style="--c:${dot[t] || '#8C8478'}"></i><span>${t}</span><span class="side__n">${PROJECTS.filter(p => p.tags.includes(t)).length}</span></button>`).join('')}
          <p class="side__h">Elsewhere</p>
          <a class="side__i" href="${PERSON.behance}" target="_blank" rel="noopener"><img src="assets/icons/si-behance.svg" alt="" class="side__logo"><span>Behance</span>${g('arrow-up-right', 13, 'side__ext')}</a>
          <a class="side__i" href="${PERSON.linkedin}" target="_blank" rel="noopener"><img src="assets/icons/linkedin.svg" alt="" class="side__logo"><span>LinkedIn</span>${g('arrow-up-right', 13, 'side__ext')}</a>
        </aside>
        <div class="finder__main">
          <div class="finder__bar" data-layer="Toolbar">
            <div class="finder__title"><h2>Selected work</h2><span class="finder__sub">Case studies from research to shipped design</span></div>
            <div class="seg" role="group" aria-label="View">
              <button type="button" class="seg__b is-on" data-view="grid" aria-label="Grid view">${g('layout-grid', 15)}</button>
              <button type="button" class="seg__b" data-view="list" aria-label="List view">${g('list', 15)}</button>
            </div>
            <label class="search">${g('search', 14)}<input type="search" placeholder="Search" aria-label="Search work"></label>
          </div>
          <div class="finder__scroll">
            <div class="pgrid">
              ${PROJECTS.map(p => `
                <button class="pcard" type="button" data-open="${p.id}" data-tags="${p.tags.join('|')}" data-q="${(p.name + ' ' + p.tagline + ' ' + p.tags.join(' ')).toLowerCase()}" data-layer="Card / Project">
                  <span class="pcard__frame"><img src="${p.thumb}" alt="" loading="lazy"></span>
                  <span class="pcard__meta"><span class="pcard__vol">Vol. ${p.vol}</span><span>${p.category}</span><span>${p.year}</span></span>
                  <span class="pcard__name">${p.name}</span>
                  <span class="pcard__tag">${p.tagline}</span>
                </button>`).join('')}
            </div>
            <div class="plist" role="table" aria-label="Projects">
              <div class="plist__h" role="row"><span role="columnheader">Name</span><span role="columnheader">Category</span><span role="columnheader">Role</span><span role="columnheader">Duration</span><span role="columnheader">Year</span></div>
              ${PROJECTS.map(p => `
                <button class="plist__r" type="button" role="row" data-open="${p.id}" data-tags="${p.tags.join('|')}" data-q="${(p.name + ' ' + p.tagline + ' ' + p.tags.join(' ')).toLowerCase()}">
                  <span role="cell" class="plist__name"><span class="plist__thumb"><img src="${p.thumb}" alt="" loading="lazy"></span>${p.name}</span>
                  <span role="cell">${p.category}</span><span role="cell">${p.role}</span><span role="cell">${p.duration}</span><span role="cell">${p.year}</span>
                </button>`).join('')}
            </div>
            <p class="finder__empty" hidden>No projects match that search.</p>
          </div>
          <footer class="finder__status"><span class="finder__count">${PROJECTS.length} items</span><span>Click a project to open its case study</span></footer>
        </div>
      </div>`;
    const root = $('.finder', ctx.body);
    let filter = 'all', q = '';
    const apply = () => {
      let n = 0;
      $$('[data-open]', root).forEach(el => {
        const ok = (filter === 'all' || el.dataset.tags.split('|').includes(filter)) && (!q || el.dataset.q.includes(q));
        el.hidden = !ok; if (ok && el.classList.contains('pcard')) n++;
      });
      $('.finder__count', root).textContent = `${n} item${n === 1 ? '' : 's'}`;
      $('.finder__empty', root).hidden = n > 0;
    };
    root.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]');
      if (o) { open('project:' + o.dataset.open, o.querySelector('img') || o); return; }
      const f = e.target.closest('[data-filter]');
      if (f) { filter = f.dataset.filter; $$('[data-filter]', root).forEach(b => b.classList.toggle('is-on', b === f)); apply(); Sound.play('click'); }
      const v = e.target.closest('.seg__b');
      if (v) { root.dataset.view = v.dataset.view; $$('.seg__b', root).forEach(b => b.classList.toggle('is-on', b === v)); Sound.play('click'); }
    });
    $('input', root).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
  }

  // ---------- Case study ----------
  function renderProject(p) {
    return (ctx) => {
      const i = PROJECTS.indexOf(p);
      const next = PROJECTS[(i + 1) % PROJECTS.length];
      const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
      const imgs = [{ src: p.cover, alt: p.name + ' cover' }, ...p.chapters.map(c => ({ src: c.img, alt: c.alt }))];
      ctx.tools.innerHTML = `
        <button class="tbtn" type="button" data-go="${prev.id}" aria-label="Previous project: ${esc(prev.name)}" title="${esc(prev.name)}">${g('chevron-left', 16)}</button>
        <button class="tbtn" type="button" data-go="${next.id}" aria-label="Next project: ${esc(next.name)}" title="${esc(next.name)}">${g('chevron-right', 16)}</button>
        <button class="tbtn" type="button" data-share aria-label="Copy link to this case study" title="Copy link">${g('share', 15)}</button>`;
      ctx.body.innerHTML = `
        <div class="progress" aria-hidden="true"><span></span></div>
        <article class="cs" style="--tint:${p.tint}" data-layer="Case study / ${esc(p.name)}">
          <header class="cs__hero">
            <button class="cs__cover" type="button" data-ql="0" aria-label="View cover full size"><img src="${p.cover}" alt="${esc(p.name)} cover"></button>
            <div class="cs__head">
              <p class="eyebrow">Vol. ${p.vol} — ${p.category} · ${p.year}</p>
              <h1 class="cs__title">${p.name}</h1>
              <p class="cs__tag">${p.tagline}</p>
            </div>
            <dl class="cs__meta" data-layer="Meta grid">
              <div><dt>Role</dt><dd>${p.role}</dd></div>
              <div><dt>Domain</dt><dd>${p.domain}</dd></div>
              <div><dt>Duration</dt><dd>${p.duration}</dd></div>
              <div><dt>Tools</dt><dd>${p.tools}</dd></div>
              ${p.team ? `<div class="cs__team"><dt>Team</dt><dd>${p.team}</dd></div>` : ''}
            </dl>
          </header>
          <section class="cs__intro">
            <div><p class="eyebrow">Overview</p><p class="cs__lead">${p.overview}</p></div>
            <div class="cs__problem"><p class="eyebrow">The challenge</p><p>${p.challenge}</p></div>
          </section>
          ${p.chapters.map((c, k) => `
            <section class="cs__ch" data-layer="Chapter ${String(k + 1).padStart(2, '0')}">
              <div class="cs__chtext">
                <div class="cs__chlead">
                  <span class="cs__num">${String(k + 1).padStart(2, '0')}</span>
                  <p class="eyebrow">${c.kicker}</p>
                  <h2>${c.title}</h2>
                </div>
                <div class="cs__chbody">
                  <p>${c.text}</p>
                  ${c.bullets.length ? `<ul>${c.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
                </div>
              </div>
              <button class="cs__fig" type="button" data-ql="${k + 1}" aria-label="View image full size: ${esc(c.alt)}"><img src="${c.img}" alt="${esc(c.alt)}" loading="lazy"><span class="cs__zoom">${g('zoom-in', 15)}</span></button>
            </section>`).join('')}
          <footer class="cs__end">
            <p class="eyebrow">Next case study</p>
            <button class="cs__next" type="button" data-go="${next.id}">
              <span class="cs__nextimg"><img src="${next.thumb}" alt="" loading="lazy"></span>
              <span class="cs__nexttext"><span class="cs__nextname">${next.name}</span><span>${next.tagline}</span></span>
              <span class="cs__nextarrow">${g('arrow-right', 20)}</span>
            </button>
            <div class="cs__cta">
              <p>Like what you see?</p>
              <button class="btn btn--primary" type="button" data-mail>${g('mail', 15)}Talk to Akshini</button>
            </div>
          </footer>
        </article>`;
      const bar = $('.progress span', ctx.body);
      const onScroll = () => {
        const b = ctx.body; const max = b.scrollHeight - b.clientHeight;
        bar.style.transform = `scaleX(${max > 0 ? b.scrollTop / max : 0})`;
      };
      ctx.body.addEventListener('scroll', onScroll, { passive: true });
      const handler = (e) => {
        const ql = e.target.closest('[data-ql]');
        if (ql) { quickLook(imgs, +ql.dataset.ql); return; }
        const go = e.target.closest('[data-go]');
        if (go) {
          const target = 'project:' + go.dataset.go;
          const r = ctx.el.getBoundingClientRect();
          ctx.close();
          sys.open(target, null, { at: r });
          return;
        }
        if (e.target.closest('[data-share]')) { copyText(location.origin + location.pathname + '#/work/' + p.id, 'Link copied'); return; }
        if (e.target.closest('[data-mail]')) sys.open('contact', e.target.closest('[data-mail]'), { subject: `About ${p.name}` });
      };
      ctx.body.addEventListener('click', handler);
      ctx.tools.addEventListener('click', handler);
    };
  }

  // ---------- About ----------
  function renderAbout(ctx) {
    ctx.body.innerHTML = `
      <div class="about" data-layer="About">
        <aside class="about__card" data-layer="Profile card">
          <div class="about__avatar"><img src="assets/avatar.webp" alt="Portrait of Akshini Randive"></div>
          <h2 class="about__name">${PERSON.name}</h2>
          <p class="about__role">${PERSON.role}</p>
          <p class="about__loc">${g('map-pin', 14)}${PERSON.city}</p>
          <span class="pill pill--live"><i></i>${PERSON.status}</span>
          <div class="about__links">
            <button class="btn btn--primary" type="button" data-mail>${g('mail', 15)}Email Akshini</button>
            <div class="about__soc">
              <a class="iconbtn" href="${PERSON.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn"><img src="assets/icons/linkedin.svg" alt=""></a>
              <a class="iconbtn" href="${PERSON.behance}" target="_blank" rel="noopener" aria-label="Behance"><img src="assets/icons/si-behance.svg" alt=""></a>
              <button class="iconbtn" type="button" data-copy aria-label="Copy email address">${g('copy', 16)}</button>
            </div>
          </div>
        </aside>
        <div class="about__main">
          <p class="about__note">${PERSON.note}</p>
          <div class="about__story">${PERSON.story.map(s => `<p>${s}</p>`).join('')}</div>
          <dl class="facts">${PERSON.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          <blockquote class="about__quote"><span class="about__qmark">“</span>${PERSON.quote}</blockquote>
          <p class="eyebrow">Beyond the pixels</p>
          <ul class="rituals">${PERSON.rituals.map(([ic, t]) => `<li>${g(ic, 18)}<span>${t}</span></li>`).join('')}</ul>
        </div>
      </div>`;
    ctx.body.addEventListener('click', (e) => {
      if (e.target.closest('[data-mail]')) sys.open('contact', e.target.closest('[data-mail]'));
      if (e.target.closest('[data-copy]')) copyText(PERSON.email, 'Email copied');
    });
  }

  // ---------- Skills (System Settings) ----------
  const refusals = ['is a core skill — it stays on.', 'can’t be turned off. Believe me, I tried.', 'is load-bearing. Switching it off would break the portfolio.', 'is managed by your administrator (Akshini).'];
  let refusalN = 0;
  function renderSkills(ctx) {
    ctx.body.innerHTML = `
      <div class="settings" data-layer="System Settings">
        <aside class="side side--settings" data-layer="Sidebar">
          <button class="acct" type="button" data-pane="ui">
            <img src="assets/avatar.webp" alt="">
            <span><strong>${PERSON.name}</strong><small>Designer ID · B.Des ’27</small></span>
          </button>
          ${SKILLS.map((s, i) => `<button class="side__i${i === 0 ? ' is-on' : ''}" type="button" data-pane="${s.id}"><span class="sicon" style="--c:${s.color}">${g(s.icon, 13)}</span><span>${s.title}</span></button>`).join('')}
        </aside>
        <div class="settings__pane" aria-live="polite"></div>
      </div>`;
    const pane = $('.settings__pane', ctx.body);
    const contrast = () => {
      const cs = getComputedStyle(document.documentElement);
      const parse = (v) => { const h = v.trim(); return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
      const lum = (c) => { const [r, gg, b] = c.map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * r + .7152 * gg + .0722 * b; };
      const pairs = [['Body text on window', '--ink', '--win'], ['Secondary text', '--ink-2', '--win'], ['Accent on window', '--accent-ink', '--win']];
      return pairs.map(([n, a, b]) => {
        const L1 = lum(parse(cs.getPropertyValue(a))), L2 = lum(parse(cs.getPropertyValue(b)));
        const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        return { n, r, pass: r >= 4.5, a, b };
      });
    };
    const show = (id) => {
      const s = SKILLS.find(x => x.id === id);
      $$('[data-pane]', ctx.body).forEach(b => b.classList.toggle('is-on', b.dataset.pane === id && b.classList.contains('side__i')));
      let inner = '';
      if (id === 'tools') {
        inner = `<div class="tools">${TOOLS.map(t => `
          <div class="tool" data-layer="Tool / ${t.name}">
            <span class="tool__ic${t.wide ? ' tool__ic--wide' : ''}${t.ink ? ' tool__ic--ink' : ''}">${t.icon ? `<img src="${t.icon}" alt="">` : `<span class="tool__type">${t.name.slice(0, 2)}</span>`}</span>
            <span class="tool__name">${t.name}</span><span class="tool__use">${t.use}</span>
          </div>`).join('')}</div>
          <p class="fine">Product names and logos are trademarks of their owners.</p>`;
      } else {
        inner = `<div class="group" data-layer="Grouped list">${s.items.map((it, k) => `
          <label class="row"><span>${it}</span><input type="checkbox" class="switch" checked data-skill="${esc(it)}" aria-label="${esc(it)}"></label>`).join('')}</div>`;
        if (id === 'a11y') {
          inner += `<p class="eyebrow pane__sub">Live check — this window, right now</p><div class="group">${contrast().map(c => `
            <div class="row row--static"><span class="cswatch" style="background:var(${c.b});color:var(${c.a})">Aa</span><span>${c.n}</span><span class="ratio ${c.pass ? 'is-pass' : ''}">${c.r.toFixed(1)}:1 ${c.pass ? '· AA ✓' : ''}</span></div>`).join('')}</div>
            <p class="fine">Contrast ratios are computed from the OS’s live colour tokens. Switch to dark mode and look again.</p>`;
        }
      }
      pane.innerHTML = `
        <header class="pane__head"><span class="sicon sicon--lg" style="--c:${s.color}">${g(s.icon, 22)}</span><div><h2>${s.title}</h2><p>${s.blurb}</p></div></header>
        ${inner}`;
      pane.scrollTop = 0;
    };
    ctx.body.addEventListener('click', (e) => { const b = e.target.closest('[data-pane]'); if (b) { show(b.dataset.pane); Sound.play('click'); } });
    ctx.body.addEventListener('change', (e) => {
      const sw = e.target.closest('.switch'); if (!sw || sw.checked) return;
      setTimeout(() => { sw.checked = true; }, 420);
      notify({ title: 'Can’t turn that off', body: `${sw.dataset.skill} ${refusals[refusalN++ % refusals.length]}`, icon: ICONS.skills(), timeout: 3600 });
    });
    show('ui');
  }

  // ---------- Process board (FigJam-like) ----------
  function renderProcess(ctx) {
    const SX = 400, SW = 340;
    const colors = { marigold: '#F6CB6A', sky: '#B9D3EC', peach: '#F6B79A', sage: '#B9D3AA' };
    const W = 60 + PROCESS.length * SX, H = 860;
    let stickies = '';
    PROCESS.forEach((s, i) => {
      s.notes.forEach((n, j) => {
        const rot = ((i * 7 + j * 13) % 5 - 2) * .8;
        stickies += `<div class="sticky" style="left:${60 + i * SX + 20 + (j % 2) * 14}px;top:${190 + j * 156}px;--rot:${rot}deg;--c:${colors[s.color]}" data-layer="Sticky / ${esc(n.tag)}"><span class="sticky__tag">${n.tag}</span><p>${n.text}</p><span class="sticky__by">Akshini</span></div>`;
      });
    });
    const arrows = PROCESS.slice(0, -1).map((_, i) => {
      const x1 = 60 + i * SX + SW, x2 = 60 + (i + 1) * SX, y = 128;
      return `<path d="M${x1 + 6} ${y} C ${x1 + 30} ${y - 26}, ${x2 - 30} ${y - 26}, ${x2 - 8} ${y}" /><path d="M${x2 - 15} ${y - 6} L${x2 - 7} ${y} L${x2 - 16} ${y + 3}" />`;
    }).join('');
    ctx.body.innerHTML = `
      <div class="board" data-layer="Board">
        <div class="board__vp">
          <div class="board__canvas" style="width:${W}px;height:${H}px">
            <div class="board__title"><p class="eyebrow">Design approach</p><h2>From raw insight to tested product</h2></div>
            ${PROCESS.map((s, i) => `
              <div class="bsec" style="left:${60 + i * SX}px;width:${SW}px;--c:${colors[s.color]}" data-layer="Section / ${s.title}">
                <span class="bsec__label">Stage ${s.n}</span>
                <h3>${s.title}</h3><p>${s.sub}</p>
              </div>`).join('')}
            <svg class="board__links" width="${W}" height="${H}" aria-hidden="true">${arrows}</svg>
            ${stickies}
            <div class="bcursor" aria-hidden="true">${g('mouse-pointer-2', 18)}<span>Akshini</span></div>
          </div>
        </div>
        <div class="board__tools" role="toolbar" aria-label="Board tools" data-layer="Toolbar">
          <button class="bt is-on" type="button" data-tool="select" aria-label="Move stickies">${g('mouse-pointer-2', 17)}</button>
          <button class="bt" type="button" data-tool="hand" aria-label="Pan the board">${g('hand', 17)}</button>
          <button class="bt bt--sticky" type="button" data-add aria-label="Add a sticky note">${g('sticky-note', 17)}</button>
          <span class="bt__sep"></span>
          <button class="bt" type="button" data-zoom="-1" aria-label="Zoom out">${g('zoom-out', 16)}</button>
          <button class="bt bt__pct" type="button" data-fit aria-label="Zoom to fit">100%</button>
          <button class="bt" type="button" data-zoom="1" aria-label="Zoom in">${g('zoom-in', 16)}</button>
        </div>
        <p class="board__hint">Drag stickies · drag the background or scroll to pan · Ctrl + scroll to zoom</p>
      </div>`;
    const vp = $('.board__vp', ctx.body), cv = $('.board__canvas', ctx.body), pct = $('.bt__pct', ctx.body);
    let s = 1, x = 0, y = 0, tool = 'select';
    const set = () => { cv.style.transform = `translate(${x}px, ${y}px) scale(${s})`; pct.textContent = Math.round(s * 100) + '%'; };
    const fit = () => {
      const r = vp.getBoundingClientRect(); if (!r.width) return;
      s = Math.max(.3, Math.min(1, Math.min(r.width / (W + 40), (r.height - 60) / H)));
      x = (r.width - W * s) / 2; y = Math.max(12, (r.height - 60 - H * s) / 2); set();
    };
    const zoomAt = (f, cx, cy) => {
      const ns = Math.max(.25, Math.min(2.2, s * f));
      x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns; set();
    };
    const ro = new ResizeObserver(fit); ro.observe(vp);
    let drag = null;
    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const st = e.target.closest('.sticky');
      if (st && tool === 'select' && !(st.isContentEditable && e.target === document.activeElement)) {
        const l = parseFloat(st.style.left), t = parseFloat(st.style.top);
        drag = { kind: 'sticky', el: st, px: e.clientX, py: e.clientY, l, t, moved: false };
        st.classList.add('is-lift'); cv.appendChild(st);
      } else if (!st || tool === 'hand') {
        drag = { kind: 'pan', px: e.clientX, py: e.clientY, x, y }; vp.classList.add('is-panning');
      }
      if (drag) vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
      if (drag.kind === 'pan') { x = drag.x + dx; y = drag.y + dy; set(); }
      else { if (Math.hypot(dx, dy) > 3) drag.moved = true; drag.el.style.left = drag.l + dx / s + 'px'; drag.el.style.top = drag.t + dy / s + 'px'; }
    });
    const end = () => {
      if (!drag) return;
      if (drag.kind === 'sticky') { drag.el.classList.remove('is-lift'); if (!drag.moved && drag.el.classList.contains('sticky--new')) { drag.el.focus(); } }
      vp.classList.remove('is-panning'); drag = null;
    };
    vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * .0025), e.clientX - r.left, e.clientY - r.top);
      else { x -= e.deltaX; y -= e.deltaY; set(); }
    }, { passive: false });
    const cols = Object.values(colors); let addN = 0;
    $('.board__tools', ctx.body).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tool) { tool = b.dataset.tool; $$('[data-tool]', ctx.body).forEach(t => t.classList.toggle('is-on', t === b)); vp.dataset.tool = tool; }
      if (b.dataset.zoom) { const r = vp.getBoundingClientRect(); zoomAt(b.dataset.zoom > 0 ? 1.2 : 1 / 1.2, r.width / 2, r.height / 2); }
      if ('fit' in b.dataset) fit();
      if ('add' in b.dataset) {
        const r = vp.getBoundingClientRect();
        const st = document.createElement('div');
        st.className = 'sticky sticky--new';
        st.style.cssText = `left:${(r.width / 2 - x) / s - 110 + addN * 18}px;top:${(r.height / 2 - y) / s - 70 + addN * 18}px;--rot:${(addN % 3 - 1) * 1.5}deg;--c:${cols[addN % cols.length]}`;
        st.innerHTML = `<span class="sticky__tag">You</span><p contenteditable="true" spellcheck="false" aria-label="Sticky note text">Leave Akshini a note…</p><span class="sticky__by">Visitor</span>`;
        addN++; cv.appendChild(st);
        const p = $('p', st); p.focus(); document.getSelection().selectAllChildren(p);
        Sound.play('pop');
      }
    });
    // the collaborator cursor drifts between stickies
    const cur = $('.bcursor', ctx.body);
    const reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ct = 0;
    const wander = () => {
      const st = $$('.sticky', cv); if (!st.length) return;
      const t = st[(ct++ * 3) % st.length];
      cur.style.transform = `translate(${parseFloat(t.style.left) + 180}px, ${parseFloat(t.style.top) + 90}px)`;
    };
    wander();
    const iv = reduceM ? 0 : setInterval(wander, 2600);
    return () => { ro.disconnect(); clearInterval(iv); };
  }

  // ---------- Experience (timeline) ----------
  function renderExperience(ctx) {
    const Y0 = 2023, Y1 = 2027, span = (Y1 - Y0 + 1) * 12;
    const pos = ([y, m]) => ((y - Y0) * 12 + (m - 1)) / span * 100;
    const now = new Date();
    const today = pos([now.getFullYear(), now.getMonth() + 1]) + (now.getDate() / 31) / span * 100;
    const colorVar = { accent: 'var(--accent)', sky: '#3F78B5', sage: '#5C8A6E' };
    ctx.body.innerHTML = `
      <div class="exp" data-layer="Experience">
        <header class="exp__head"><div><p class="eyebrow">Experience</p><h2>Design roles & education</h2></div><p class="exp__sub">A timeline of startup design internships, research work and formal design training.</p></header>
        <div class="tl" data-layer="Timeline">
          <div class="tl__years">${Array.from({ length: Y1 - Y0 + 1 }, (_, i) => `<span>${Y0 + i}</span>`).join('')}</div>
          <div class="tl__grid">
            ${Array.from({ length: Y1 - Y0 + 1 }, () => '<i></i>').join('')}
            ${EXPERIENCE.map((e, i) => {
              const w = Math.max(3.2, pos(e.end) - pos(e.start) + 100 / span);
              return `
              <button class="tl__bar${w < 14 ? ' is-narrow' : ''}" type="button" data-exp="${e.id}" style="left:${pos(e.start)}%;width:${w}%;top:${16 + i * 42}px;--c:${colorVar[e.color]}" aria-label="${esc(e.title)}, ${e.when}">
                <span>${e.org}<small>${e.when}</small></span>
              </button>`;
            }).join('')}
            ${today >= 0 && today <= 100 ? `<span class="tl__today" style="left:${today}%"><b>Today</b></span>` : ''}
          </div>
        </div>
        <ol class="exp__list">
          ${EXPERIENCE.map(e => `
            <li class="xcard" id="x-${e.id}" style="--c:${colorVar[e.color]}" data-layer="Card / ${esc(e.org)}">
              <div class="xcard__when"><span>${e.when}</span><span class="xcard__kind">${e.kind}</span></div>
              <div class="xcard__body">
                <h3>${e.title}</h3>
                <p class="xcard__org">${e.org} · ${e.where}</p>
                <p>${e.text}</p>
                <ul class="chips">${e.tags.map(t => `<li>${t}</li>`).join('')}</ul>
              </div>
            </li>`).join('')}
        </ol>
      </div>`;
    ctx.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-exp]'); if (!b) return;
      const card = $('#x-' + b.dataset.exp, ctx.body);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
    });
  }

  // ---------- Résumé (Preview) ----------
  function renderResume(ctx) {
    ctx.tools.innerHTML = `
      <button class="tbtn" type="button" data-z="-1" aria-label="Zoom out">${g('zoom-out', 15)}</button>
      <button class="tbtn" type="button" data-z="1" aria-label="Zoom in">${g('zoom-in', 15)}</button>
      <a class="tbtn tbtn--label" href="${PERSON.resumePdf}" target="_blank" rel="noopener">${g('download', 15)}<span>PDF</span></a>`;
    ctx.body.innerHTML = `
      <div class="preview" data-layer="Preview">
        <div class="paper" data-layer="Page / A4">
          <header class="paper__head">
            <div><h1>${PERSON.name}</h1><p>${PERSON.role}</p></div>
            <ul><li>${PERSON.email}</li><li>${PERSON.city}</li><li><a href="${PERSON.linkedin}" target="_blank" rel="noopener">LinkedIn</a> · <a href="${PERSON.behance}" target="_blank" rel="noopener">Behance</a></li></ul>
          </header>
          <p class="paper__summary">${PERSON.intro}</p>
          <div class="paper__cols">
            <div>
              <h2>Experience</h2>
              ${EXPERIENCE.filter(e => e.kind !== 'Education').map(e => `<div class="paper__item"><div class="paper__row"><strong>${e.title}</strong><span>${e.when}</span></div><em>${e.org} · ${e.where}</em><p>${e.text}</p></div>`).join('')}
              <h2>Selected projects</h2>
              ${PROJECTS.map(p => `<div class="paper__item"><div class="paper__row"><strong>${p.name}</strong><span>${p.year}</span></div><p>${p.tagline}. ${p.role}, ${p.duration}.</p></div>`).join('')}
            </div>
            <div>
              <h2>Education</h2>
              <div class="paper__item"><strong>B.Des, UI/UX</strong><em>MIT World Peace University, Pune</em><p>2023 – 2027</p></div>
              <h2>Skills</h2>
              <p class="paper__list">UI/UX design · Wireframing · Prototyping · Visual storytelling · Branding · Graphic design · Design thinking · Problem solving · User research · Attention to detail · Collaboration · Communication</p>
              <h2>Tools</h2>
              <p class="paper__list">Figma · FigJam · Adobe Illustrator · Adobe Photoshop · Framer · ProtoPie · Maze · Notion</p>
            </div>
          </div>
        </div>
        <p class="preview__note">Want the original? <a href="${PERSON.resumePdf}" target="_blank" rel="noopener">Open the full résumé PDF ${g('arrow-up-right', 13)}</a></p>
      </div>`;
    const paper = $('.paper', ctx.body); let z = 1;
    ctx.tools.addEventListener('click', (e) => { const b = e.target.closest('[data-z]'); if (!b) return; z = Math.max(.6, Math.min(1.6, z + (+b.dataset.z) * .15)); paper.style.zoom = z; });
  }

  // ---------- Mail (Contact) ----------
  function renderContact(ctx, opts = {}) {
    ctx.body.innerHTML = `
      <form class="mail" name="contact" method="POST" data-layer="Compose">
        <p hidden><label>Leave empty <input name="bot-field"></label></p>
        <div class="mail__bar">
          <button class="btn btn--primary mail__send" type="submit">${g('send', 15)}Send</button>
          <span class="mail__hint">Usually replies within 24 hours</span>
        </div>
        <div class="mail__field"><span>To:</span><span class="tochip"><img src="assets/avatar.webp" alt="">${PERSON.name}</span></div>
        <label class="mail__field"><span>Name:</span><input name="name" autocomplete="name" required placeholder="Your name"></label>
        <label class="mail__field"><span>From:</span><input name="email" type="email" autocomplete="email" required placeholder="you@company.com"></label>
        <label class="mail__field"><span>Subject:</span><input name="subject" value="${esc(opts.subject || 'Let’s work together')}"></label>
        <textarea name="message" required aria-label="Message" placeholder="Hi Akshini, I’d love to talk about…">${esc(opts.message || '')}</textarea>
        <footer class="mail__alt">
          <span>Or reach out directly</span>
          <button class="chipbtn" type="button" data-copy>${g('copy', 13)}${PERSON.email}</button>
          <a class="chipbtn" href="${PERSON.linkedin}" target="_blank" rel="noopener"><img src="assets/icons/linkedin.svg" alt="">LinkedIn</a>
          <a class="chipbtn" href="${PERSON.behance}" target="_blank" rel="noopener"><img src="assets/icons/si-behance.svg" alt="">Behance</a>
        </footer>
      </form>`;
    const form = $('form', ctx.body);
    $('[data-copy]', form).addEventListener('click', () => copyText(PERSON.email, 'Email copied'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const send = $('.mail__send', form); send.disabled = true; send.classList.add('is-sending');
      let ok = false;
      try {
        if (fd.get('bot-field')) ok = true; // a bot filled the hidden field: pretend it worked, send nothing
        else {
          // FormSubmit relays the message to Akshini's inbox; the visitor's address becomes the reply-to.
          const res = await fetch(PERSON.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              name: fd.get('name'), email: fd.get('email'), message: fd.get('message'),
              _subject: `Portfolio message: ${fd.get('subject') || 'Hello'} (from ${fd.get('name')})`,
              _replyto: fd.get('email'), _template: 'box', _captcha: 'false',
            }),
          });
          const j = await res.json().catch(() => ({}));
          ok = res.ok && String(j.success) === 'true';
        }
      } catch { ok = false; }
      if (ok) {
        Sound.play('send');
        const a = ctx.el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(40px,-60vh) scale(.4) rotate(-6deg)', opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
        a.onfinish = () => ctx.close();
        notify({ title: 'Message sent ✦', body: `Thanks, ${fd.get('name')}. Akshini usually replies within 24 hours.`, icon: ICONS.contact(), timeout: 6000 });
      } else {
        const body = `${fd.get('message')}\n\n— ${fd.get('name')} (${fd.get('email')})`;
        location.href = `mailto:${PERSON.email}?subject=${encodeURIComponent(fd.get('subject') || '')}&body=${encodeURIComponent(body)}`;
        notify({ title: 'Opening your mail app', body: 'Your message is ready to send from your own email.', icon: ICONS.contact() });
        send.disabled = false; send.classList.remove('is-sending');
      }
    });
    setTimeout(() => $('input[name=name]', form)?.focus({ preventScroll: true }), 420);
  }

  // ---------- Terminal ----------
  function renderTerminal(ctx) {
    ctx.body.innerHTML = `
      <div class="term" data-layer="Terminal">
        <div class="term__out" aria-live="polite"></div>
        <form class="term__line"><span class="term__ps">akshini@os&nbsp;~&nbsp;%</span><input class="term__in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input"></form>
      </div>`;
    const out = $('.term__out', ctx.body), input = $('.term__in', ctx.body), root = $('.term', ctx.body);
    const hist = []; let hi = 0;
    const print = (html, cls = '') => { const d = document.createElement('div'); d.className = 'term__l ' + cls; d.innerHTML = html; out.appendChild(d); root.scrollTop = root.scrollHeight; };
    const ids = PROJECTS.map(p => p.id);
    const appsList = ['work', 'about', 'skills', 'process', 'experience', 'resume', 'contact', 'radio', 'trash', 'readme'];
    const cmds = {
      help: () => print(`<span class="t-dim">available commands</span>
  <b>whoami</b>              who is this designer?
  <b>ls</b> [work]           list things
  <b>open</b> &lt;name&gt;         open an app or project (try <i>open pill-mate</i>)
  <b>skills</b>              what I do
  <b>contact</b>             ways to reach me
  <b>resume</b>              open the résumé
  <b>theme</b> light|dark    switch appearance
  <b>wallpaper</b> chai|monsoon|dusk
  <b>inspect</b>             toggle Inspect mode
  <b>chai</b>                ☕
  <b>clear</b>               clear the screen
  <b>sudo hire-akshini</b>   the best command`),
      whoami: () => print(`<b>${PERSON.name}</b> — ${PERSON.role}\n${PERSON.intro}\n<span class="t-acc">${PERSON.status}</span>`),
      ls: (a) => {
        if (a[0] === 'work' || a[0] === 'projects') print(PROJECTS.map(p => `<span class="t-acc">${p.id}/</span>  ${p.tagline}`).join('\n'));
        else print(`<span class="t-acc">work/</span>  <span class="t-acc">process/</span>  about.txt  skills.cfg  experience.ics  resume.pdf  readme.txt  .chai`);
      },
      open: (a) => {
        const n = (a[0] || '').toLowerCase().replace(/\/$/, '');
        if (ids.includes(n)) { sys.open('project:' + n); print(`opening ${n}…`, 't-dim'); }
        else if (appsList.includes(n) || n === 'mail') { sys.open(n === 'mail' ? 'contact' : n); print(`opening ${n}…`, 't-dim'); }
        else print(`open: no such file or app: ${esc(n || '(nothing)')}\ntry: ${[...ids, ...appsList].join(', ')}`, 't-err');
      },
      skills: () => print(SKILLS.filter(s => s.items.length).map(s => `<b>${s.title}</b>\n  ${s.items.join(' · ')}`).join('\n')),
      contact: () => print(`email     <a href="mailto:${PERSON.email}">${PERSON.email}</a>\nlinkedin  <a href="${PERSON.linkedin}" target="_blank" rel="noopener">linkedin.com/in/akshini-randive</a>\nbehance   <a href="${PERSON.behance}" target="_blank" rel="noopener">behance.net/akshinirandive</a>`),
      email: () => cmds.contact(),
      resume: () => { sys.open('resume'); print('opening resume.pdf…', 't-dim'); },
      theme: (a) => { if (a[0] === 'light' || a[0] === 'dark') { sys.setTheme(a[0]); print(`appearance → ${a[0]}`); } else print('usage: theme light|dark', 't-err'); },
      wallpaper: (a) => { if (['chai', 'monsoon', 'dusk'].includes(a[0])) { sys.setWallpaper(a[0]); print(`wallpaper → ${a[0]}`); } else print('usage: wallpaper chai|monsoon|dusk', 't-err'); },
      inspect: () => { sys.toggleInspect(); print('inspect mode toggled — hover anything. press I to exit.'); },
      chai: () => print(`<span class="t-acc">     ( (\n      ) )\n   ........\n   |      |]\n   \\      /\n    \`----'</span>\n  adrak chai, brewing… ready in 4 min.`),
      date: () => print(new Date().toString()),
      echo: (a) => print(esc(a.join(' '))),
      clear: () => { out.innerHTML = ''; },
      exit: () => ctx.close(),
      sudo: (a) => {
        if (a.join(' ') === 'hire-akshini' || a.join(' ') === 'hire akshini') {
          print('[sudo] password for recruiter: ••••••••', 't-dim');
          setTimeout(() => { print('<span class="t-ok">✔ permission granted. excellent decision.</span>\nopening a new message…'); confetti(); Sound.play('send'); setTimeout(() => sys.open('contact', null, { subject: 'We’d like to hire you' }), 900); }, 700);
        } else print('sudo: nice try. try <b>sudo hire-akshini</b>', 't-err');
      },
      rm: () => print('rm: permission denied. the work stays.', 't-err'),
    };
    print(`<span class="t-dim">AkshiniOS 26.0 (Adrak) — last login: ${new Date().toDateString()}</span>\nType <b>help</b> to see what I can do.`);
    $('.term__line', ctx.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = input.value.trim(); input.value = '';
      print(`<span class="term__ps">akshini@os ~ %</span> ${esc(raw)}`, 'term__echo');
      if (!raw) return;
      hist.push(raw); hi = hist.length;
      const [c, ...a] = raw.split(/\s+/);
      (cmds[c.toLowerCase()] || (() => print(`zsh: command not found: ${esc(c)}. type <b>help</b>`, 't-err')))(a);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) input.value = hist[++hi]; else { hi = hist.length; input.value = ''; } }
      if (e.key === 'Tab') {
        e.preventDefault();
        const parts = input.value.split(' '); const last = parts.pop();
        const pool = parts.length ? [...ids, ...appsList, 'light', 'dark', 'chai', 'monsoon', 'dusk', 'work', 'hire-akshini'] : Object.keys(cmds);
        const m = pool.filter(x => x.startsWith(last));
        if (m.length === 1) input.value = [...parts, m[0]].join(' ') + ' ';
        else if (m.length > 1) print(m.join('  '), 't-dim');
      }
    });
    root.addEventListener('pointerup', () => { if (!getSelection().toString()) input.focus(); });
    setTimeout(() => input.focus({ preventScroll: true }), 400);
  }

  // ---------- Radio ----------
  function renderRadio(ctx) {
    ctx.body.innerHTML = `
      <div class="radio" data-layer="Radio">
        <div class="radio__disc"><div class="vinyl"><span class="vinyl__label">${STAR(18)}</span></div><span class="tonearm"></span></div>
        <div class="radio__info"><p class="eyebrow">Generative ambient · live</p><h2>Chai & Rain</h2><p class="radio__sub">Composed in your browser, never the same twice.</p></div>
        <canvas class="radio__viz" width="560" height="80" aria-hidden="true"></canvas>
        <div class="radio__ctl">
          <button class="playbtn" type="button" aria-label="Play">${g('play', 22)}</button>
          <label class="vol">${g('volume-2', 16)}<input type="range" min="0" max="1" step="0.01" value="${Radio.volume}" aria-label="Volume"></label>
        </div>
      </div>`;
    const root = $('.radio', ctx.body), btn = $('.playbtn', root), cv = $('.radio__viz', root), c2 = cv.getContext('2d');
    const sync = () => { root.classList.toggle('is-on', Radio.playing); btn.innerHTML = g(Radio.playing ? 'pause' : 'play', 22); btn.setAttribute('aria-label', Radio.playing ? 'Pause' : 'Play'); };
    btn.addEventListener('click', () => Radio.toggle());
    $('input', root).addEventListener('input', (e) => Radio.setVolume(+e.target.value));
    const off = Radio.on(sync); sync();
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const lv = Radio.levels(28), w = cv.width, h = cv.height, bw = w / lv.length;
      c2.clearRect(0, 0, w, h);
      c2.fillStyle = getComputedStyle(root).getPropertyValue('--accent').trim() || '#C65A2E';
      lv.forEach((v, i) => { const bh = Math.max(3, v * h * .95); c2.globalAlpha = .35 + v * .65; c2.beginPath(); c2.roundRect(i * bw + 2, h - bh, bw - 4, bh, 3); c2.fill(); });
    };
    draw();
    return () => { cancelAnimationFrame(raf); off(); };
  }

  // ---------- Trash ----------
  function renderTrash(ctx) {
    const fileIc = (k) => `<span class="fic fic--${k}">${k.toUpperCase()}</span>`;
    ctx.body.innerHTML = `
      <div class="trash" data-layer="Trash">
        <div class="trash__bar"><p><strong>Trash</strong> · Things that never make it into Akshini’s work</p><button class="btn btn--ghost" type="button" data-empty>${g('trash-2', 15)}Empty Trash</button></div>
        <div class="trash__grid">${TRASH.map((t, i) => `<button class="tfile" type="button" data-i="${i}">${fileIc(t.icon)}<span>${t.name}</span></button>`).join('')}</div>
        <p class="trash__why" aria-live="polite">Select a file to see why it was deleted.</p>
      </div>`;
    const why = $('.trash__why', ctx.body);
    ctx.body.addEventListener('click', (e) => {
      const f = e.target.closest('.tfile');
      if (f) { $$('.tfile', ctx.body).forEach(x => x.classList.toggle('is-sel', x === f)); const t = TRASH[+f.dataset.i]; why.innerHTML = `<strong>${t.name}</strong> — ${t.why}`; Sound.play('click'); }
      if (e.target.closest('[data-empty]')) {
        $$('.tfile', ctx.body).forEach((x, i) => x.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(30px) scale(.6) rotate(8deg)', opacity: 0 }], { duration: 320, delay: i * 50, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }));
        setTimeout(() => { $('.trash__grid', ctx.body).innerHTML = '<p class="trash__empty">Trash is empty. Good riddance.</p>'; why.textContent = ''; }, 320 + TRASH.length * 50);
        Sound.play('close');
      }
    });
  }

  // ---------- Read Me ----------
  function renderReadme(ctx) {
    const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
    ctx.body.innerHTML = `
      <div class="note" data-layer="Note">
        <p class="note__date">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h2>Welcome to AkshiniOS ${STAR(16)}</h2>
        <p>I design interfaces, so my portfolio is one. Everything here is a working UI — poke at it.</p>
        <ul class="note__list">
          <li><span>Get a guided tour</span><em>click my cursor</em></li>
          <li><span>Open a case study</span><em>double-click a folder</em></li>
          <li><span>Find anything</span><kbd>${mod}</kbd><kbd>K</kbd></li>
          <li><span>See the redlines</span><kbd>I</kbd></li>
          <li><span>More options</span><em>right-click the desktop</em></li>
          <li><span>Chat with me</span><kbd>/</kbd></li>
          <li><span>Best command</span><code>sudo hire-akshini</code></li>
        </ul>
        <p class="note__h">In a hurry?</p>
        <div class="note__quick">
          <button class="btn btn--primary" type="button" data-o="work">${g('briefcase', 15)}See my work</button>
          <button class="btn btn--ghost" type="button" data-o="resume">${g('file-text', 15)}Résumé</button>
          <button class="btn btn--ghost" type="button" data-o="contact">${g('mail', 15)}Email me</button>
        </div>
        <p class="note__sign">— Akshini</p>
      </div>`;
    ctx.body.addEventListener('click', (e) => { const b = e.target.closest('[data-o]'); if (b) sys.open(b.dataset.o, b); });
  }

  // ---------- About this OS ----------
  function renderAboutOS(ctx) {
    ctx.body.innerHTML = `
      <div class="aos" data-layer="About this OS">
        <div class="aos__logo">${STAR(64)}</div>
        <h2>AkshiniOS</h2>
        <p class="aos__ver">Version 26.0 “Adrak”</p>
        <dl class="aos__spec">
          <div><dt>Designer</dt><dd>${PERSON.name}</dd></div>
          <div><dt>Chip</dt><dd>Curiosity, research-grade</dd></div>
          <div><dt>Memory</dt><dd>4 case studies, 24+ interviews</dd></div>
          <div><dt>Graphics</dt><dd>Figma auto-layout</dd></div>
          <div><dt>Startup disk</dt><dd>B.Des UI/UX · MIT-WPU</dd></div>
          <div><dt>Power</dt><dd>Adrak chai, hot</dd></div>
        </dl>
        <button class="btn btn--ghost" type="button" data-o="about">More info…</button>
        <p class="fine">™ and © 2026 Akshini Randive. All rights reserved.</p>
      </div>`;
    ctx.body.addEventListener('click', (e) => { if (e.target.closest('[data-o]')) { sys.open('about', e.target); } });
  }

  // ---------- registry ----------
  const APPS = {
    work: { title: 'Work', menu: 'Finder', icon: ICONS.work, w: 1040, h: 680, minW: 520, render: renderWork, kw: 'projects case studies portfolio finder folders' },
    about: { title: 'About Akshini', menu: 'About', icon: ICONS.about, w: 900, h: 660, minW: 460, render: renderAbout, kw: 'bio story profile who' },
    skills: { title: 'Skills', menu: 'System Settings', icon: ICONS.skills, w: 860, h: 620, minW: 560, render: renderSkills, kw: 'settings tools figma research toolkit' },
    process: { title: 'Process Board', menu: 'Board', icon: ICONS.process, w: 1120, h: 680, minW: 520, render: renderProcess, kw: 'approach pipeline figjam method stages' },
    experience: { title: 'Experience', menu: 'Calendar', icon: ICONS.experience, w: 880, h: 680, minW: 460, render: renderExperience, kw: 'timeline internships education jobs' },
    resume: { title: 'Résumé.pdf', menu: 'Preview', icon: ICONS.resume, w: 820, h: 760, minW: 420, render: renderResume, kw: 'cv resume pdf download' },
    contact: { title: 'New Message', menu: 'Mail', icon: ICONS.contact, w: 660, h: 580, minW: 420, render: renderContact, kw: 'email mail hire contact message' },
    terminal: { title: 'Terminal — akshini@os', menu: 'Terminal', icon: ICONS.terminal, w: 700, h: 460, minW: 420, render: renderTerminal, kw: 'shell command line cli', cls: 'win--dark' },
    radio: { title: 'Radio', menu: 'Radio', icon: ICONS.radio, w: 420, h: 520, minW: 360, render: renderRadio, kw: 'music ambient lofi sound', resizable: false },
    trash: { title: 'Trash', menu: 'Finder', icon: ICONS.trash, w: 680, h: 440, minW: 420, render: renderTrash, kw: 'bin deleted' },
    readme: { title: 'Read Me.txt', menu: 'Notes', icon: ICONS.readme, w: 480, h: 620, minW: 360, render: renderReadme, kw: 'help welcome guide start' },
    aboutos: { title: 'About This OS', menu: 'AkshiniOS', icon: ICONS.logo, w: 380, h: 570, render: renderAboutOS, resizable: false, kw: 'version system' },
  };

  function resolve(id, opts) {
    if (id.startsWith('project:')) {
      const p = projectById(id.slice(8)); if (!p) return null;
      return { title: p.name, menu: 'Preview', icon: ICONS.work, w: 1060, h: 760, minW: 460, render: renderProject(p) };
    }
    const a = APPS[id]; if (!a) return null;
    if (id === 'contact' && opts) return { ...a, render: (ctx) => renderContact(ctx, opts) };
    return a;
  }

  return { APPS, resolve, folderIcon };
}
