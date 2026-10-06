// design.mjs — "design roller": picks a coherent but DIFFERENT visual system per client (palette + structural axes) and emits
// :root tokens + theme CSS on top of the base class vocabulary. Same seed => same result; different business => different look.
// Every axis changes STRUCTURE (header, hero composition, shapes, buttons, section rhythm, cards, type, motif, density), not only colours.
import { parseHex, contrast } from './css.mjs';

function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = hash(String(seed)); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const hex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = parseHex(a), B = parseHex(b); return hex(A.map((v, i) => v * (1 - t) + B[i] * t)); };
const ratio = (a, b) => contrast(parseHex(a), parseHex(b));
function ensure(fg, bg, min = 4.5, toward = null) { let c = fg, n = 0; const t = toward || (ratio('#000000', bg) > ratio('#ffffff', bg) ? '#000000' : '#ffffff'); while (ratio(c, bg) < min && n++ < 40) c = mix(c, t, 0.08); return c; }

// ink, paper, call (CTA), link. NOT navy+amber (that is the previous client's look).
const PALETTES = [
  ['Moss', '#1f3a2e', '#f2f0e6', '#c2410c', '#1d6a4a'], ['Ink & Lime', '#14181f', '#f6f6f0', '#b7f34a', '#0b6b4f'],
  ['Plum', '#3a1f3d', '#f6f0f4', '#0e7c66', '#7a2a78'], ['Clay', '#3b2a24', '#f5ede4', '#b4492b', '#8a3a1c'],
  ['Slate & Coral', '#1e293b', '#f1f5f9', '#e4572e', '#1d4f91'], ['Clinic Teal', '#0f3d3e', '#f3f8f7', '#0f766e', '#0b5f87'],
  ['Sand & Black', '#111111', '#efe9dc', '#ff6b00', '#7a3b00'], ['Forest Gold', '#17301f', '#f6f3e8', '#e2b33d', '#1f6b3a'],
  ['Burgundy', '#3b0d1a', '#faf3ee', '#9f1239', '#8a1030'], ['Graphite Mint', '#1b1f24', '#f3f6f5', '#2dd4bf', '#0f6b66'],
  ['Olive Terracotta', '#35311a', '#f6f1e1', '#a3471f', '#6b5a10'], ['Cobalt & Cream', '#16275c', '#f7f3ea', '#e5484d', '#1a3fa0'],
  ['Charcoal Orange', '#26282b', '#f4f2ee', '#e8590c', '#a63f00'], ['Aubergine Sun', '#2b1b3a', '#f7f4ef', '#f59f00', '#6a2f8f'],
];
// Greek-capable pairings (display, body). Weights listed are the ones that exist in the variable files.
const PAIRINGS = [
  { name: 'Brygada + Manrope', display: 'Brygada 1918', body: 'Manrope', dw: 600, kind: 'serif' },
  { name: 'Commissioner + Source Sans 3', display: 'Commissioner', body: 'Source Sans 3', dw: 750, kind: 'sans' },
  { name: 'EB Garamond + IBM Plex Sans', display: 'EB Garamond', body: 'IBM Plex Sans', dw: 600, kind: 'serif' },
  { name: 'Roboto Slab + Fira Sans', display: 'Roboto Slab', body: 'Fira Sans', dw: 700, kind: 'slab' },
  { name: 'Sofia Sans Condensed + Source Sans 3', display: 'Sofia Sans Condensed', body: 'Source Sans 3', dw: 800, kind: 'condensed' },
  { name: 'Literata + Commissioner', display: 'Literata', body: 'Commissioner', dw: 600, kind: 'serif' },
  { name: 'Geologica + IBM Plex Sans', display: 'Geologica', body: 'IBM Plex Sans', dw: 700, kind: 'sans' },
  { name: 'Syne + Source Sans 3', display: 'Syne', body: 'Source Sans 3', dw: 800, kind: 'display' },
  { name: 'Manrope only', display: 'Manrope', body: 'Manrope', dw: 800, kind: 'sans' },
  { name: 'Source Serif 4 + Source Sans 3', display: 'Source Serif 4', body: 'Source Sans 3', dw: 600, kind: 'serif' },
];

