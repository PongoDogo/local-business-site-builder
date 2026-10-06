/* =====================================================================
   {{LEGAL_NAME}} — style.css   (ONE file, no build step)
   ---------------------------------------------------------------------
   Everything above the "THEME" marker is structure + accessibility + the
   functional components (header, folds, call bar, cookie banner, text pages).
   It carries NO brand look. The visual identity lives in 1) TOKENS and in the
   THEME section at the bottom: write that fresh for every client from DESIGN.md.
   Colours / fonts / spacing change ONLY in the :root block.
   After ANY change here: bump ?v= on the <link> in every HTML page
   (scripts/bump_version.mjs), otherwise visitors keep the old file for 30 days.
   Sections: 1 tokens · 2 fonts · 3 base · 4 buttons · 5 header · 6 sections
             7 folds & faq · 8 footer · 9 call bar · 10 cookie banner
             11 text pages · 12 breakpoints · 13 motion · THEME
   ===================================================================== */

/* ---------- 1) TOKENS (change ONLY here) ---------- */
:root {
{{TOKENS}}
  /* spacing, radii, layout */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
  --section-pad: clamp(48px, 8vw, 104px);
  --radius-s: 8px; --radius-m: 14px; --radius-l: 22px;
  --container: 1160px; --container-narrow: 820px;
  --gutter: clamp(16px, 4vw, 32px);
  --callbar-h: 68px;
}

/* ---------- 2) FONTS (self-hosted woff2, greek + latin; never a Google Fonts CDN link) ---------- */
{{FONT_FACES}}

