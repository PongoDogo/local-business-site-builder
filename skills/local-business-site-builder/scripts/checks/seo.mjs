// SEO-xxx: robots.txt, sitemap.xml, llms.txt, manifest/icons, domain consistency.
import path from 'node:path';
import { imageInfo } from '../lib/media.mjs';

export function run(ctx) {
  robots(ctx);
  sitemap(ctx);
  llms(ctx);
  manifest(ctx);
  domainConsistency(ctx);
}

// ------------------------------------------------------------------ robots
function robots(ctx) {
  const { F } = ctx;
  const t = ctx.txt.robots?.text;
  if (t == null) return;
  const groups = [];
  let cur = null;
  const sitemaps = [];
  t.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) return;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if (k === 'sitemap') sitemaps.push({ v, line: i + 1 });
    else if (cur && (k === 'disallow' || k === 'allow')) cur.rules.push({ k, v, line: i + 1 });
  });
  for (const g of groups) {
    const blocksAll = g.rules.some((r) => r.k === 'disallow' && (r.v === '/' || r.v === '/*')) && !g.rules.some((r) => r.k === 'allow' && r.v === '/');
    const important = g.agents.some((a) => ['*', 'googlebot', 'bingbot', 'googlebot-image'].includes(a));
    if (blocksAll && important) {
      const r = g.rules.find((x) => x.k === 'disallow' && (x.v === '/' || x.v === '/*'));
      F.add('error', 'SEO-001', 'robots.txt', `CRITICAL: "Disallow: ${r.v}" for ${g.agents.join(', ')} blocks Google from the whole site (typical staging leftover). The site will not be indexed.`, 'Use: User-agent: * / Allow: / / Sitemap: https://DOMAIN/sitemap.xml', r.line);
    } else if (blocksAll) {
      F.add('warn', 'SEO-001', 'robots.txt', `Group for ${g.agents.join(', ')} disallows everything (fine only for intentional bot blocking).`);
    }
    for (const r of g.rules) {
      if (r.k === 'disallow' && /^\/(assets|css|js|static|img|images|fonts)\b/.test(r.v) && important) F.add('warn', 'SEO-004', 'robots.txt', `Disallow ${r.v} hides CSS/JS/images from Google (it needs them to render the page).`, '', r.line);
    }
  }
  if (!sitemaps.length) F.add('error', 'SEO-003', 'robots.txt', 'No "Sitemap:" line.', 'Sitemap: https://DOMAIN/sitemap.xml');
  for (const s of sitemaps) {
    try {
      const u = new URL(s.v);
      if (u.protocol !== 'https:' || (ctx.domain && u.hostname !== ctx.domain)) F.add('error', 'SEO-003', 'robots.txt', `Sitemap URL ${s.v} is not https://${ctx.domain || 'DOMAIN'}/...`, '', s.line);
    } catch { F.add('error', 'SEO-003', 'robots.txt', `Sitemap URL is not absolute: ${s.v}`, '', s.line); }
  }
}