const AXES = {
  header: {
    'left-bar': '',
    'centered': `.header__main{flex-direction:column;align-items:center;gap:var(--space-2);padding-block:var(--space-3)}.brand{margin-right:0}@media(min-width:900px){.header__main{position:relative}.btn--header{position:absolute;right:var(--gutter);top:50%;transform:translateY(-50%)}}`,
    'underline': `.topbar{background:transparent;color:var(--color-ink);border-bottom:1px solid var(--color-line)}.topbar__phone{color:var(--color-link)}.site-header{border-bottom:0}.nav__list--desktop a{border-radius:0;border-bottom:2px solid transparent}.nav__list--desktop a:hover{background:none;border-bottom-color:var(--color-call)}`,
    'floating': `.site-header{background:transparent;border-bottom:0}.header__main{width:calc(100% - 2*var(--space-4));max-width:var(--container);margin:var(--space-3) auto;padding-inline:var(--space-4);background:var(--color-surface);border:1px solid var(--color-line);border-radius:999px}`,
  },
  hero: {
    'split': `@media(min-width:900px){.hero__inner{grid-template-columns:1.15fr .85fr}}`,
    'stack-big': `.hero__inner{display:block}.hero__title{font-size:clamp(2.6rem,10vw,6.25rem);line-height:.98;max-width:12ch}.hero__lead{max-width:36em}.hero__inner>aside,.hero__inner>.hero__art{margin-top:var(--space-6);max-width:560px}`,
    'band': `.hero{background:var(--color-ink);color:var(--color-on-dark)}.hero h1,.hero .hero__title{color:var(--color-on-dark)}.hero .eyebrow{color:var(--color-on-dark-link)}.hero a:not(.btn){color:var(--color-on-dark-link)}.hero__lead{color:var(--color-on-dark)}`,
    'center': `.hero__inner{text-align:center;justify-items:center}.hero__title,.hero__lead,.hero__actions{margin-inline:auto}.hero__title{max-width:18ch}`,
  },
  shape: {
    sharp: `:root{--radius-s:0px;--radius-m:0px;--radius-l:0px}`,
    soft: `:root{--radius-s:6px;--radius-m:10px;--radius-l:16px}`,
    round: `:root{--radius-s:10px;--radius-m:18px;--radius-l:30px}`,
    chip: `:root{--radius-s:12px;--radius-m:26px;--radius-l:40px}`,
  },
  button: {
    solid: `.btn--call{border-color:transparent}`,
    'offset-shadow': `.btn--call{border:2px solid var(--color-ink);box-shadow:4px 4px 0 var(--color-ink)}.btn--call:active{box-shadow:1px 1px 0 var(--color-ink);transform:translate(3px,3px)}`,
    pill: `.btn{border-radius:999px}.btn--call{border-color:transparent}`,
    'caps-wide': `.btn{text-transform:uppercase;letter-spacing:.08em;font-size:.9375rem}.btn--call{border-color:transparent}.btn__number{letter-spacing:.02em}`,
  },
  rhythm: {
    'alt-bands': '',
    'flat-lines': `.section--alt{background:transparent;border-block:0}.section{border-top:1px solid var(--color-line-strong)}`,
    'tint': `.section--alt{background:color-mix(in srgb,var(--color-call) 9%,var(--color-paper));border-block:0}`,
  },
  cards: {
    bordered: '',
    'tinted-flat': `.service,.area,.faq__item,.step{border-color:transparent;background:var(--color-paper-alt)}@media(min-width:900px){.service,.area,.service:first-child,.area:first-child{border-color:transparent;background:var(--color-paper-alt)}}`,
    'soft-shadow': `.service,.area,.faq__item,.step{border-color:transparent;box-shadow:0 14px 34px -22px rgba(0,0,0,.45)}@media(min-width:900px){.service,.area,.service:first-child,.area:first-child{border-color:transparent;box-shadow:0 14px 34px -22px rgba(0,0,0,.45)}}`,
    rules: `.faq__item,.step{background:transparent;border:0;border-bottom:1px solid var(--color-line-strong);border-radius:0}@media(min-width:900px){.service,.area,.service:first-child,.area:first-child{background:transparent;border:0;border-top:2px solid var(--color-ink);border-radius:0;padding-inline:0}}`,
  },
  motif: {
    slashes: `.eyebrow::before{content:"";display:inline-block;width:34px;height:10px;margin-right:10px;background:linear-gradient(115deg,transparent 0 15%,var(--color-call) 15% 30%,transparent 30% 45%,var(--color-call) 45% 60%,transparent 60% 75%,var(--color-call) 75% 90%,transparent 90%)}`,
    dots: `.eyebrow::before{content:"";display:inline-block;width:30px;height:8px;margin-right:10px;background:radial-gradient(circle,var(--color-call) 0 3px,transparent 3.5px) 0 50%/10px 8px repeat-x}`,
    rule: `.eyebrow::before{content:"";display:inline-block;width:40px;height:3px;margin-right:12px;vertical-align:middle;background:var(--color-call)}`,
    arc: `.eyebrow::before{content:"";display:inline-block;width:22px;height:11px;margin-right:10px;border:3px solid var(--color-call);border-bottom:0;border-radius:22px 22px 0 0}`,
    none: '',
  },
  density: {
    airy: `:root{--section-pad:clamp(64px,10vw,140px)}.section__head{margin-bottom:var(--space-6)}`,
    compact: `:root{--section-pad:clamp(36px,6vw,76px)}`,
  },
};
const TYPE_AXIS = {
  sans: (p) => `h1,h2,h3,.brand__name{font-family:var(--font-display);font-weight:${p.dw};letter-spacing:-.02em}`,
  serif: (p) => `h1,h2,h3,.brand__name{font-family:var(--font-display);font-weight:${p.dw};letter-spacing:0}`,
  slab: (p) => `h1,h2,h3,.brand__name{font-family:var(--font-display);font-weight:${p.dw};letter-spacing:-.005em}`,
  condensed: (p) => `h1,h2,h3,.brand__name{font-family:var(--font-display);font-weight:${p.dw};letter-spacing:.01em}.section__title,.hero__title{text-transform:uppercase}`,
  display: (p) => `h1,h2,h3,.brand__name{font-family:var(--font-display);font-weight:${p.dw};letter-spacing:-.01em}`,
};
const MOTIF_IDEAS = { electrician: 'circuit traces / spark lines', plumber: 'flow lines / pipe elbows', dentist: 'soft arcs / light', lawyer: 'rules and numerals', restaurant: 'plate rings / dots', bakery: 'scoring slashes / grain', locksmith: 'key cuts / notches', default: 'one geometric element drawn from the trade' };
const TRADE_BIAS = { // preferred axis options per trade family (soft bias, not a rule)
  emergency: { button: ['offset-shadow', 'solid', 'caps-wide'], hero: ['split', 'band', 'stack-big'], type: ['sans', 'condensed', 'slab'] },
  health: { shape: ['soft', 'round'], cards: ['tinted-flat', 'soft-shadow'], hero: ['split', 'center'], type: ['serif', 'sans'] },
  food: { type: ['serif', 'display'], rhythm: ['tint', 'alt-bands'], cards: ['soft-shadow', 'bordered'] },
  pro: { type: ['serif', 'sans'], cards: ['rules', 'bordered'], rhythm: ['flat-lines'], shape: ['sharp', 'soft'] },
};
const FAMILY = { electrician: 'emergency', plumber: 'emergency', locksmith: 'emergency', hvac: 'emergency', towing: 'emergency', dentist: 'health', doctor: 'health', clinic: 'health', physio: 'health', bakery: 'food', restaurant: 'food', cafe: 'food', lawyer: 'pro', accountant: 'pro', architect: 'pro' };

