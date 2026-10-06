// HTML-xxx / LINK-xxx / IMG-xxx / CSP-ready markup checks, per page.
import path from 'node:path';
import { ancestors, textOf } from '../lib/html.mjs';
import { imageInfo } from '../lib/media.mjs';
import { snippet } from '../lib/util.mjs';

const PLACEHOLDERS = [
  [/\{\{[^}]+\}\}/, 'unreplaced {{template}} token'],
  [/\[ΧΡΕΙΑΖΕΤΑΙ[^\]]*\]/, '[ΧΡΕΙΑΖΕΤΑΙ ...] marker (missing business fact)'],
  [/\b(TODO|FIXME|TBD)\b/, 'TODO/FIXME/TBD'],
  [/lorem ipsum/i, 'lorem ipsum'],
  [/(?<![\w.-])example\.(com|gr|org)\b/i, 'example.com / example.gr'],
  [/your (company|business|name)\b/i, '"Your company" placeholder'],
  [/\b(000[\s-]?000[\s-]?0{3,4}|123[\s-]?456[\s-]?789\d?|xxx[\s-]?xxx[\s-]?xxxx?)\b/i, 'dummy number'],
  [/ΟΝΟΜΑ ΕΠΙΧΕΙΡΗΣΗΣ|ΕΠΩΝΥΜΙΑ ΕΤΑΙΡΕΙΑΣ|ΤΗΛΕΦΩΝΟ ΕΠΙΧΕΙΡΗΣΗΣ|ΔΙΕΥΘΥΝΣΗ ΕΠΙΧΕΙΡΗΣΗΣ/, 'Greek placeholder label'],
];

const ASSET_ATTRS = [['link', 'href'], ['script', 'src'], ['img', 'src'], ['source', 'src'], ['iframe', 'src'], ['video', 'src'], ['video', 'poster'], ['audio', 'src'], ['object', 'data']];

function parseSrcset(v) {
  const t = (v || '').trim();
  if (!t || t.startsWith('data:')) return [];
  return t.split(/,\s+|,(?=[^\s])/).map((s) => s.trim().split(/\s+/)).filter((a) => a[0]).map(([url, desc]) => ({ url, desc: desc || '' }));
}

export function run(ctx) {
  const { F, pages } = ctx;
  const versions = new Map(); // asset rel -> Map(version -> Set(page))
  for (const pg of pages) {
    if (ctx.skipDir.test(pg.rel)) continue;
    try { pageChecks(ctx, pg, versions); }
    catch (e) { F.add('warn', 'HTML-999', pg.rel, `Audit could not fully analyse this page: ${e.message}`); }
  }
  for (const [asset, vs] of versions) {
    if (vs.size > 1) {
      F.add('error', 'CACHE-001', asset, `Different ?v= cache-buster values across pages: ${[...vs].map(([v, set]) => `v=${v} (${[...set].join(', ')})`).join(' | ')}`, 'Run scripts/bump_version.mjs so every page references the same version.');
    }
  }
  fontPreloads(ctx);
  jsRefs(ctx);
}

/** Links built inside JS strings (banner HTML etc.) must also point at real pages/anchors. */
function jsRefs(ctx) {
  const { F } = ctx;
  for (const j of ctx.js) {
    for (const m of j.src.matchAll(/href\s*=\s*\\?["'](\/[^"'\\\s]*)["']/g)) {
      const r = ctx.resolve(j.rel, m[1]);
      if (r.kind !== 'internal') continue;
      const lk = ctx.lookup(r.rel);
      const line = j.line(m.index);
      if (!lk.ok) { F.add('error', 'LINK-001', j.rel, `Link built in JS points to a missing page: ${m[1]}`, '', line); continue; }
      const target = ctx.pageByRel.get(lk.rel);
      if (r.hash && target && !target.ids.has(r.hash)) F.add('error', 'LINK-005', j.rel, `Link built in JS points to #${r.hash}, which does not exist in ${target.rel} (the cookie banner link breaks silently).`, 'Add the id on the target heading.', line);
    }
  }
}