// ------------------------------------------------------------------ sitemap
function sitemap(ctx) {
  const { F } = ctx;
  const t = ctx.txt.sitemap?.text;
  if (t == null) return;
  if (!/<urlset[\s>]/.test(t) || !/<\/urlset>/.test(t)) F.add('error', 'SEO-010', 'sitemap.xml', 'Not a valid <urlset> sitemap.');
  const entries = [...t.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({ loc: (m[1].match(/<loc>\s*([^<]*?)\s*<\/loc>/) || [])[1], lastmod: (m[1].match(/<lastmod>\s*([^<]*?)\s*<\/lastmod>/) || [])[1] }));
  if (!entries.length) F.add('error', 'SEO-011', 'sitemap.xml', 'No <url> entries.');
  const seen = new Set();
  const listed = new Set();
  for (const e of entries) {
    if (!e.loc) { F.add('error', 'SEO-011', 'sitemap.xml', 'A <url> without <loc>.'); continue; }
    if (/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(e.loc)) F.add('error', 'SEO-012', 'sitemap.xml', `Unescaped & in <loc>: ${e.loc}`);
    if (seen.has(e.loc)) F.add('warn', 'SEO-013', 'sitemap.xml', `Duplicate <loc> ${e.loc}`);
    seen.add(e.loc);
    let u;
    try { u = new URL(e.loc); } catch { F.add('error', 'SEO-011', 'sitemap.xml', `<loc> is not an absolute URL: ${e.loc}`); continue; }
    if (u.protocol !== 'https:') F.add('error', 'SEO-014', 'sitemap.xml', `<loc> is not https: ${e.loc}`);
    if (ctx.domain && u.hostname !== ctx.domain) F.add('error', 'SEO-014', 'sitemap.xml', `<loc> host ${u.hostname} differs from the canonical domain ${ctx.domain}.`);
    let rel = u.pathname.replace(/^\//, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const pg = ctx.pageByRel.get(rel);
    listed.add(rel);
    if (!ctx.fileSet.has(rel)) F.add('error', 'SEO-015', 'sitemap.xml', `<loc> ${e.loc} has no matching file (${rel}).`);
    else if (pg) {
      if (pg.noindex) F.add('error', 'SEO-016', 'sitemap.xml', `${e.loc} is noindex but listed in the sitemap.`);
      if (pg.canonical && pg.canonical.replace(/\/$/, '') !== e.loc.replace(/\/$/, '')) F.add('error', 'SEO-017', 'sitemap.xml', `<loc> ${e.loc} differs from the page canonical ${pg.canonical}.`);
    }
    if (e.lastmod) {
      if (!/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/.test(e.lastmod)) F.add('warn', 'SEO-018', 'sitemap.xml', `lastmod "${e.lastmod}" is not an ISO date.`);
      else if (Date.parse(e.lastmod) > Date.now() + 864e5) F.add('warn', 'SEO-018', 'sitemap.xml', `lastmod ${e.lastmod} is in the future.`);
    }
  }
  for (const pg of ctx.pages) {
    if (pg.rel === '404.html' || pg.noindex || ctx.skipDir.test(pg.rel)) continue;
    if (!listed.has(pg.rel)) F.add('error', 'SEO-019', 'sitemap.xml', `Indexable page ${pg.rel} is missing from the sitemap.`, 'Add a <url> entry (and bump lastmod when the page changes).');
  }
}

// ------------------------------------------------------------------ llms.txt
function llms(ctx) {
  const t = ctx.txt.llms?.text;
  if (t == null) return;
  if (!/^#\s+\S/m.test(t)) F.add('warn', 'LLMS-001', 'llms.txt', 'No "# Title" H1 line (llms.txt format).');
  if (!/^>\s+\S/m.test(t)) ctx.F.add('info', 'LLMS-002', 'llms.txt', 'No "> summary" blockquote line.');
  if (/disallow|noindex/i.test(t)) ctx.F.add('info', 'LLMS-003', 'llms.txt', 'llms.txt mentions disallow/noindex: it is a help file for AI, not a blocking file.');
}

// ------------------------------------------------------------------ manifest + icons
function manifest(ctx) {
  const { F } = ctx;
  const m = ctx.txt.manifest;
  const home = ctx.home;
  if (m) {
    let j;
    try { j = JSON.parse(m.text); } catch (e) { F.add('error', 'MAN-001', 'site.webmanifest', `Invalid JSON: ${e.message}`); j = null; }
    if (j) {
      for (const k of ['name', 'short_name', 'start_url', 'icons']) if (!j[k]) F.add('warn', 'MAN-002', 'site.webmanifest', `Missing "${k}".`);
      const sizes = new Set();
      let maskable = false;
      for (const ic of j.icons || []) {
        const r = ctx.resolve('site.webmanifest', ic.src);
        const lk = r.kind === 'internal' ? ctx.lookup(r.rel) : { ok: true };
        if (!lk.ok) { F.add('error', 'MAN-003', 'site.webmanifest', `Icon file missing: ${ic.src}`); continue; }
        const info = r.kind === 'internal' ? imageInfo(path.join(ctx.root, lk.rel)) : null;
        const want = (ic.sizes || '').split(' ')[0];
        if (info?.width && want && want !== `${info.width}x${info.height}`) F.add('warn', 'MAN-004', 'site.webmanifest', `Icon ${ic.src} declares ${want} but is ${info.width}x${info.height}.`);
        sizes.add(want);
        if (/maskable/.test(ic.purpose || '')) maskable = true;
      }
      if (!sizes.has('192x192') || !sizes.has('512x512')) F.add('warn', 'MAN-005', 'site.webmanifest', 'Needs 192x192 and 512x512 icons.');
      if (!maskable) F.add('info', 'MAN-006', 'site.webmanifest', 'No icon with "purpose": "maskable".');
      const theme = home?.meta.byName['theme-color']?.[0]?.attrs.content;
      if (theme && j.theme_color && theme.toLowerCase() !== j.theme_color.toLowerCase()) F.add('warn', 'MAN-007', 'site.webmanifest', `theme_color ${j.theme_color} differs from <meta theme-color> ${theme}.`);
      if (home?.lang && j.lang && home.lang !== j.lang) F.add('info', 'MAN-008', 'site.webmanifest', `lang ${j.lang} vs html lang ${home.lang}.`);
    }
  }
  if (ctx.fileSet.has('favicon.ico')) {
    const info = imageInfo(path.join(ctx.root, 'favicon.ico'));
    if (!info) F.add('error', 'ICON-001', 'favicon.ico', 'favicon.ico is not a valid ICO file (a renamed PNG?).');
    else if (info.sizes && !info.sizes.some((s) => ['32x32', '48x48', '16x16'].includes(s))) F.add('warn', 'ICON-001', 'favicon.ico', `ICO contains ${info.sizes.join(', ')}; include 32x32 or 48x48.`);
  }
  if (ctx.fileSet.has('apple-touch-icon.png')) {
    const info = imageInfo(path.join(ctx.root, 'apple-touch-icon.png'));
    if (info && (info.width !== 180 || info.height !== 180)) F.add('warn', 'ICON-002', 'apple-touch-icon.png', `apple-touch-icon is ${info.width}x${info.height}; use 180x180.`);
  }
}

// ------------------------------------------------------------------ one canonical host
function domainConsistency(ctx) {
  const { F } = ctx;
  if (!ctx.domain) { F.add('warn', 'DOM-001', '', 'Cannot determine the canonical domain (no canonical on index.html and no facts.site.domain).'); return; }
  const re = new RegExp(`https?://(www\\.)?${ctx.domain.replace(/\./g, '\\.')}`, 'gi');
  const hosts = new Map();
  const scan = (label, text) => { for (const m of text.matchAll(re)) { const k = m[0].toLowerCase(); (hosts.get(k) || hosts.set(k, new Set()).get(k)).add(label); } };
  for (const p of ctx.pages) scan(p.rel, p.src);
  for (const [name, t] of [['robots.txt', ctx.txt.robots], ['sitemap.xml', ctx.txt.sitemap], ['llms.txt', ctx.txt.llms], ['site.webmanifest', ctx.txt.manifest]]) if (t) scan(name, t.text);
  for (const j of ctx.js) scan(j.rel, j.src);
  const variants = [...hosts.keys()];
  const wanted = `https://${ctx.domain}`;
  const bad = variants.filter((v) => v !== wanted);
  if (bad.length) F.add('error', 'DOM-002', '', `URLs use more than one form of the domain: ${variants.map((v) => `${v} (${[...hosts.get(v)].slice(0, 3).join(', ')})`).join(' | ')}. Pick ${wanted} and use it everywhere.`);
  for (const p of ctx.pages) if (/hostingersite\.com/.test(p.src)) F.add('error', 'DOM-003', p.rel, 'Mentions the hosting preview domain (hostingersite.com). It must never leak into the live site.');
}
