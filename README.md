# AkshiniOS — portfolio of Akshini Randive

A UI/UX designer's portfolio built as a small, calm operating system. Everything lives in `site/`. It's plain HTML, CSS and JavaScript modules, with no build step.

## Run it locally

```bash
python -m http.server 5178 --directory site
```

Then open http://localhost:5178. It needs a server; ES modules don't load from `file://`.

## Deploy

Live at **https://akshini-randive.pages.dev** (Cloudflare Pages project `akshini-randive`). To redeploy after changes:

```bash
npx wrangler pages deploy site --project-name akshini-randive --branch main
```

## Contact form

The Mail app posts to [FormSubmit](https://formsubmit.co) (`PERSON.formEndpoint` in `js/data.js`). It emails each message to akshinirandive03@gmail.com, with the visitor's address as reply-to. No account or key is needed, but **the first submission only triggers a one-time "Activate Form" email to Akshini**. Once she clicks it, every message is delivered. Until then (or if the relay is down), the Mail app falls back to opening the visitor's own email client with the message ready, so nothing is lost.

## Edit content

- **All words, projects, experience, skills, process stickies:** `site/js/data.js`
- **Project images:** `site/assets/work/*.webp` (originals kept in `originals/`)
- **Share image:** `site/assets/og.png`. The `og:image` URL in `index.html` points at `akshini-randiveportfolio.netlify.app`; change it if the domain changes.

## Map of the OS

| Thing | Where |
|---|---|
| Desktop, menu bar, dock, Spotlight, Inspect, tour, phone home screen | `js/os.js` |
| Windows (drag, resize, snap to edges, minimise, zoom) and phone sheets | `js/wm.js` |
| Every app (Work, case studies, About, Skills, Process board, Experience, Résumé, Mail, Terminal, Radio, Trash, Read Me) | `js/apps.js` |
| Live wallpaper (WebGL, CSS fallback) | `js/wallpaper.js` |
| UI sounds and the generative "Chai & Rain" radio | `js/audio.js` |
| App icon family | `js/icons.js` |

## Things to try

- The first visit of each browser session opens on a handwritten "hello" (English, Marathi, Spanish, French, Hindi, Italian, German). Click or press a key to begin; a soft startup chime plays (`js/hello.js`)
- Akshini's cursor greets you and offers a tour. **Follow mode** drives the OS for you; touch anything to take over. Click her cursor anytime (`js/presence.js`)
- Press `/` for cursor chat. Type something, and she replies and offers to send it to her inbox
- She comments the first time you open each app or case study (the `note` fields in `data.js`), and wanders over with a tip if you go quiet
- UI sounds are on by default (toggle in Control Centre)
- Double-click a folder; `Ctrl/⌘ K` searches everything
- Press `I` for Inspect mode, which shows Figma-style redlines and specs on any element
- Right-click the desktop to add sticky notes and change wallpaper
- In Terminal: `help`, `open pill-mate`, `sudo hire-akshini`
- Try switching off a skill in Skills
- Deep links: `/#/work/pill-mate`, `/#/resume`, `/#/contact`
- `?theme=light|dark` forces a theme; `?still` skips boot, tour and banners (for screenshots)

Respects `prefers-reduced-motion` and `prefers-reduced-transparency`. Logos are real marks (Gil Barbara logos, Simple Icons) and UI glyphs are Lucide (ISC); credits are in `site/assets/icons/*.json`.
