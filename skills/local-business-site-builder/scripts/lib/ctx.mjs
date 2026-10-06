// Builds the shared audit context: parses every page/CSS/JS/server file once.
import fs from 'node:fs';
import path from 'node:path';
import { walk, readText, lineIndex, decodeEntities, Findings } from './util.mjs';
import { parseHtml, els, textOf, meta } from './html.mjs';
import { parseCss } from './css.mjs';
import { parseHtaccess, cspHeaders, parseCsp } from './htaccess.mjs';

const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const pathToRel = (p) => {
  let rel = p.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  return rel;
};

export function buildContext(rootArg, opts = {}) {
  const root = path.resolve(rootArg);
  const F = new Findings();
  const allEntries = walk(root);
  const files = allEntries.filter((f) => !f.dir);
  const fileSet = new Set(files.map((f) => f.rel));
  const fileLower = new Map(files.map((f) => [f.rel.toLowerCase(), f.rel]));
  const skipDir = /(^|\/)(node_modules|\.git)(\/|$)/;

  // ---- facts (single source of truth) -------------------------------------
  let facts = null;
  let factsPath = opts.facts || null;
  if (!factsPath) {
    for (const c of [path.join(root, '..', 'site-facts.json'), path.join(process.cwd(), 'site-facts.json')]) {
      if (fs.existsSync(c)) { factsPath = c; break; }
    }
  }
  if (factsPath) {
    try { facts = JSON.parse(readText(factsPath).text); }
    catch (e) { F.add('error', 'FACTS-001', factsPath, `site-facts.json is not valid JSON: ${e.message}`); }
  }

  // ---- text files ----------------------------------------------------------
  const read = (rel) => (fileSet.has(rel) ? readText(path.join(root, rel)) : null);

  // ---- pages ---------------------------------------------------------------
  const pages = [];
  for (const f of files) {
    if (!/\.html?$/i.test(f.rel) || skipDir.test(f.rel)) continue;
    const { text, bom } = readText(path.join(root, f.rel));
    const doc = parseHtml(text);
    const all = [];
    (function collect(n) { for (const c of n.children) { if (c.type === 'el') { all.push(c); collect(c); } } })(doc.root);
    const line = lineIndex(text);
    const canonicalEl = all.find((e) => e.name === 'link' && (e.attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
    const robotsEl = all.find((e) => e.name === 'meta' && (e.attrs.name || '').toLowerCase() === 'robots');
    const ids = new Map();
    for (const e of all) if ('id' in e.attrs) { (ids.get(e.attrs.id) || ids.set(e.attrs.id, []).get(e.attrs.id)).push(e); }
    const htmlEl = all.find((e) => e.name === 'html');
    pages.push({
      rel: f.rel,
      url: f.rel === 'index.html' ? '/' : f.rel.endsWith('/index.html') ? '/' + f.rel.slice(0, -10) : '/' + f.rel,
      src: text, bom, doc, all, line, ids,
      lang: htmlEl?.attrs.lang,
      canonical: canonicalEl?.attrs.href || null,
      robotsMeta: robotsEl?.attrs.content || null,
      noindex: /noindex/i.test(robotsEl?.attrs.content || ''),
      title: (all.find((e) => e.name === 'title')?.raw || '').trim(),
      meta: meta(doc.root),
      text: textOf(doc.root),
      q: (name) => all.filter((e) => e.name === name),
    });
  }
  const pageByRel = new Map(pages.map((p) => [p.rel, p]));

  // ---- css / js ------------------------------------------------------------
  const css = files.filter((f) => /\.css$/i.test(f.rel) && !skipDir.test(f.rel)).map((f) => {
    const { text, bom } = readText(path.join(root, f.rel));
    return { rel: f.rel, src: text, bom, size: f.size, parsed: parseCss(text), line: lineIndex(text) };
  });
  const js = files.filter((f) => /\.(m?js)$/i.test(f.rel) && !skipDir.test(f.rel)).map((f) => {
    const { text, bom } = readText(path.join(root, f.rel));
    return { rel: f.rel, src: text, bom, size: f.size, line: lineIndex(text) };
  });

  // ---- server config -------------------------------------------------------
  let htaccess = null;
  const htRel = ['.htaccess', 'htaccess', 'htaccess.txt'].find((n) => fileSet.has(n));
  if (htRel) {
    const { text, bom } = readText(path.join(root, htRel));
    const parsed = parseHtaccess(text);
    const headers = cspHeaders(parsed);
    const enforcing = headers.find((h) => !h.reportOnly) || null;
    const reportOnly = headers.find((h) => h.reportOnly) || null;
    htaccess = { rel: htRel, text, bom, parsed, headers, enforcing, reportOnly, csp: parseCsp((enforcing || reportOnly)?.value || ''), hasCsp: !!(enforcing || reportOnly) };
  }

  // ---- misc text files -----------------------------------------------------
  const txt = {
    robots: read('robots.txt'),
    sitemap: read('sitemap.xml'),
    llms: read('llms.txt'),
    manifest: read('site.webmanifest') || read('manifest.json'),
  };
  const vcf = files.filter((f) => /\.vcf$/i.test(f.rel)).map((f) => ({ rel: f.rel, ...readText(path.join(root, f.rel)) }));

  // ---- domain --------------------------------------------------------------
  let domain = (facts?.site?.domain || opts.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const home = pageByRel.get('index.html');
  if (!domain && home?.canonical) { try { domain = new URL(home.canonical).hostname.toLowerCase().replace(/^www\./, ''); } catch { /* ignore */ } }

  const ctx = {
    root, F, args: opts, files, fileSet, fileLower, allEntries, facts, factsPath, domain,
    country: (opts.country || facts?.business?.address?.country || (home?.lang === 'el' ? 'GR' : '')).toUpperCase(),
    pages, pageByRel, home, css, js, htaccess, txt, vcf,
    read, skipDir,
    jsText: js.map((j) => j.src).join('\n'),
    cssText: css.map((c) => c.src).join('\n'),
  };

  // ---- reference resolution ------------------------------------------------
  ctx.resolve = function resolve(fromRel, ref) {
    const r = (ref || '').trim();
    if (!r) return { kind: 'empty' };
    if (/^(data|mailto|tel|javascript|sms|whatsapp|viber|blob|geo):/i.test(r)) return { kind: 'scheme', scheme: r.split(':')[0].toLowerCase() };
    if (r.startsWith('#')) return { kind: 'internal', rel: fromRel, hash: r.slice(1), query: '', sameDoc: true };
    if (/^(https?:)?\/\//i.test(r)) {
      let url;
      try { url = new URL(r.startsWith('//') ? 'https:' + r : r); } catch { return { kind: 'bad' }; }
      const host = url.hostname.toLowerCase();
      if (domain && (host === domain || host === 'www.' + domain)) {
        return { kind: 'internal', abs: true, host, scheme: url.protocol, rel: pathToRel(safeDecode(url.pathname)), hash: url.hash.slice(1), query: url.search.slice(1), url };
      }
      return { kind: 'external', url };
    }
    const m = r.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    const p = m[1];
    const query = (m[2] || '').slice(1);
    const hash = (m[3] || '').slice(1);
    const abs = path.posix.normalize(p.startsWith('/') ? p : path.posix.join('/' + path.posix.dirname(fromRel), p));
    return { kind: 'internal', rel: pathToRel(safeDecode(abs)), hash, query, rootRelative: p.startsWith('/') };
  };

  /** Look a resolved rel path up in the deploy folder (case-sensitive like a Linux host). */
  ctx.lookup = function lookup(rel) {
    if (fileSet.has(rel)) return { ok: true, rel };
    const ci = fileLower.get(rel.toLowerCase());
    if (ci) return { ok: false, caseOnly: ci };
    if (fileSet.has(rel + '.html')) return { ok: true, rel: rel + '.html', extensionless: true };
    if (fileSet.has(rel.replace(/\/?$/, '/') + 'index.html')) return { ok: true, rel: rel.replace(/\/?$/, '/') + 'index.html', dir: true };
    return { ok: false };
  };

  ctx.pageUrl = (rel) => (rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length) : '/' + rel);
  ctx.csp = htaccess?.hasCsp ? htaccess.csp : null;
  ctx.cspList = (dir) => (ctx.csp ? ctx.csp.get(dir) ?? ctx.csp.get('default-src') ?? null : null);
  ctx.cspAllowsInline = (dir) => { const l = ctx.cspList(dir); return !l || l.includes("'unsafe-inline'"); };
  return ctx;
}

export { decodeEntities, els };