/* ---------- 3) BASE ---------- */
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }   /* anything with hidden stays hidden, whatever the CSS says */
html { scroll-padding-bottom: calc(var(--callbar-h) + 16px); }   /* WCAG 2.2 SC 2.4.11: the sticky call bar must not cover a focused element */
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-paper);
  text-rendering: optimizeLegibility;
  padding-bottom: calc(var(--callbar-h) + env(safe-area-inset-bottom, 0px));   /* room for the mobile call bar */
  overflow-wrap: break-word;
}
img, svg { max-width: 100%; height: auto; }
h1, h2, h3 { color: var(--color-ink); line-height: 1.15; margin: 0 0 var(--space-3); font-weight: 750; letter-spacing: -0.01em; }
p { margin: 0 0 var(--space-4); }
p:last-child { margin-bottom: 0; }
ul, ol { margin: 0; padding: 0; }
a { color: var(--color-link); text-underline-offset: 0.18em; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; border-radius: 4px; }
address { font-style: normal; }
.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: max(var(--gutter), env(safe-area-inset-left, 0px)); }
.container--narrow { max-width: var(--container-narrow); }
.nowrap { white-space: nowrap; }          /* phone numbers must never break across lines */
.vh { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }   /* visually hidden, read by screen readers */
.icon { width: 1.25em; height: 1.25em; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
a[href^="tel:"] .icon { fill: currentColor; stroke: none; }
.skip-link { position: absolute; left: var(--space-3); top: -100px; z-index: 100; padding: var(--space-3) var(--space-4); background: var(--color-ink); color: var(--color-on-dark); border-radius: var(--radius-s); font-weight: 700; }
.skip-link:focus { top: var(--space-3); }
.eyebrow { margin-bottom: var(--space-3); font-size: 0.9375rem; font-weight: 700; color: var(--color-link); letter-spacing: 0.02em; }

/* ---------- 4) BUTTONS ---------- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-3); min-height: 48px; padding: var(--space-3) var(--space-5); border: 2px solid transparent; border-radius: var(--radius-m); font: inherit; font-weight: 700; line-height: 1.2; text-align: center; text-decoration: none; cursor: pointer; transition: background-color 0.15s ease, transform 0.15s ease; }
.btn:active { transform: translateY(1px); }
.btn--call { background: var(--color-call); color: var(--color-call-text); border-color: var(--color-ink); }   /* the most prominent element on the page */
.btn--call:hover { background: var(--color-call-hover); }
.btn--primary { background: var(--color-ink); color: var(--color-on-dark); }
.btn--ghost { background: transparent; color: var(--color-ink); border-color: var(--color-ink); }
.btn--lg { min-height: 56px; font-size: 1.0625rem; }
.btn--xl { min-height: 76px; justify-content: flex-start; gap: var(--space-4); }
.btn__stack { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.btn__small { font-size: 0.9375rem; font-weight: 650; }
.btn__number { font-size: clamp(1.75rem, 8vw, 2.25rem); font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
.linklike { padding: 0; border: 0; background: none; font: inherit; color: inherit; text-decoration: underline; text-underline-offset: 0.18em; cursor: pointer; min-height: 44px; }

/* ---------- 5) HEADER (top bar + brand + nav) ---------- */
.site-header { position: relative; z-index: 20; background: var(--color-paper); border-bottom: 1px solid var(--color-line); }
.topbar { background: var(--color-ink); color: var(--color-on-dark); font-size: 0.9375rem; }
.topbar__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 48px; }
.topbar__status { display: flex; align-items: center; gap: var(--space-2); margin: 0; font-weight: 600; min-width: 0; }
.topbar__long { display: none; }
.topbar__short { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }   /* never let a long hours text widen the page */
.status-dot { width: 9px; height: 9px; flex: none; border-radius: 50%; background: #4fd18b; box-shadow: 0 0 0 3px rgba(79, 209, 139, 0.25); }
.topbar__phone { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 48px; color: var(--color-call); font-size: 1.125rem; font-weight: 800; text-decoration: none; font-variant-numeric: tabular-nums; flex: none; }
.topbar .icon { width: 1.1em; height: 1.1em; }
.topbar :focus-visible { outline-color: var(--color-call); }
.header__main { display: flex; align-items: center; gap: var(--space-4); min-height: 68px; }
.brand { display: inline-flex; align-items: center; gap: var(--space-3); margin-right: auto; color: var(--color-ink); text-decoration: none; min-height: 48px; }
.emblem { width: 48px; height: 48px; flex: none; }
.brand__text { display: flex; flex-direction: column; line-height: 1; }
.brand__name { font-size: 1.375rem; font-weight: 800; letter-spacing: 0.06em; }
.brand__tag { white-space: nowrap; margin-top: 4px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; color: var(--color-muted); }
/* menu: <details> on mobile (works without JS), horizontal list from 1100px */
.nav__list { list-style: none; }
.nav__list--desktop { display: none; }
.nav__toggle { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 48px; padding: 0 var(--space-3); border: 2px solid var(--color-ink); border-radius: var(--radius-s); color: var(--color-ink); font-weight: 700; cursor: pointer; list-style: none; user-select: none; }
.nav__toggle::-webkit-details-marker { display: none; }
.nav__mobile[open] .nav__toggle { background: var(--color-ink); color: var(--color-on-dark); }
.nav__mobile .nav__list { position: absolute; left: 0; right: 0; top: 100%; padding: var(--space-2) var(--gutter) var(--space-4); background: var(--color-surface); border-bottom: 2px solid var(--color-ink); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12); }
.nav__mobile .nav__list a { display: flex; align-items: center; min-height: 52px; border-bottom: 1px solid var(--color-line); color: var(--color-ink); font-weight: 650; font-size: 1.125rem; text-decoration: none; }
.nav__mobile .nav__list li:last-child a { border-bottom: 0; }
.btn--header { display: none; white-space: nowrap; }

/* ---------- 6) SECTIONS ---------- */
.section { padding-block: var(--section-pad); scroll-margin-top: 16px; }
.section--alt { background: var(--color-paper-alt); border-block: 1px solid var(--color-line); }
.section__head { max-width: 46rem; margin: 0 auto var(--space-5); text-align: center; }
.section__title { font-size: clamp(1.75rem, 5.4vw, 2.625rem); max-width: 22ch; margin-inline: auto; }
.section__lead { font-size: 1.125rem; max-width: 40em; margin: 0 auto; }
.checklist { list-style: none; display: grid; gap: var(--space-3); }

/* ---------- 7) FOLDS (<details data-fold>) AND FAQ ---------- */
/* mobile: closed rows that open on tap; from 900px main.js keeps them open and they become cards */
.services__grid, .areas__grid { display: grid; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-m); overflow: hidden; }
.service, .area { position: relative; border-top: 1px solid var(--color-line); }
.service:first-child, .area:first-child { border-top: 0; }
.service > summary, .area > summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 56px; padding: var(--space-3) var(--space-4) var(--space-3) var(--space-5); cursor: pointer; list-style: none; }
.service > summary::-webkit-details-marker, .area > summary::-webkit-details-marker { display: none; }
.service > summary::after, .area > summary::after { content: ""; flex: none; width: 10px; height: 10px; margin-right: 4px; border-right: 2.5px solid var(--color-link); border-bottom: 2.5px solid var(--color-link); transform: translateY(-3px) rotate(45deg); transition: transform 0.2s ease; }
.service[open] > summary::after, .area[open] > summary::after { transform: translateY(3px) rotate(225deg); }
.service__title, .area__title { font-size: 1.0625rem; margin: 0; }
.service > p, .area > p { margin: 0; padding: 0 var(--space-5) var(--space-4); font-size: 1rem; }
.faq__item { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-m); margin-bottom: var(--space-2); }
.faq__item summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: 56px; padding: var(--space-3) var(--space-5); font-weight: 700; font-size: 1.0625rem; color: var(--color-ink); cursor: pointer; list-style: none; }
.faq__item summary::-webkit-details-marker { display: none; }
.faq__item summary::after { content: ""; flex: none; width: 14px; height: 14px; background: linear-gradient(currentColor, currentColor) center / 14px 2.5px no-repeat, linear-gradient(currentColor, currentColor) center / 2.5px 14px no-repeat; transition: transform 0.2s ease; }
.faq__item[open] summary::after { transform: rotate(45deg); }
.faq__answer { padding: 0 var(--space-5) var(--space-5); }

