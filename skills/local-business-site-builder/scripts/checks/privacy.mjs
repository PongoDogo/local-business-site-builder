// PRIV-xxx: nothing third-party before consent; consent banner done properly; privacy page matches reality.
import { norm } from '../lib/util.mjs';

const TRACKERS = [
  ['googletagmanager.com', 'Google tag / Tag Manager'], ['google-analytics.com', 'Google Analytics'], ['doubleclick.net', 'Google Ads (DoubleClick)'],
  ['googleadservices.com', 'Google Ads'], ['connect.facebook.net', 'Meta Pixel'], ['facebook.com/tr', 'Meta Pixel'], ['hotjar.com', 'Hotjar'],
  ['clarity.ms', 'Microsoft Clarity'], ['snap.licdn.com', 'LinkedIn Insight'], ['static.ads-twitter.com', 'X pixel'], ['analytics.tiktok.com', 'TikTok pixel'],
  ['tawk.to', 'Tawk.to chat'], ['crisp.chat', 'Crisp chat'], ['hs-scripts.com', 'HubSpot'], ['mailchimp.com', 'Mailchimp'],
];
const SIGNALS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];
const SKIP_HOSTS = /(^|\.)(w3\.org|schema\.org|sitemaps\.org|apache\.org)$/;

export function run(ctx) {
  const { F, pages } = ctx;
  const trackerHits = new Map();

  // 1) trackers hard-coded in HTML = loaded before any consent
  for (const pg of pages) {
    if (ctx.skipDir.test(pg.rel)) continue;
    for (const e of pg.all) {
      if (e.name === 'script' && !/ld\+json/i.test(e.attrs.type || '')) {
        const hay = (e.attrs.src || '') + '\n' + (e.raw || '');
        for (const [host, label] of TRACKERS) if (hay.includes(host)) F.add('error', 'PRIV-010', pg.rel, `${label} is loaded directly from the HTML: it runs before the visitor has consented.`, 'Load it from tracking.js only after "Αποδοχή" (templates/js/tracking.js).', pg.line(e.start));
      }
      if (e.name === 'img' && /facebook\.com\/tr|google-analytics\.com|doubleclick/.test(e.attrs.src || '')) F.add('error', 'PRIV-010', pg.rel, `Tracking pixel <img src="${(e.attrs.src || '').slice(0, 60)}">.`, '', pg.line(e.start));
    }
  }
  // 2) trackers inside JS
  for (const j of ctx.js) for (const [host, label] of TRACKERS) if (j.src.includes(host)) (trackerHits.get(label) || trackerHits.set(label, new Set()).get(label)).add(j.rel);
  const hasTracking = trackerHits.size > 0;
  const js = ctx.jsText;

  if (hasTracking) {
    const def = js.match(/gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]\s*,\s*\{([\s\S]*?)\}\s*\)/);
    if (!def) F.add('warn', 'PRIV-011', '', 'Google tag is used but there is no gtag("consent","default",{...}) with everything "denied". Consent Mode v2 defaults before any tag are required for Google Ads/EEA ad features and recommended for GA4 (loading gtag only after Accept is the minimum).', 'See assets/templates/js/tracking.js.');
    else {
      for (const sig of SIGNALS) if (!new RegExp(`${sig}\\s*:\\s*['"]denied['"]`).test(def[1])) F.add('warn', 'PRIV-012', '', `Consent default for ${sig} is not "denied" (Consent Mode v2 needs all four: ${SIGNALS.join(', ')}).`);
      const loadAt = js.search(/createElement\(\s*['"]script['"]\s*\)|googletagmanager\.com\/gtag\/js/);
      if (loadAt !== -1 && def.index > loadAt) F.add('error', 'PRIV-013', '', 'The consent defaults come AFTER the code that loads the Google tag. Order matters: defaults first.');
    }
    if (!/['"]consent['"]\s*,\s*['"]update['"]/.test(js)) F.add('warn', 'PRIV-014', '', 'No gtag("consent","update",...) call: choices are never passed to Google.');
    const accept = /αποδοχ|accept|συμφων/i.test(js);
    const reject = /απ[οό]ρριψ|reject|decline|μ[οό]νο τα απαραίτητα/i.test(js);
    if (!(accept && reject)) F.add('error', 'PRIV-015', '', `The banner needs Accept AND Reject buttons of equal prominence (found accept:${accept}, reject:${reject}). Greek DPA / EDPB: refusing must be as easy as accepting.`);
    if (/data-choice=["']reject["'][^>]*class=["'][^"']*(linklike|link)/.test(js)) F.add('warn', 'PRIV-016', '', 'Reject looks styled as a plain link while Accept is a button (dark pattern).');
    if (!/(localStorage|document\.cookie)/.test(js)) F.add('warn', 'PRIV-017', '', 'The consent choice is never stored (the banner would reappear on every page).');
    if (!/CONSENT_VERSION|consent_version|consentVersion/.test(js)) F.add('info', 'PRIV-018', '', 'No consent version constant: when purposes/providers change you cannot re-ask everyone.');
    if (!/MAX_AGE|expires|expiry|180/.test(js)) F.add('info', 'PRIV-019', '', 'No expiry for the stored choice (recommended: re-ask after ~6 months).');
    // every page should offer a way to change the choice
    const trackerScripts = ctx.js.filter((j) => TRACKERS.some(([h]) => j.src.includes(h))).map((j) => j.rel);
    for (const pg of pages) {
      if (ctx.skipDir.test(pg.rel)) continue;
      const loads = pg.all.some((e) => e.name === 'script' && e.attrs.src && trackerScripts.includes(ctx.resolve(pg.rel, e.attrs.src).rel));
      if (!loads) F.add('warn', 'PRIV-020', pg.rel, 'This page does not load the consent/tracking script: visitors landing here are never asked (and cannot change their choice).');
      else if (!pg.all.some((e) => 'data-cookie-settings' in e.attrs)) F.add('warn', 'PRIV-021', pg.rel, 'No "Ρυθμίσεις cookies" control ([data-cookie-settings]) to change/withdraw consent.');
    }
    // privacy page content
    const priv = ctx.pageByRel.get('privacy.html');
    if (priv) {
      const t = norm(priv.text);
      const needs = [['google', 'names Google as a recipient'], ['cookie', 'explains cookies'], ['δικαιωματ', 'lists the visitor rights'], ['κρατ|διατηρ|διαγρ', 'states retention periods'], ['συγκαταθεσ', 'states consent as the legal basis']];
      for (const [k, what] of needs) if (!new RegExp(k).test(t)) F.add('warn', 'PRIV-030', 'privacy.html', `Privacy page does not mention "${k}" (it should ${what}).`);
      if (ctx.country === 'GR' && !/dpa\.gr/.test(priv.src)) F.add('warn', 'PRIV-031', 'privacy.html', 'No link to the Greek Data Protection Authority (dpa.gr) for complaints.');
    }
  }

  // 3) click-to-load third-party embeds must be disclosed
  const embedsMaps = /google\.com\/maps\/embed/.test(pagesText(ctx) + js);
  if (embedsMaps) {
    const priv = ctx.pageByRel.get('privacy.html');
    if (priv && !/χάρτ|map/i.test(priv.text)) F.add('warn', 'PRIV-032', 'privacy.html', 'The site embeds Google Maps but the privacy page never mentions the map.');
    const staticLoad = pages.some((pg) => pg.all.some((e) => e.name === 'iframe' && /google\.com\/maps/.test(e.attrs.src || '')));
    if (!staticLoad && !/replaceChildren|appendChild|createElement\(\s*['"]iframe/.test(js)) F.add('info', 'PRIV-033', '', 'Map embed URL found but no click-to-load code.');
  }

  // 4) third-party host inventory for the human
  const hosts = new Map();
  const note = (host, where) => { if (!host || SKIP_HOSTS.test(host) || host === ctx.domain || host === 'www.' + ctx.domain) return; (hosts.get(host) || hosts.set(host, new Set()).get(host)).add(where); };
  for (const pg of pages) {
    if (ctx.skipDir.test(pg.rel)) continue;
    for (const e of pg.all) {
      for (const k of ['src', 'srcset', 'data-map-src', 'data-src', 'poster']) {
        const v = e.attrs[k];
        if (v && /^https?:\/\//.test(v)) { try { note(new URL(v).hostname, pg.rel); } catch { /* ignore */ } }
      }
      if (e.name === 'link' && /^https?:\/\//.test(e.attrs.href || '') && !/canonical|alternate/.test(e.attrs.rel || '')) { try { note(new URL(e.attrs.href).hostname, pg.rel); } catch { /* ignore */ } }
    }
  }
  for (const j of ctx.js) for (const m of j.src.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) note(m[1].toLowerCase(), j.rel);
  for (const c of ctx.css) for (const m of c.src.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) note(m[1].toLowerCase(), c.rel);
  if (hosts.size) F.add('verify', 'PRIV-040', '', `Third-party hosts contacted by pages/scripts: ${[...hosts].map(([h, w]) => `${h} (${[...w].join(', ')})`).join('; ')}. Each must be (a) needed, (b) disclosed in the privacy page, (c) only reachable after consent or a click, (d) allowed in the CSP.`);
  else F.add('info', 'PRIV-041', '', 'No third-party hosts referenced. (Best possible privacy posture.)');
}

function pagesText(ctx) { return ctx.pages.map((p) => p.src).join('\n'); }
