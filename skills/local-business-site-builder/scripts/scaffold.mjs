#!/usr/bin/env node
// scaffold.mjs — create a new site skeleton from site-facts.json, or regenerate the DERIVED files.
//
//   deno run -A scripts/scaffold.mjs init   --facts site-facts.json --out public [--docs docs] [--logo logo.svg] [--force] [--allow-incomplete]
//   deno run -A scripts/scaffold.mjs derive --facts site-facts.json --out public [--only jsonld,sitemap,llms,robots,manifest,vcf,htaccess]
//   deno run -A scripts/scaffold.mjs check  --facts site-facts.json
//
// init   : writes index/404/privacy pages, CSS base, tracking.js, main.js, .htaccess, robots, sitemap, llms.txt,
//          manifest, vCard + Greek handoff docs. It never overwrites existing files without --force.
// derive : regenerates ONLY files that are pure functions of the facts (JSON-LD block, sitemap, llms.txt, robots, manifest, vcf;
//          htaccess only when asked). Run it after every change of phone, prices, hours, address, services.
// The skeleton is NOT a finished site: index.html contains a [ΧΡΕΙΑΖΕΤΑΙ ...] marker that the audit reports as an error until
// the real sections are written.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { normPhone } from './lib/util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(HERE, '..', 'assets', 'templates');
const argv = process.argv.slice(2);
const cmd = ['init', 'derive', 'check'].includes(argv[0]) ? argv[0] : null;
const opt = { facts: null, out: null, docs: null, logo: null, force: false, incomplete: false, only: null };
for (let i = cmd ? 1 : 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--facts') opt.facts = argv[++i];
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--docs') opt.docs = argv[++i];
  else if (a === '--logo') opt.logo = argv[++i];
  else if (a === '--only') opt.only = argv[++i].split(',');
  else if (a === '--force') opt.force = true;
  else if (a === '--allow-incomplete') opt.incomplete = true;
}
if (!cmd || !opt.facts || (cmd !== 'check' && !opt.out)) {
  console.error('Usage:\n  scaffold.mjs init   --facts site-facts.json --out public [--docs docs] [--logo logo.svg] [--force] [--allow-incomplete]\n  scaffold.mjs derive --facts site-facts.json --out public [--only jsonld,sitemap,llms,robots,manifest,vcf,htaccess]\n  scaffold.mjs check  --facts site-facts.json');
  process.exit(2);
}

// ------------------------------------------------------------------ facts
let facts;
try { facts = JSON.parse(fs.readFileSync(opt.facts, 'utf8').replace(/^﻿/, '')); }
catch (e) { console.error('Cannot read facts:', e.message); process.exit(2); }

