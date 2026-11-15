// Hand-drawn app icon family for AkshiniOS. 64-unit grid, squircle tiles.
const SQ = 'M32 1.5c17.6 0 22.4 0 26.2 3.8S62.5 14.4 62.5 32s0 22.4-3.8 26.2S49.6 62.5 32 62.5s-22.4 0-26.2-3.8S1.5 49.6 1.5 32s0-22.4 3.8-26.2S14.4 1.5 32 1.5z';
let uid = 0;
const tile = (stops, body, extra = '') => {
  const id = 'ai' + (uid++);
  return `<svg viewBox="0 0 64 64" class="appicon" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>${extra}</defs><path d="${SQ}" fill="url(#${id})"/><path d="${SQ}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>${body}</svg>`;
};

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const ICONS = {
  work: () => tile(['#EC8A5A', '#C1542A'], `
    <path d="M13 22a4 4 0 0 1 4-4h9l4 4h17a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="#FBE3D1"/>
    <path d="M13 28a4 4 0 0 1 4-4h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="#FFF6EE"/>
    <path d="M32 31.5l1.6 4.2 4.4 1.6-4.4 1.6L32 43.1l-1.6-4.2-4.4-1.6 4.4-1.6z" fill="#C1542A"/>`),

  about: () => {
    const id = 'av' + (uid++);
    return tile(['#F7EFE3', '#E6D6BF'], `
    <circle cx="32" cy="32" r="21" fill="#fff"/>
    <image href="assets/avatar.webp" x="12.5" y="12.5" width="39" height="39" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="32" cy="32" r="19.5" fill="none" stroke="rgba(28,25,21,.12)"/>`, `<clipPath id="${id}"><circle cx="32" cy="32" r="19.5"/></clipPath>`);
  },

  skills: () => tile(['#6B655E', '#2E2A26'], `
    <g stroke-linecap="round" stroke-width="3.2">
      <path d="M16 22h32" stroke="rgba(255,255,255,.28)"/><path d="M16 32h32" stroke="rgba(255,255,255,.28)"/><path d="M16 42h32" stroke="rgba(255,255,255,.28)"/>
      <path d="M16 22h20" stroke="#F0B44C"/><path d="M16 32h10" stroke="#9DBB8F"/><path d="M16 42h26" stroke="#EB8B5E"/>
    </g>
    <circle cx="36" cy="22" r="4.6" fill="#fff"/><circle cx="26" cy="32" r="4.6" fill="#fff"/><circle cx="42" cy="42" r="4.6" fill="#fff"/>`),

  process: () => tile(['#FFFFFF', '#EEE8DF'], `
    <path d="M22 41c6 6 14 6 20-2" fill="none" stroke="#1C1915" stroke-width="1.6" stroke-dasharray="2.5 2.5" stroke-linecap="round"/>
    <rect x="11" y="13" width="20" height="20" rx="2.5" fill="#F4C25B" transform="rotate(-6 21 23)"/>
    <rect x="34" y="16" width="19" height="19" rx="2.5" fill="#A9C79B" transform="rotate(5 43 25)"/>
    <rect x="35" y="36" width="16" height="16" rx="2.5" fill="#F2A27C" transform="rotate(-3 43 44)"/>
    <path d="M15 20h11M15 24h8" stroke="rgba(28,25,21,.45)" stroke-width="1.6" stroke-linecap="round" transform="rotate(-6 21 23)"/>`),

  experience: () => {
    const d = new Date();
    const id = 'cl' + (uid++);
    return `<svg viewBox="0 0 64 64" class="appicon" aria-hidden="true"><defs><clipPath id="${id}"><path d="${SQ}"/></clipPath></defs>
      <path d="${SQ}" fill="#FFFDF9"/><g clip-path="url(#${id})"><rect width="64" height="19" fill="#D9573A"/></g>
      <text x="32" y="14.2" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="#fff">${months[d.getMonth()]}</text>
      <text x="32" y="50" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="29" font-weight="500" fill="#1C1915">${d.getDate()}</text>
      <path d="${SQ}" fill="none" stroke="rgba(28,25,21,.12)" stroke-width=".8"/></svg>`;
  },

  resume: () => tile(['#86A9C9', '#4B7299'], `
    <path d="M19 11h18l9 9v31a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3z" fill="#fff"/>
    <path d="M37 11v6a3 3 0 0 0 3 3h6" fill="#DCE7F1"/>
    <path d="M21 27h14M21 32h20M21 37h18M21 42h12" stroke="#B8C9D9" stroke-width="2" stroke-linecap="round"/>
    <rect x="21" y="17" width="10" height="5" rx="1.2" fill="#C65A2E"/>`),

  contact: () => tile(['#6FA8DC', '#2F6DB0'], `
    <rect x="12" y="19" width="40" height="27" rx="4" fill="#fff"/>
    <path d="M13.5 21.5L32 35l18.5-13.5" fill="none" stroke="#9DBEDC" stroke-width="2.4" stroke-linejoin="round"/>`),

  terminal: () => tile(['#3A3530', '#14110F'], `
    <path d="M17 24l8 7-8 7" fill="none" stroke="#F3ECE2" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="29" y="36" width="13" height="3.4" rx="1.2" fill="#F0B44C"/>`),

  radio: () => tile(['#7E9E78', '#3C5A3E'], `
    <circle cx="32" cy="32" r="19" fill="#191613"/>
    <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,.08)"/><circle cx="32" cy="32" r="11.5" fill="none" stroke="rgba(255,255,255,.08)"/>
    <circle cx="32" cy="32" r="7" fill="#F0B44C"/><circle cx="32" cy="32" r="1.6" fill="#191613"/>
    <path d="M18 24a16 16 0 0 1 9-9" stroke="rgba(255,255,255,.35)" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),

  trash: () => `<svg viewBox="0 0 64 64" class="appicon" aria-hidden="true">
    <defs><linearGradient id="tr${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9D4CC" stop-opacity=".8"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#CFC9C0" stop-opacity=".8"/></linearGradient></defs>
    <path d="M15 16h34l-3.2 39a4 4 0 0 1-4 3.6H22.2a4 4 0 0 1-4-3.6z" fill="url(#tr${uid++})" stroke="rgba(28,25,21,.22)" stroke-width="1"/>
    <path d="M24 22l1.6 30M32 22v30M40 22l-1.6 30" stroke="rgba(28,25,21,.18)" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="12" y="11" width="40" height="6" rx="3" fill="#EDE8E1" stroke="rgba(28,25,21,.22)" stroke-width="1"/></svg>`,

  readme: () => `<svg viewBox="0 0 64 64" class="appicon" aria-hidden="true">
    <path d="M14 5h26l12 12v40a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#FFFDF8" stroke="rgba(28,25,21,.16)"/>
    <path d="M40 5v9a3 3 0 0 0 3 3h9" fill="#EFE9DF" stroke="rgba(28,25,21,.16)"/>
    <path d="M18 24h22M18 29h26M18 34h24M18 39h18" stroke="#CFC6B8" stroke-width="1.8" stroke-linecap="round"/>
    <text x="31.5" y="54" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="7.5" font-weight="600" fill="#8C8478">TXT</text></svg>`,

  pdf: () => `<img src="assets/icons/pdf2.svg" alt="" class="appicon appicon--img" draggable="false">`,

  logo: () => `<svg viewBox="0 0 64 64" class="appicon" aria-hidden="true"><path d="M32 6c1.6 12.6 7.4 18.4 20 20-12.6 1.6-18.4 7.4-20 20-1.6-12.6-7.4-18.4-20-20 12.6-1.6 18.4-7.4 20-20z" fill="currentColor"/></svg>`,
};

// The ✦ mark used across the OS.
export const STAR = (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.7 5.6 3.9 8.8 9.5 9.5-5.6.7-8.8 3.9-9.5 9.5-.7-5.6-3.9-8.8-9.5-9.5 5.6-.7 8.8-3.9 9.5-9.5z" fill="currentColor"/></svg>`;

// A project folder icon: tinted folder with the cover peeking out.
export const folderIcon = (p) => `
  <span class="folder" style="--tint:${p.tint}">
    <span class="folder__back"></span>
    <span class="folder__paper"><img src="${p.thumb}" alt="" loading="lazy" draggable="false"></span>
    <span class="folder__front"></span>
  </span>`;