function pageChecks(ctx, pg, versions) {
  const { F } = ctx;
  const rel = pg.rel;
  const isHome = rel === 'index.html';
  const is404 = rel === '404.html';
  const L = (el) => pg.line(el.start);
  const all = pg.all;

  if (!pg.doc.doctype) F.add('error', 'HTML-001', rel, 'Missing <!doctype html> (quirks mode).', 'Add <!doctype html> on line 1.');
  if (pg.bom) F.add('warn', 'HTML-014', rel, 'File starts with a BOM.', 'Save as UTF-8 without BOM.');
  if (!pg.lang) F.add('error', 'HTML-002', rel, 'Missing lang attribute on <html>.', '<html lang="el">');
  else if (ctx.facts?.site?.lang && pg.lang !== ctx.facts.site.lang) F.add('warn', 'HTML-002', rel, `lang="${pg.lang}" differs from facts (${ctx.facts.site.lang}).`);

  const charset = all.find((e) => e.name === 'meta' && 'charset' in e.attrs);
  if (!charset) F.add('error', 'HTML-003', rel, 'Missing <meta charset="utf-8">.', 'Put it first in <head>.');
  else if (charset.start > 1024) F.add('warn', 'HTML-003', rel, '<meta charset> is beyond the first 1024 bytes.', 'Move it to the top of <head>.');
  if (!all.some((e) => e.name === 'meta' && (e.attrs.name || '').toLowerCase() === 'viewport')) F.add('error', 'HTML-004', rel, 'Missing viewport meta (mobile layout breaks).', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');

  // ---- title / description / canonical / robots
  const title = pg.title.replace(/\s+/g, ' ');
  if (!title) F.add('error', 'HTML-005', rel, 'Missing or empty <title>.');
  else if (!is404 && (title.length > 66 || title.length < 15)) F.add('warn', 'HTML-005', rel, `<title> is ${title.length} characters (aim for ~30-60): "${title}"`);
  const desc = pg.meta.byName.description?.[0];
  if (!is404) {
    if (!desc) F.add('error', 'HTML-006', rel, 'Missing meta description.');
    else if (desc.attrs.content.length < 70 || desc.attrs.content.length > 175) F.add('warn', 'HTML-006', rel, `Meta description is ${desc.attrs.content.length} characters (aim 90-160).`);
  }
  if (!is404) {
    if (!pg.canonical) F.add('error', 'SEO-020', rel, 'Missing <link rel="canonical">.', `<link rel="canonical" href="https://${ctx.domain || 'DOMAIN'}${ctx.pageUrl(rel)}">`);
    else {
      const r = ctx.resolve(rel, pg.canonical);
      if (r.kind !== 'internal' || !r.abs) F.add('error', 'SEO-021', rel, `Canonical must be an absolute URL on the site's own domain: ${pg.canonical}`);
      else {
        if (r.scheme !== 'https:') F.add('error', 'SEO-021', rel, `Canonical is not https: ${pg.canonical}`);
        if (r.host !== ctx.domain) F.add('error', 'SEO-021', rel, `Canonical host "${r.host}" differs from the canonical domain "${ctx.domain}".`);
        const expected = ctx.pageUrl(rel);
        const got = new URL(pg.canonical).pathname;
        if (got !== expected) F.add('error', 'SEO-022', rel, `Canonical path ${got} does not match this page (${expected}).`);
      }
    }
    if (pg.noindex) F.add('error', 'SEO-023', rel, `Page is marked noindex (${pg.robotsMeta}) but is a normal public page. (Leftover from staging?)`, 'Remove the noindex robots meta or use "index, follow".');
  } else if (!pg.noindex) {
    F.add('error', 'SEO-024', rel, '404 page must carry <meta name="robots" content="noindex">.');
  }
  for (const m of all.filter((e) => e.name === 'meta' && 'content' in e.attrs && e.attrs.content.trim() === '')) {
    F.add('warn', 'HTML-007', rel, `Empty meta content (${m.attrs.name || m.attrs.property || 'meta'}): verification tags with no token are noise.`, 'Delete it until you have the real value.', L(m));
  }
  const theme = pg.meta.byName['theme-color']?.[0];
  if (!theme) F.add('info', 'HTML-008', rel, 'No <meta name="theme-color">.');

  // ---- Open Graph (not for 404)
  if (!is404) {
    const og = (k) => pg.meta.byProp[k]?.[0]?.attrs.content;
    for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:locale']) {
      if (!og(k)) F.add('warn', 'OG-001', rel, `Missing ${k}.`, 'Every public page (privacy too) needs the basic OG set.');
    }
    if (!pg.meta.byName['twitter:card']?.length) F.add('info', 'OG-002', rel, 'Missing twitter:card.');
    if (og('og:url') && pg.canonical && og('og:url') !== pg.canonical) F.add('warn', 'OG-003', rel, `og:url (${og('og:url')}) differs from canonical (${pg.canonical}).`);
    const img = og('og:image');
    if (img) {
      const r = ctx.resolve(rel, img);
      if (r.kind === 'internal') {
        const lk = ctx.lookup(r.rel);
        if (!lk.ok) F.add('error', 'OG-004', rel, `og:image points to a missing file: ${img}`);
        else {
          const info = imageInfo(path.join(ctx.root, lk.rel));
          if (info && info.width && (Math.abs(info.width / info.height - 1.91) > 0.06 || info.width < 1200)) F.add('warn', 'OG-005', rel, `og:image is ${info.width}x${info.height}; use 1200x630.`);
        }
        if (!r.abs) F.add('error', 'OG-006', rel, `og:image must be an absolute https URL (crawlers do not resolve relative paths): ${img}`);
      }
    }
  }

  // ---- icons / manifest
  {
    const rels =all.filter((e) => e.name === 'link').map((e) => (e.attrs.rel || '').toLowerCase().split(/\s+/));
    if (!rels.some((r) => r.includes('icon'))) F.add('warn', 'HTML-009', rel, 'No favicon <link rel="icon">.');
    if (isHome && !rels.some((r) => r.includes('apple-touch-icon'))) F.add('warn', 'HTML-009', rel, 'No apple-touch-icon link.');
    if (isHome && !rels.some((r) => r.includes('manifest'))) F.add('info', 'HTML-009', rel, 'No manifest link.');
  }

  // ---- structure
  const h1s = all.filter((e) => e.name === 'h1');
  if (h1s.length !== 1) F.add(h1s.length === 0 ? 'error' : 'warn', 'HTML-010', rel, `Found ${h1s.length} <h1> (should be exactly 1).`);
  let prev = 0;
  for (const h of all.filter((e) => /^h[1-6]$/.test(e.name))) {
    const lv = +h.name[1];
    if (prev && lv > prev + 1) { F.add('warn', 'HTML-011', rel, `Heading level jumps from h${prev} to h${lv}: "${snippet(textOf(h), 0, 50)}"`, '', L(h)); break; }
    prev = lv;
  }
  if (!all.some((e) => e.name === 'main')) F.add('warn', 'HTML-012', rel, 'No <main> landmark.');
  if (!all.some((e) => e.name === 'a' && /^#(main|content)/.test(e.attrs.href || '')) && !is404) F.add('info', 'HTML-013', rel, 'No "skip to content" link.');
  const dupIds = [...pg.ids].filter(([, v]) => v.length > 1);
  for (const [id, v] of dupIds) F.add('error', 'HTML-015', rel, `Duplicate id="${id}" (${v.length}x).`, '', L(v[1]));
  for (const e of all) {
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      if (e.attrs[a]) for (const id of e.attrs[a].split(/\s+/)) if (!pg.ids.has(id)) F.add('error', 'A11Y-001', rel, `${a}="${id}" points to an id that does not exist.`, '', L(e));
    }
  }

  // ---- inline code vs CSP (works even if no CSP yet: warns about CSP-readiness)
  const scriptInlineOk = ctx.csp ? ctx.cspAllowsInline('script-src') : false;
  const styleInlineOk = ctx.csp ? ctx.cspAllowsInline('style-src') : false;
  const lvl = (ok, hasCsp) => (hasCsp && !ok ? 'error' : 'warn');
  for (const s of all.filter((e) => e.name === 'script' && !('src' in e.attrs))) {
    if (/^(application\/(ld\+json|json)|importmap|speculationrules)/i.test(s.attrs.type || '')) continue;
    if ((s.raw || '').trim()) F.add(lvl(scriptInlineOk, !!ctx.csp), 'CSP-001', rel, 'Inline <script> (blocked by a strict CSP; forces unsafe-inline).', 'Move the code to /assets/js/*.js.', L(s));
  }
  for (const e of all) {
    const on = Object.keys(e.attrs).filter((k) => /^on[a-z]+$/.test(k));
    if (on.length) F.add(lvl(scriptInlineOk, !!ctx.csp), 'CSP-002', rel, `Inline event handler ${on.join(', ')} on <${e.name}>.`, 'Use addEventListener in main.js (or data-* hooks).', L(e));
    if ('style' in e.attrs) F.add(lvl(styleInlineOk, !!ctx.csp), 'CSP-003', rel, `style="" attribute on <${e.name}> (blocked by style-src 'self').`, 'Use a class in style.css.', L(e));
    if (e.name === 'a' && /^\s*javascript:/i.test(e.attrs.href || '')) F.add('error', 'CSP-004', rel, 'javascript: URL.', '', L(e));
  }
  for (const s of all.filter((e) => e.name === 'style')) F.add(lvl(styleInlineOk, !!ctx.csp), 'CSP-005', rel, '<style> block (blocked by style-src \'self\').', 'Move to style.css.', L(s));

  // ---- placeholders
  for (const [re, label] of PLACEHOLDERS) {
    const m = pg.src.match(re);
    if (m) F.add('error', 'PLACEHOLDER-001', rel, `Placeholder left in the page: ${label} ("${snippet(pg.src, m.index, 60)}").`, 'Replace with the real (owner-confirmed) value or remove the element.', pg.line(m.index));
  }

  // ---- links & assets
  for (const e of all) {
    if (e.name === 'a' && 'href' in e.attrs) checkAnchor(ctx, pg, e, L(e));
    for (const [tag, attr] of ASSET_ATTRS) if (e.name === tag && attr in e.attrs) checkAsset(ctx, pg, e, attr, e.attrs[attr], versions, L(e));
    if ((e.name === 'img' || e.name === 'source') && e.attrs.srcset) {
      for (const c of parseSrcset(e.attrs.srcset)) checkAsset(ctx, pg, e, 'srcset', c.url, versions, L(e), c.desc);
      if (e.name === 'img' && /\d+w/.test(e.attrs.srcset) && !e.attrs.sizes) F.add('warn', 'IMG-005', rel, 'srcset with w-descriptors but no sizes attribute (browser assumes 100vw).', '', L(e));
    }
    if (e.name === 'form') F.add('info', 'FORM-001', rel, 'A <form> exists: needs a backend, a privacy-page update, spam protection and CSP form-action (references/09-beyond-the-basics.md).', '', L(e));
    if (e.name === 'iframe') {
      if (!e.attrs.title) F.add('error', 'A11Y-002', rel, '<iframe> without title.', '', L(e));
      const src = e.attrs.src || '';
      if (/^(https?:)?\/\//i.test(src)) F.add('error', 'PRIV-001', rel, `Third-party <iframe src="${src.slice(0, 70)}"> in static HTML: it contacts that provider on page load (privacy + speed).`, 'Load it only after a click (see assets/templates/js/main.js map loader).', L(e));
    }
  }

  // ---- images
  const imgs = all.filter((e) => e.name === 'img');
  const main = all.find((e) => e.name === 'main');
  const firstSection = main ? all.find((e) => e.name === 'section' && ancestors(e).includes(main)) : null;
  for (const img of imgs) {
    if (!('alt' in img.attrs)) F.add('error', 'IMG-001', rel, `<img src="${img.attrs.src}"> has no alt attribute.`, 'alt="" if decorative, otherwise describe what is shown.', L(img));
    if (!img.attrs.width || !img.attrs.height) F.add('warn', 'IMG-002', rel, `<img src="${img.attrs.src}"> lacks width/height (layout shift).`, '', L(img));
    if (img.attrs.loading === 'lazy' && firstSection && ancestors(img).includes(firstSection)) F.add('warn', 'IMG-004', rel, 'Image inside the first (hero) section is loading="lazy": it delays the main content paint.', 'Remove loading=lazy; add fetchpriority="high" to the hero image.', L(img));
    const r = img.attrs.src ? ctx.resolve(rel, img.attrs.src) : null;
    if (r?.kind === 'internal') {
      const lk = ctx.lookup(r.rel);
      if (lk.ok && img.attrs.width && img.attrs.height) {
        const info = imageInfo(path.join(ctx.root, lk.rel));
        if (info?.width && info.height) {
          const ratioFile = info.width / info.height;
          const ratioAttr = +img.attrs.width / +img.attrs.height;
          if (Math.abs(ratioFile - ratioAttr) / ratioAttr > 0.03) F.add('warn', 'IMG-003', rel, `<img> width/height (${img.attrs.width}x${img.attrs.height}) do not match the file's real shape (${info.width}x${info.height}).`, '', L(img));
        }
      }
    }
  }

  // ---- 404 served on any URL depth => assets must be root-relative
  if (is404) {
    for (const e of all) {
      for (const [tag, attr] of [['link', 'href'], ['script', 'src'], ['img', 'src'], ['a', 'href']]) {
        const v = e.name === tag ? e.attrs[attr] : null;
        if (v && !/^(\/|#|https?:|mailto:|tel:|data:)/i.test(v)) F.add('error', 'P404-001', rel, `Relative path "${v}" on the 404 page: it breaks when the error page is served at /some/deep/url.`, 'Use root-relative paths (/assets/...).', L(e));
      }
    }
  }
}

function checkAnchor(ctx, pg, e, line) {
  const { F } = ctx;
  const href = e.attrs.href;
  const rel = pg.rel;
  if (href.trim() === '' || href.trim() === '#') { F.add('warn', 'LINK-007', rel, `Empty/"#" link: "${snippet(textOf(e), 0, 40)}"`, '', line); return; }
  const name = textOf(e).trim() || e.attrs['aria-label'] || (e.children.some((c) => c.type === 'el' && c.name === 'img' && c.attrs.alt) ? 'img' : '');
  if (!name) F.add('error', 'A11Y-003', rel, `Link to ${href} has no accessible name (no text / aria-label).`, '', line);
  if (/^tel:/i.test(href) && !/^tel:\+\d{10,15}$/.test(href)) F.add('warn', 'LINK-008', rel, `tel: link not in international format (${href}). Use tel:+30XXXXXXXXXX.`, '', line);
  if (/^mailto:/i.test(href) && !/^mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(href)) F.add('warn', 'LINK-009', rel, `Malformed mailto: ${href}`, '', line);
  const r = ctx.resolve(rel, href);
  if (r.kind === 'external') {
    if (e.attrs.target === '_blank' && !/noopener/.test(e.attrs.rel || '')) F.add('warn', 'LINK-010', rel, `target=_blank without rel="noopener": ${href.slice(0, 60)}`, '', line);
    if (r.url.protocol === 'http:') F.add('warn', 'LINK-011', rel, `Insecure http:// link: ${href}`, '', line);
    return;
  }
  if (r.kind !== 'internal') return;
  if (r.abs && (r.host !== ctx.domain || r.scheme !== 'https:')) F.add('warn', 'LINK-004', rel, `Absolute link uses a non-canonical host/scheme (${r.scheme}//${r.host}): ${href}`, '', line);
  if (!r.sameDoc) {
    const lk = ctx.lookup(r.rel);
    if (!lk.ok && lk.caseOnly) F.add('error', 'LINK-002', rel, `Link ${href} differs only by letter case from the real file "${lk.caseOnly}": works on Windows/macOS, 404 on the Linux server.`, '', line);
    else if (!lk.ok) F.add('error', 'LINK-001', rel, `Broken internal link: ${href}`, '', line);
    else if (lk.extensionless && !rewritesTo(ctx, r.rel)) F.add('warn', 'LINK-003', rel, `Link ${href} has no .html but the server has no rewrite for it (404).`, 'Link to the .html file or add a RewriteRule.', line);
    if (r.rel === 'index.html' && !/^\/?$/.test(href.replace(/^https?:\/\/[^/]+/, '').split('#')[0])) F.add('warn', 'LINK-006', rel, `Link to ${href}: the canonical home URL is "/".`, '', line);
  }
  if (r.hash && r.hash !== 'top') {
    const target = lkPage(ctx, r.rel);
    if (target && !target.ids.has(r.hash)) F.add('error', 'LINK-005', rel, `Anchor #${r.hash} does not exist in ${target.rel} (link: ${href}).`, 'Add the id on the target element or fix the link.', line);
  }
}

function lkPage(ctx, rel) { return ctx.pageByRel.get(rel) || ctx.pageByRel.get(ctx.lookup(rel).rel); }

export function rewritesTo(ctx, rel) {
  const base = rel.replace(/\.html$/, '');
  return !!ctx.htaccess?.parsed.directives.some((d) => /^RewriteRule/i.test(d.name) && d.text.includes(base));
}

function checkAsset(ctx, pg, e, attr, ref, versions, line, desc = '') {
  const { F } = ctx;
  const rel = pg.rel;
  const r = ctx.resolve(rel, ref);
  if (r.kind === 'external') {
    if (r.url.protocol === 'http:') F.add('error', 'MIX-001', rel, `Insecure http:// resource (mixed content): ${ref}`, '', line);
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url.hostname)) F.add('error', 'PRIV-002', rel, `Google Fonts CDN (${r.url.hostname}) sends visitor IPs to Google before consent and needs CSP exceptions.`, 'Self-host the font files (scripts/font_greek_check.mjs explains how).', line);
    if (e.name === 'link' && /stylesheet/.test(e.attrs.rel || '')) F.add('warn', 'PERF-006', rel, `External render-blocking stylesheet: ${ref}`, '', line);
    return;
  }
  if (r.kind !== 'internal') return;
  if (r.abs && (r.host !== ctx.domain || r.scheme !== 'https:')) F.add('warn', 'LINK-004', rel, `Absolute asset URL uses a non-canonical host/scheme: ${ref}`, '', line);
  const lk = ctx.lookup(r.rel);
  if (!lk.ok && lk.caseOnly) F.add('error', 'LINK-002', rel, `Asset ${ref} differs only by letter case from "${lk.caseOnly}": loads on Windows, 404 on the Linux server.`, '', line);
  else if (!lk.ok) F.add('error', 'REF-001', rel, `Missing file referenced by <${e.name} ${attr}>: ${ref}`, '', line);
  else if (attr === 'srcset' && desc.endsWith('w')) {
    const info = imageInfo(path.join(ctx.root, lk.rel));
    if (info?.width && Math.abs(info.width - parseInt(desc, 10)) > 2) F.add('warn', 'IMG-006', rel, `srcset says ${desc} but ${lk.rel} is really ${info.width}px wide.`, '', line);
  }
  // cache-buster bookkeeping for css/js
  if (lk.ok && ((e.name === 'link' && /stylesheet/.test(e.attrs.rel || '')) || e.name === 'script') && /\.(css|m?js)$/i.test(lk.rel)) {
    const v = (r.query.match(/(?:^|&)v=([^&]+)/) || [])[1];
    if (!v) F.add('warn', 'CACHE-002', rel, `${ref} has no ?v= cache-buster: after you change it, visitors keep the old file for weeks.`, 'Add ?v=1 and bump it with scripts/bump_version.mjs on every change.', line);
    else { const m = versions.get(lk.rel) || versions.set(lk.rel, new Map()).get(lk.rel); (m.get(v) || m.set(v, new Set()).get(v)).add(rel); }
    if (e.name === 'script' && !('defer' in e.attrs) && !('async' in e.attrs) && (e.attrs.type || '') !== 'module') F.add('warn', 'PERF-007', rel, `Render-blocking <script src="${ref}"> (no defer/async).`, 'Add defer.', line);
  }
}

/** Font files declared in CSS must be preloaded on the home page (with crossorigin), or text flashes/shifts. */
function fontPreloads(ctx) {
  const { F, home } = ctx;
  if (!home) return;
  const faces = [];
  for (const c of ctx.css) for (const ff of c.parsed.fontFaces) {
    const src = ff.decls.find((d) => d.prop === 'src')?.value || '';
    for (const m of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) faces.push({ url: m[1], css: c.rel, line: ff.line });
  }
  const preloads = home.all.filter((e) => e.name === 'link' && (e.attrs.rel || '').includes('preload') && e.attrs.as === 'font');
  for (const p of preloads) {
    if (!('crossorigin' in p.attrs)) F.add('error', 'FONT-001', 'index.html', `Font preload ${p.attrs.href} lacks crossorigin (the font is downloaded twice).`, 'Add crossorigin.', home.line(p.start));
    if (p.attrs.type && p.attrs.type !== 'font/woff2') F.add('info', 'FONT-002', 'index.html', `Font preload type is ${p.attrs.type}; use font/woff2.`);
  }
  const preloaded = new Set(preloads.map((p) => ctx.resolve('index.html', p.attrs.href).rel));
  for (const f of faces) {
    const r = ctx.resolve(f.css, f.url);
    if (r.kind !== 'internal') { F.add('error', 'PRIV-002', f.css, `Font loaded from a third party: ${f.url}`, 'Self-host it.', f.line); continue; }
    const lk = ctx.lookup(r.rel);
    if (!lk.ok) F.add('error', 'REF-001', f.css, `@font-face file missing: ${f.url}`, '', f.line);
    else if (!preloaded.has(lk.rel) && !preloaded.has(r.rel)) F.add('warn', 'FONT-003', f.css, `Font ${lk.rel} is not preloaded on the home page (text swaps late: layout shift on numbers/€).`, '<link rel="preload" href="..." as="font" type="font/woff2" crossorigin>', f.line);
  }
  for (const p of preloads) {
    const r = ctx.resolve('index.html', p.attrs.href);
    if (r.kind === 'internal' && !faces.some((f) => ctx.resolve(f.css, f.url).rel === r.rel)) F.add('warn', 'FONT-004', 'index.html', `Preloaded font ${p.attrs.href} is not used by any @font-face (wasted request).`);
  }
}