/* ---------- 8) FOOTER ---------- */
.site-footer { background: var(--color-ink-deep); color: var(--color-on-dark); padding-block: var(--space-7) var(--space-5); font-size: 1rem; }
.site-footer a { color: var(--color-on-dark-link); }
.site-footer :focus-visible { outline-color: var(--color-call); }
.footer__grid { display: grid; gap: var(--space-5); }
.footer__title { font-size: 1rem; font-weight: 750; color: var(--color-on-dark); margin-bottom: var(--space-3); }
.footer__list { list-style: none; display: grid; gap: var(--space-2); }
.footer__list a, .footer__list .linklike { display: inline-flex; align-items: center; min-height: 44px; }
.footer__phone { font-size: 1.375rem; font-weight: 800; text-decoration: none; }
.footer__legal { line-height: 1.8; }
.footer__bottom { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.9375rem; display: grid; gap: var(--space-2); }
.footer__bottom:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.footer__bottom a { padding-block: 6px; }
.footer__cookies { color: inherit; font-size: inherit; }
.footer__cookies::before { content: "·"; display: inline-block; margin-inline: 0.5em; text-decoration: none; }

/* ---------- 9) CALL BAR (mobile only: the phone call is the conversion) ---------- */
.callbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right, 0px)) calc(var(--space-2) + env(safe-area-inset-bottom, 0px)) max(var(--space-2), env(safe-area-inset-left, 0px)); background: var(--color-ink-deep); box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.18); transition: transform 0.2s ease; }
.callbar__btn { display: flex; align-items: center; justify-content: center; gap: var(--space-3); min-height: 52px; border-radius: var(--radius-m); background: var(--color-call); color: var(--color-call-text); font-weight: 800; text-decoration: none; font-variant-numeric: tabular-nums; }
.callbar__label { padding-right: var(--space-3); border-right: 2px solid rgba(0, 0, 0, 0.25); font-size: 0.9375rem; font-weight: 700; white-space: nowrap; }
.callbar__number { font-size: 1.25rem; }
.callbar :focus-visible { outline-color: var(--color-call); }
body:has(.cookie-banner:not([hidden])) .callbar { transform: translateY(110%); }   /* never cover the consent banner */