function validate(f) {
  const errs = [], warns = [];
  const b = f.business || {}, s = f.site || {}, a = b.address || {};
  const need = (v, name) => { if (v === undefined || v === null || v === '') errs.push(`missing ${name}`); };
  if (f._example) errs.push('facts is the EXAMPLE file (_example: true). Replace every value with the real, owner-confirmed data and delete "_example".');
  need(b.legal_name, 'business.legal_name'); need(b.phone, 'business.phone'); need(b.email, 'business.email');
  need(a.street, 'business.address.street'); need(a.locality, 'business.address.locality'); need(a.postal_code, 'business.address.postal_code'); need(a.country, 'business.address.country');
  need(s.domain, 'site.domain'); need(s.lang, 'site.lang');
  if (b.phone && !/^\+\d{10,15}$/.test(normPhone(b.phone))) errs.push(`business.phone "${b.phone}" is not a valid number (use +30XXXXXXXXXX)`);
  if (b.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(b.email)) errs.push(`business.email "${b.email}" is invalid`);
  if (s.domain && (/^https?:/.test(s.domain) || /^www\./.test(s.domain) || /\//.test(s.domain))) errs.push(`site.domain must be a bare apex domain like example.gr (got "${s.domain}")`);
  if ((a.country || '').toUpperCase() === 'GR') {
    if (!b.afm) warns.push('business.afm missing: Greek business sites show ΑΦΜ in the footer (confirm the obligation with the accountant)');
    if (!b.gemi) warns.push('business.gemi missing: ask the owner for the ΓΕΜΗ number (or confirm they have none and remove it from the footer)');
  }
  if (b.hours && !['24_7', 'weekly'].includes(b.hours.mode)) errs.push('business.hours.mode must be "24_7" or "weekly"');
  if (!b.hours) warns.push('business.hours missing');
  if (!b.geo) warns.push('business.geo missing: ask the owner for the Google Maps coordinates (>= 5 decimals) or Place ID; never invent them (LocalBusiness geo is recommended by Google)');
  if (f.analytics?.ga4_id && !/^G-[A-Z0-9]{6,12}$/.test(f.analytics.ga4_id)) errs.push(`analytics.ga4_id "${f.analytics.ga4_id}" is not a GA4 measurement ID (G-XXXXXXXXXX)`);
  (function walk(o, p) {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (k === 'confirmed' && v === false) errs.push(`${p}.confirmed is false: the owner has not confirmed it`); walk(v, `${p}.${k}`); } }
    else if (typeof o === 'string' && /\[ΧΡΕΙΑΖΕΤΑΙ|TODO|\{\{/.test(o)) errs.push(`${p} still contains a placeholder`);
  })(f, 'facts');
  if (f.meta?.status !== 'confirmed') warns.push('meta.status is not "confirmed": the owner has not signed off the facts yet');
  if (f.reviews && f.reviews.confirmed !== true) errs.push('reviews exist in the facts but reviews.confirmed is not true (never publish unverified reviews)');
  const REG = { doctor: 'ν. 3418/2005 άρθρα 17-18', dentist: 'Π.Δ. 39/2009', lawyer: 'ν. 4194/2013 άρθρο 40', pharmacist: 'Π.Δ. 340/1993 άρθρο 25' };
  if (b.regulated_profession && REG[b.regulated_profession]) warns.push(`regulated profession (${b.regulated_profession}): advertising is restricted (${REG[b.regulated_profession]}). No testimonials/reviews, no success claims, no superlatives, no price promotions; have the professional body/lawyer approve the copy.`);
  if (f.features?.form) warns.push('features.form is true: a form needs a backend, spam protection, a privacy-text update and CSP form-action (references/09-beyond-the-basics.md)');
  return { errs, warns };
}
const { errs, warns } = validate(facts);
for (const w of warns) console.log('WARN  ', w);
for (const e of errs) console.log('ERROR ', e);
if (cmd === 'check') { console.log(errs.length ? `\n${errs.length} error(s): fix site-facts.json first.` : '\nFacts look complete.'); process.exit(errs.length ? 1 : 0); }
if (errs.length && !opt.incomplete) { console.error(`\nRefusing to generate files from incomplete facts (${errs.length} error(s)). Fix them, or use --allow-incomplete for a draft.`); process.exit(1); }

// ------------------------------------------------------------------ variables
const b = facts.business, s = facts.site, a = b.address;
const today = new Date().toISOString().slice(0, 10);
const dateEl = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const domain = s.domain.toLowerCase();
const url = `https://${domain}`;
const hasGa = !!facts.analytics?.ga4_id;
const hasMap = !!facts.features?.map;
const hasForm = !!facts.features?.form;
const hours247 = b.hours?.mode === '24_7';
const need = (what) => `[ΧΡΕΙΑΖΕΤΑΙ: ${what}]`;
const mapsUrl = b.google?.maps_cid ? `https://maps.google.com/?cid=${b.google.maps_cid}` : '';
const logoPath = opt.logo ? '/assets/img/logo-emblem' + path.extname(opt.logo) : null;
const hasSvgFavicon = !!(opt.logo && /\.svg$/i.test(opt.logo)) || !!facts.design?.logo_svg;
const DAYS = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
const DAYS_EL = { Mo: 'Δευ', Tu: 'Τρί', We: 'Τετ', Th: 'Πέμ', Fr: 'Παρ', Sa: 'Σάβ', Su: 'Κυρ' };

function hoursText() {
  if (hours247) return 'Όλο το 24ωρο, 7 ημέρες την εβδομάδα, και αργίες';
  const w = b.hours?.weekly || [];
  const span = (x) => (x.days.length > 2 ? `${DAYS_EL[x.days[0]]}-${DAYS_EL[x.days[x.days.length - 1]]}` : x.days.map((d) => DAYS_EL[d]).join(', '));
  return w.map((x) => `${span(x)} ${x.opens}-${x.closes}`).join(' · ') + (b.hours?.holidays ? ` · ${b.hours.holidays}` : '');
}

function hoursShort() {
  if (hours247) return "Ανοιχτά 24/7 & αργίες";
  const x = (b.hours?.weekly || [])[0];
  return x ? `${x.days.length > 1 ? DAYS_EL[x.days[0]] + "-" + DAYS_EL[x.days[x.days.length - 1]] : DAYS_EL[x.days[0]]} ${x.opens}-${x.closes}` : "";
}

function buildCsp() {
  const d = new Map([
    ['default-src', ["'self'"]], ['script-src', ["'self'"]], ['style-src', ["'self'"]], ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'"]], ['connect-src', ["'self'"]], ['manifest-src', ["'self'"]],
    ['base-uri', ["'self'"]], ['form-action', ["'self'"]], ['object-src', ["'none'"]], ['frame-ancestors', ["'self'"]],
  ]);
  const add = (k, ...v) => d.set(k, [...(d.get(k) || []), ...v]);
  const why = ['own files'];
  if (hasGa) {
    add('script-src', 'https://www.googletagmanager.com');
    add('img-src', 'https://www.googletagmanager.com', 'https://*.google-analytics.com');
    add('connect-src', 'https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.google.com');
    why.push('Google Analytics 4 (after consent)');
  }
  if (hasMap) { add('frame-src', 'https://www.google.com'); why.push('Google map on click'); }
  if (facts.features?.youtube) { add('frame-src', 'https://www.youtube-nocookie.com'); why.push('YouTube (privacy mode) on click'); }
  if (facts.features?.form_action_url) { add('form-action', facts.features.form_action_url); why.push('form endpoint'); }
  return { value: [...d].map(([k, v]) => `${k} ${v.join(' ')}`).join('; '), why: why.join(', ') };
}

function buildNav() {
  const items = s.nav || [
    facts.prices?.length && { id: 'prices', label: 'Τιμές' },
    facts.reviews?.confirmed && { id: 'reviews', label: 'Κριτικές' },
    { id: 'services', label: 'Υπηρεσίες' },
    facts.areas?.length && { id: 'areas', label: 'Περιοχές' },
    { id: 'faq', label: 'Ερωτήσεις' },
    { id: 'contact', label: 'Επικοινωνία' },
  ].filter(Boolean);
  return items.map((i) => `          <li><a href="#${i.id}">${i.label}</a></li>\n`).join('');
}

function buildJsonLd() {
  const imgs = (s.images || []).concat(['/assets/img/og-image.png']).map((p) => url + p);
  const offers = (facts.services || []).map((sv) => ({
    '@type': 'Offer',
    ...(sv.price_from != null && sv.price_confirmed !== false ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: sv.price_from, priceCurrency: 'EUR' } } : {}),
    itemOffered: { '@type': 'Service', name: sv.name, ...(sv.description ? { description: sv.description } : {}) },
  }));
  const spec = hours247
    ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: Object.values(DAYS), opens: '00:00', closes: '23:59' }]
    : (b.hours?.weekly || []).map((x) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: x.days.map((d) => DAYS[d]), opens: x.opens, closes: x.closes }));
  const openingHours = hours247 ? 'Mo-Su 00:00-23:59' : (b.hours?.weekly || []).map((x) => `${x.days[0]}${x.days.length > 1 ? '-' + x.days[x.days.length - 1] : ''} ${x.opens}-${x.closes}`);
  const sameAs = [...(b.same_as || [])];
  if (mapsUrl && !sameAs.includes(mapsUrl)) sameAs.push(mapsUrl);
  const biz = {
    '@type': b.schema_type || 'LocalBusiness',
    '@id': `${url}/#business`,
    name: b.legal_name,
    ...(b.afm ? { taxID: b.afm } : {}),
    url: `${url}/`,
    telephone: normPhone(b.phone),
    email: b.email,
    image: imgs,
    logo: `${url}/icon-512.png`,
    ...(b.description ? { description: b.description } : {}),
    address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.locality, postalCode: a.postal_code, ...(a.region ? { addressRegion: a.region } : {}), addressCountry: a.country },
    ...(b.geo ? { geo: { '@type': 'GeoCoordinates', latitude: b.geo.lat, longitude: b.geo.lng } } : {}),
    areaServed: (s.area_served || [{ type: 'AdministrativeArea', name: a.region || a.locality }]).map((x) => ({ '@type': x.type || 'City', name: x.name })),
    openingHoursSpecification: spec,
    ...(sameAs.length ? { sameAs } : {}),
    openingHours,
    ...(mapsUrl ? { hasMap: mapsUrl } : {}),
    ...(b.knows_about?.length ? { knowsAbout: b.knows_about } : {}),
    ...(offers.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: b.offer_catalog_name || 'Υπηρεσίες', itemListElement: offers } } : {}),
  };
  const graph = [
    biz,
    { '@type': 'WebPage', '@id': `${url}/#webpage`, url: `${url}/`, name: s.seo?.title || b.legal_name, inLanguage: s.lang, isPartOf: { '@id': `${url}/#website` }, about: { '@id': `${url}/#business` }, primaryImageOfPage: `${url}/assets/img/og-image.png` },
    { '@type': 'WebSite', '@id': `${url}/#website`, url: `${url}/`, name: b.legal_name, inLanguage: s.lang, publisher: { '@id': `${url}/#business` } },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return `  <script type="application/ld+json">\n${json.split('\n').map((l) => '  ' + l).join('\n')}\n  </script>`;
}