export function rollDesign({ seed, trade = 'default' }) {
  const r = rng(seed);
  const family = FAMILY[trade] || null;
  const bias = family ? TRADE_BIAS[family] : {};
  const pick = (arr, axis) => {
    const pool = bias[axis] && r() < 0.65 ? bias[axis].filter((x) => arr.includes(x)) : arr;
    return (pool.length ? pool : arr)[Math.floor(r() * (pool.length || arr.length))];
  };
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  const pairing = PAIRINGS[Math.floor(r() * PAIRINGS.length)];
  const typeOpt = pairing.kind;
  const choice = {
    palette: pal[0], pairing: pairing.name,
    header: pick(Object.keys(AXES.header), 'header'), hero: pick(Object.keys(AXES.hero), 'hero'), shape: pick(Object.keys(AXES.shape), 'shape'),
    button: pick(Object.keys(AXES.button), 'button'), rhythm: pick(Object.keys(AXES.rhythm), 'rhythm'), cards: pick(Object.keys(AXES.cards), 'cards'),
    motif: pick(Object.keys(AXES.motif), 'motif'), density: pick(Object.keys(AXES.density), 'density'),
  };

  // tokens (contrast-checked)
  const [, ink, paper, call, link] = pal;
  const callText = ratio('#ffffff', call) >= ratio(ink, call) ? '#ffffff' : ink;
  let callBg = call;
  if (ratio(callText, callBg) < 4.5) callBg = ensure(callBg, callText, 4.5, callText === '#ffffff' ? '#000000' : '#ffffff');
  const t = {
    '--color-ink': ink, '--color-ink-deep': mix(ink, '#000000', 0.35), '--color-text': ensure(mix(ink, paper, 0.1), paper), '--color-muted': ensure(mix(ink, paper, 0.38), paper),
    '--color-paper': paper, '--color-paper-alt': mix(paper, ink, 0.07), '--color-surface': mix(paper, '#ffffff', 0.6), '--color-line': mix(paper, ink, 0.16), '--color-line-strong': mix(paper, ink, 0.4),
    '--color-link': ensure(link, paper), '--color-call': callBg, '--color-call-hover': mix(callBg, '#000000', 0.12), '--color-call-text': callText,
    '--color-on-dark': paper, '--color-on-dark-link': mix(call, '#ffffff', 0.35), '--color-focus': ensure(link, paper),
    '--font-sans': `"${pairing.body}", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
    '--font-display': `"${pairing.display}", ${pairing.kind === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, "Segoe UI", Arial, sans-serif'}`,
  };
  t['--color-on-dark-link'] = ensure(t['--color-on-dark-link'], ink);
  const pairs = [['--color-text', '--color-paper'], ['--color-muted', '--color-paper'], ['--color-link', '--color-paper'], ['--color-call-text', '--color-call'], ['--color-on-dark', '--color-ink'], ['--color-on-dark-link', '--color-ink-deep']];

  const css = [
    '/* ---- generated starting theme (design_roll): refine by hand, keep the direction ---- */',
    AXES.shape[choice.shape], AXES.density[choice.density], TYPE_AXIS[typeOpt](pairing), AXES.header[choice.header], AXES.hero[choice.hero], AXES.button[choice.button],
    AXES.rhythm[choice.rhythm], AXES.cards[choice.cards], AXES.motif[choice.motif],
  ].filter(Boolean).join('\n');

  const brief = [
    `Seed "${seed}" (trade: ${trade}) → palette ${choice.palette}; type ${pairing.name}; header ${choice.header}; hero ${choice.hero}; shapes ${choice.shape}; buttons ${choice.button}; section rhythm ${choice.rhythm}; cards ${choice.cards}; motif ${choice.motif} (idea for this trade: ${MOTIF_IDEAS[trade] || MOTIF_IDEAS.default}); density ${choice.density}.`,
    `Fonts to self-host (Greek verified): ${[...new Set([pairing.display, pairing.body])].join(' + ')} → scripts/font_greek_check.mjs "<Family>" --download public/assets/fonts, then add the @font-face blocks + preloads.`,
  ];
  return { choice, tokens: t, contrastPairs: pairs, css, brief, pairing, palettes: PALETTES.length };
}
export { PALETTES, PAIRINGS, AXES };