/* ---------- 10) COOKIE BANNER (built by tracking.js; only exists when analytics is on) ---------- */
.cookie-banner { position: fixed; left: var(--space-2); right: var(--space-2); bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0px)); z-index: 40; max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow: auto; padding: var(--space-5); background: var(--color-surface); color: var(--color-text); border: 2px solid var(--color-ink); border-radius: var(--radius-m); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25); font-size: 1rem; }
.cookie-banner__title { font-size: 1.125rem; margin-bottom: var(--space-2); }
.cookie-banner__actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-top: var(--space-4); }
.cookie-banner__actions .btn { width: 100%; padding-inline: var(--space-3); }
.cookie-banner__choice { background: var(--color-ink); color: var(--color-on-dark); }   /* Accept and Reject are IDENTICAL on purpose (Greek DPA / EDPB) */
.cookie-banner__more { grid-column: 1 / -1; justify-self: center; }
.cookie-banner__prefs { margin-top: var(--space-4); display: grid; gap: var(--space-3); }
.cookie-banner__pref { display: grid; grid-template-columns: 28px 1fr; gap: var(--space-3); align-items: start; }
.cookie-banner__pref input { width: 24px; height: 24px; margin: 2px 0 0; accent-color: var(--color-ink); }
.cookie-banner__pref--fixed { margin: 0; }
.cookie-banner__lock { width: 24px; height: 24px; margin-top: 2px; border-radius: 6px; background: var(--color-line) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4 8-9' fill='none' stroke='%23555b75' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 16px no-repeat; }

/* ---------- 11) TEXT PAGES (privacy, 404) ---------- */
.page { padding-block: var(--space-7) var(--section-pad); }
.page h1 { font-size: clamp(1.875rem, 6vw, 2.75rem); }
.page h2 { font-size: 1.375rem; margin-top: var(--space-6); }
.page ul { padding-left: 1.25em; margin-bottom: var(--space-4); }
.page li { margin-bottom: var(--space-2); }
.page__actions { display: grid; gap: var(--space-3); max-width: 460px; margin-top: var(--space-5); }
.page__actions .btn { width: 100%; }

/* ---------- 12) BREAKPOINTS (the 900px switch is also in main.js: keep them in sync) ---------- */
@media (min-width: 600px) {
  .topbar__long { display: inline; }
  .topbar__short { display: none; }
}
@media (min-width: 640px) {
  .cookie-banner { left: auto; right: var(--space-4); bottom: var(--space-4); max-width: 520px; }
  .cookie-banner__actions { grid-template-columns: 1fr 1fr auto; }
  .cookie-banner__more { grid-column: auto; }
  .footer__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 900px) {
  body { padding-bottom: 0; }
  .callbar { display: none; }
  html { scroll-padding-top: 132px; }
  .site-header { position: sticky; top: 0; }
  .header__main { min-height: 80px; }
  .emblem { width: 56px; height: 56px; }
  .btn--header { display: inline-flex; }
  .section { scroll-margin-top: 0; }
  .section__head { margin-bottom: var(--space-6); }
  .footer__grid { grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: var(--space-6); }
  .services__grid, .areas__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); background: none; border: 0; border-radius: 0; overflow: visible; }
  .service, .area, .service:first-child, .area:first-child { padding: var(--space-5); background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-m); }
  .service > summary, .area > summary { min-height: 0; padding: 0; margin-bottom: var(--space-2); cursor: default; }
  .service[open] > summary::after, .area[open] > summary::after { display: none; }
  .service > p, .area > p { padding: 0; }
  .cookie-banner { width: min(520px, calc(100% - 2 * var(--space-5))); right: var(--space-5); bottom: var(--space-5); }
}
@media (min-width: 1100px) {
  .nav__mobile { display: none; }
  .nav__list--desktop { display: flex; gap: var(--space-1); }
  .nav__list--desktop a { display: inline-flex; align-items: center; min-height: 48px; padding: 0 var(--space-3); border-radius: var(--radius-s); color: var(--color-ink); font-weight: 650; text-decoration: none; white-space: nowrap; }
  .nav__list--desktop a:hover { background: var(--color-paper-alt); }
}
@media (max-width: 899px) { .footer__grid, .footer__bottom { text-align: left; } }
@media (max-width: 359px) {   /* very small phones (320px) */
  .topbar { font-size: 0.8125rem; }
  .topbar__phone { font-size: 1rem; gap: 6px; }
  .emblem { width: 42px; height: 42px; }
  .brand__name { font-size: 1.1875rem; }
  .brand__tag { font-size: 0.6875rem; letter-spacing: 0.08em; }
  .callbar__label { padding-right: var(--space-2); font-size: 0.875rem; }
  .callbar__number { font-size: 1.125rem; }
}

/* ---------- 13) MOTION: every animation lives inside this query, so "reduce motion" visitors get none ---------- */
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
  .status-dot { animation: live-dot 2.4s ease-out infinite; }
  .service[open] > p, .area[open] > p { animation: fold-in 0.25s ease-out; }
}
@keyframes live-dot { 0% { box-shadow: 0 0 0 0 rgba(79, 209, 139, 0.6); } 70%, 100% { box-shadow: 0 0 0 8px rgba(79, 209, 139, 0); } }
@keyframes fold-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

/* =====================================================================
   THEME — the brand's visual identity. WRITE THIS FRESH FOR EACH CLIENT (see DESIGN.md).
   Hero, cards, price tables, review cards, step connectors, motifs, illustrations, signature animation.
   Keep using the tokens from section 1. Remove this comment when the theme exists.
   ===================================================================== */