const csp = buildCsp();
const fontPreloads = (facts.design?.fonts?.preload || []).map((f) => `  <link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>\n`).join('');
const fontFaces = (facts.design?.fonts?.faces || []).map((f) => `@font-face {\n  font-family: "${f.family}";\n  src: url("${f.src}") format("woff2");\n  font-weight: ${f.weight || '400 800'};\n  font-style: normal;\n  font-display: swap;\n${f.unicodeRange ? `  unicode-range: ${f.unicodeRange};\n` : ''}}`).join('\n') || '/* no font declared yet: add facts.design.fonts.faces (self-hosted woff2) or the page falls back to the system font */';
const defTokens = {
  '--color-ink': '#1f2a44', '--color-ink-deep': '#141b30', '--color-text': '#2b3245', '--color-muted': '#59607a', '--color-paper': '#f7f5f0', '--color-paper-alt': '#eeeadf',
  '--color-surface': '#ffffff', '--color-line': '#e0dbcd', '--color-line-strong': '#b6ae9b', '--color-link': '#0b5f87', '--color-call': '#f2b233', '--color-call-hover': '#e8a114',
  '--color-call-text': '#1f2a44', '--color-on-dark': '#f7f5f0', '--color-on-dark-link': '#f5c96a', '--color-focus': '#0b5f87',
  '--font-sans': '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
const tokens = { ...defTokens, ...(facts.design?.tokens || {}) };
const tokenBlock = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n');

const slug = domain.replace(/[^a-z0-9]+/g, '_');
const T = {
  T_SKIP: 'Μετάβαση στο περιεχόμενο', T_HOME: 'αρχική', T_MAIN_MENU: 'Κύριο μενού', T_MENU: 'Μενού', T_CALL_NOW: 'Καλέστε τώρα', T_CONTACT: 'Επικοινωνία',
  T_SEE_MAPS: 'Δείτε μας στο Google Maps', T_HOURS_AREAS: 'Ωράριο &amp; περιοχές', T_BUSINESS_DATA: 'Στοιχεία επιχείρησης', T_PRIVACY: 'Πολιτική απορρήτου',
  T_COOKIE_SETTINGS: 'Ρυθμίσεις cookies', T_QUICK_CALL: 'Γρήγορη κλήση', T_CALL_BAR: hours247 ? 'Κλήση 24/7' : 'Κλήση',
  T_404_TITLE: 'Η σελίδα δεν βρέθηκε', T_404_H1: 'Αυτή η σελίδα δεν βρέθηκε', T_404_TEXT: 'Ίσως ο σύνδεσμος να είναι λάθος ή η σελίδα να μην υπάρχει πια.',
  T_404_CALL: hours247 ? 'Χρειάζεστε εξυπηρέτηση; Καλέστε 24/7' : 'Χρειάζεστε εξυπηρέτηση; Καλέστε', T_404_HOME: 'Πηγαίνετε στην αρχική σελίδα',
};
const vars = {
  LANG: s.lang, LOCALE: s.locale || (s.lang === 'el' ? 'el_GR' : s.lang), DOMAIN: domain, DOMAIN_RE: domain.replace(/\./g, '\\.'), SITE_URL: url,
  LEGAL_NAME: b.legal_name, BRAND_WORD: b.brand_word || b.legal_name, TAGLINE: b.tagline || '',
  PHONE_E164: normPhone(b.phone), PHONE_DISPLAY: b.phone_display || normPhone(b.phone).replace(/^\+30(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3'), EMAIL: b.email,
  STREET: a.street, LOCALITY: a.locality, POSTAL: a.postal_code, REGION: a.region || '', COUNTRY: a.country, AFM: b.afm || need('ΑΦΜ'), GEMI: b.gemi || need('ΓΕΜΗ'),
  THEME_COLOR: s.theme_color || tokens['--color-ink'], BG_COLOR: s.background_color || tokens['--color-paper'], TODAY: today, DATE_EL: dateEl,
  GA4_ID: facts.analytics?.ga4_id || '', ADS_ENABLED: String(!!facts.analytics?.ads), CONSENT_KEY: `${slug}_consent_v1`, CONSENT_VERSION: today.slice(0, 7),
  HAS_SVG_FAVICON: hasSvgFavicon, HAS_LLMS: facts.features?.llms_txt !== false, HAS_GA: hasGa, HAS_MAP: hasMap, HAS_FORM: hasForm, HAS_GA_OR_MAP: hasGa || hasMap, HOSTINGER: s.hosting === 'hostinger', HOURS_247: hours247,
  GOOGLE_RECIPIENT_TEXT: hasGa && hasMap ? 'για τα στατιστικά (μόνο με τη συγκατάθεσή σας) και για τον χάρτη (μόνο αν τον ανοίξετε)' : hasGa ? 'για τα στατιστικά (μόνο με τη συγκατάθεσή σας)' : 'για τον χάρτη (μόνο αν τον ανοίξετε)',
  HSTS: 'max-age=31536000' + (s.hsts_include_subdomains ? '; includeSubDomains' : ''), CSP: csp.value, CSP_EXPLAIN: csp.why,
  SEO_TITLE: s.seo?.title || need('<title> 30-60 χαρακτήρες: υπηρεσία + πόλη | επωνυμία'), SEO_DESCRIPTION: s.seo?.description || need('meta description 90-160 χαρακτήρες με τηλέφωνο και βασική υπηρεσία'),
  OG_IMAGE_ALT: s.seo?.og_image_alt || `${b.legal_name}`, CSS_VERSION: '1', JS_VERSION: '1', FONT_PRELOADS: fontPreloads, FONT_FACES: fontFaces, TOKENS: tokenBlock,
  LOGO_IMG: logoPath ? `      <img class="emblem" src="${logoPath}" width="48" height="48" alt="">\n` : '', NAV_ITEMS: buildNav(), MAPS_URL: mapsUrl,
  FOOTER_BLURB: b.footer_blurb || need('μία πρόταση για το τι κάνει η επιχείρηση'), HOURS_TEXT: hoursText(), HOURS_SHORT: hoursShort(), HOURS_FOOTER: hoursText(),
  AREAS_FOOTER: (facts.areas || []).map((x) => x.name).join(', ') || need('περιοχές εξυπηρέτησης'), JSONLD: buildJsonLd(), ...T,
};
const RAW = new Set(['JSONLD', 'NAV_ITEMS', 'LOGO_IMG', 'FONT_PRELOADS', 'FONT_FACES', 'TOKENS', 'T_HOURS_AREAS', 'CSP', 'HSTS', 'CSP_EXPLAIN', 'DOMAIN_RE']);
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(tpl, escapeHtml) {
  let out = tpl;
  const re = /\{\{#if (\w+)\}\}((?:(?!\{\{#if)[\s\S])*?)(?:\{\{#else\}\}((?:(?!\{\{#if)[\s\S])*?))?\{\{\/if\}\}/g;
  let prev;
  do { prev = out; out = out.replace(re, (m, k, x, y = '') => { if (!(k in vars)) throw new Error(`Unknown condition {{#if ${k}}}`); return vars[k] ? x : y; }); } while (out !== prev);
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Template placeholder {{${k}}} has no value`);
    return escapeHtml && !RAW.has(k) ? esc(vars[k]) : String(vars[k]);
  });
  return out.replace(/\n{3,}/g, '\n\n');
}
const readTpl = (name) => fs.readFileSync(path.join(TPL, name), 'utf8');

// ------------------------------------------------------------------ derived files
const pages = (s.pages || [{ path: '/', lastmod: today }, { path: '/privacy.html', lastmod: today }]).filter((p) => p.indexable !== false);
const derived = {
  robots: () => ['robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`],
  sitemap: () => ['sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Page list for Google. Whenever a page changes materially, update its lastmod (YYYY-MM-DD). -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url>\n    <loc>${url}${p.path}</loc>\n    <lastmod>${p.lastmod || today}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`],
  manifest: () => ['site.webmanifest', JSON.stringify({
    id: '/', name: b.legal_name, short_name: b.short_name || b.brand_word || b.legal_name, description: b.short_description || b.description || '', lang: s.lang, start_url: '/', scope: '/', display: 'browser',
    background_color: vars.BG_COLOR, theme_color: vars.THEME_COLOR,
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  }, null, 2) + '\n'],
  llms: () => {
    if (facts.features?.llms_txt === false) return ['llms.txt', null];
    const L = [`# ${b.legal_name}`, '', `> ${b.description || need('μία παράγραφος: τι κάνει η επιχείρηση, πού, πότε')}`, '',
      `- Επωνυμία: ${b.legal_name}`, `- Τηλέφωνο: ${vars.PHONE_DISPLAY} (${vars.PHONE_E164})`, `- Email: ${b.email}`, `- Διεύθυνση: ${a.street}, ${a.locality} ${a.postal_code}${a.region ? ', ' + a.region : ''}`,
      `- Ωράριο: ${hoursText()}`];
    if (facts.areas?.length) L.push(`- Περιοχές: ${facts.areas.map((x) => x.name).join(', ')}`);
    L.push(`- Ιστοσελίδα: ${url}/`);
    if (facts.services?.length) { L.push('', '## Υπηρεσίες', '', ...facts.services.map((x) => `- ${x.name}${x.description ? ': ' + x.description : ''}`)); }
    const priced = (facts.prices || []).filter((p) => p.from != null);
    if (priced.length) { L.push('', '## Τιμές (από)', '', ...priced.map((p) => `- ${p.label}: από ${p.from}€`), ...(b.final_price_by_phone === true ? ['- Η τελική τιμή δίνεται στο τηλέφωνο, πριν ξεκινήσει η εργασία.'] : [])); }
    L.push('', '## Σελίδες', '', `- [Αρχική](${url}/)`, `- [Πολιτική απορρήτου](${url}/privacy.html)`);
    return ['llms.txt', L.join('\n') + '\n'];
  },
  vcf: () => ['assets/contact.vcf', ['BEGIN:VCARD', 'VERSION:3.0', `N:;${b.legal_name};;;`, `FN:${b.legal_name}`, `ORG:${b.legal_name}`, `TEL;TYPE=${/^\+306/.test(vars.PHONE_E164) ? 'CELL' : 'WORK'},VOICE:${vars.PHONE_E164}`, `EMAIL;TYPE=INTERNET:${b.email}`,
    `ADR;TYPE=WORK:;;${a.street};${a.locality};${a.region || ''};${a.postal_code};${a.country === 'GR' ? 'Ελλάδα' : a.country}`, `URL:${url}/`, ...(b.short_description ? [`NOTE:${b.short_description.replace(/[,;]/g, '\\$&')}`] : []), 'END:VCARD'].join('\r\n') + '\r\n'],
  htaccess: () => ['.htaccess', render(readTpl('htaccess.tpl'), false)],
};

const OUT = path.resolve(opt.out || '.');
function write(rel, content, { overwrite }) {
  const f = path.join(OUT, rel);
  if (fs.existsSync(f) && !overwrite && !opt.force) { console.log(`skip   ${rel} (exists; use --force to overwrite)`); return; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  console.log(`write  ${rel}`);
}

function injectJsonLd() {
  const f = path.join(OUT, 'index.html');
  if (!fs.existsSync(f)) { console.log('skip   JSON-LD (index.html does not exist yet)'); return; }
  let html = fs.readFileSync(f, 'utf8');
  const re = /(<!-- JSONLD:START[^>]*-->\n)[\s\S]*?(\n\s*<!-- JSONLD:END -->)/;
  if (re.test(html)) html = html.replace(re, (m, a1, a2) => a1 + vars.JSONLD + a2);
  else if (/<script type="application\/ld\+json">/.test(html)) html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '\n' + vars.JSONLD);
  else html = html.replace('</head>', vars.JSONLD + '\n</head>');
  fs.writeFileSync(f, html);
  console.log('update index.html (JSON-LD regenerated from facts)');
}

if (cmd === 'derive') {
  const wanted = opt.only || ['jsonld', 'sitemap', 'llms', 'robots', 'manifest', 'vcf'];
  for (const k of wanted) {
    if (k === 'jsonld') { injectJsonLd(); continue; }
    if (!derived[k]) { console.error('Unknown --only target:', k); process.exit(2); }
    if (k === 'vcf' && facts.features?.vcard === false) continue;
    const [rel, content] = derived[k]();
    if (content === null) continue;
    write(rel, content, { overwrite: true });
  }
  console.log('\nNow re-run: audit_site.mjs <out> --facts <facts>');
  process.exit(0);
}

// ------------------------------------------------------------------ init
for (const [rel, tpl, html] of [['index.html', 'index.html.tpl', true], ['404.html', '404.html.tpl', true], ['privacy.html', 'privacy.html.tpl', true], ['assets/css/style.css', 'style.css.tpl', false], ['assets/js/main.js', 'js/main.js.tpl', false]]) {
  write(rel, render(readTpl(tpl), html), { overwrite: false });
}
if (hasGa) write('assets/js/tracking.js', render(readTpl('js/tracking.js.tpl'), false), { overwrite: false });
for (const k of ['robots', 'sitemap', 'manifest', 'llms', 'htaccess']) { const [rel, content] = derived[k](); if (content !== null) write(rel, content, { overwrite: false }); }
if (facts.features?.vcard !== false) { const [rel, content] = derived.vcf(); write(rel, content, { overwrite: false }); }
for (const d of ['assets/img', 'assets/img/photos', 'assets/fonts']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
if (opt.logo) {
  if (!fs.existsSync(opt.logo)) console.error('WARN   logo file not found:', opt.logo);
  else {
    fs.copyFileSync(opt.logo, path.join(OUT, logoPath.slice(1))); console.log('copy   ' + logoPath.slice(1));
    if (hasSvgFavicon) { fs.copyFileSync(opt.logo, path.join(OUT, 'favicon.svg')); console.log('copy   favicon.svg'); }
  }
}
// project instructions for the next chat/agent (Claude reads CLAUDE.md, Codex reads AGENTS.md; CLAUDE.md just imports AGENTS.md)
const projectRoot = path.resolve(path.join(OUT, '..'));
const agents = `# ${b.legal_name} (${domain}): project rules for AI assistants\n\n- Single source of truth for business data: \`site-facts.json\` (never invent or hard-code facts; ask the owner).\n- The deploy folder is \`${path.basename(OUT)}/\`: nothing else (docs, facts, scripts) may be uploaded.\n- After changing phone/prices/hours/address/services: edit the facts, run \`scaffold.mjs derive\`, fix visible text, run \`bump_version.mjs\`.\n- Before saying a change is done: run \`audit_site.mjs ${path.basename(OUT)} --facts site-facts.json\` (0 errors) and, after upload, \`verify_live.mjs https://${domain} --local ${path.basename(OUT)}\`.\n- Use the \`local-business-site-builder\` skill for any website task here (design brief: docs/DESIGN.md; deploy and tracking guides: docs/).\n- Talk to the owner in Greek.\n`;
for (const [f, c] of [['AGENTS.md', agents], ['CLAUDE.md', '@AGENTS.md\n']]) { const p = path.join(projectRoot, f); if (!fs.existsSync(p) || opt.force) { fs.writeFileSync(p, c); console.log('write  ' + f); } }
// docs for the owner / agency (outside the deploy folder) + design brief at the project root
const docsDir = path.resolve(opt.docs || path.join(OUT, '..', 'docs'));
fs.mkdirSync(docsDir, { recursive: true });
for (const f of fs.readdirSync(path.join(TPL, 'docs'))) {
  const target = path.join(docsDir, f.replace(/\.tpl$/, ''));
  if (fs.existsSync(target) && !opt.force) { console.log(`skip   docs/${path.basename(target)} (exists)`); continue; }
  fs.writeFileSync(target, render(fs.readFileSync(path.join(TPL, 'docs', f), 'utf8'), false));
  console.log(`write  ${path.relative(process.cwd(), target)}`);
}
console.log(`\nDone. Next: write DESIGN.md decisions into style.css (tokens + THEME), build the sections in index.html,
add photos/fonts/icons (scripts/make_icons.mjs, scripts/images.mjs), then run:
  deno run -A scripts/audit_site.mjs ${opt.out} --facts ${opt.facts}`);
