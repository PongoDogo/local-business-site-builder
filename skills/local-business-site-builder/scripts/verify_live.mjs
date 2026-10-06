#!/usr/bin/env node
// verify_live.mjs — post-deploy check of the LIVE site (read-only GET/HEAD requests, nothing is changed).
//
//   deno run -A scripts/verify_live.mjs https://example.gr [--local ./public] [--preview-domain abc123.hostingersite.com] [--json] [--no-color]
//   node scripts/verify_live.mjs https://example.gr ...
//
// Verifies: one-hop redirects (http/www/index.html/extensionless), security + cache headers, real 404 status,
// robots/sitemap/manifest, MIME types, private files NOT exposed, preview-domain redirect, and (with --local)
// that every local file is really live with identical bytes (catches forgotten uploads / stale cache).
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Findings, printFindings, toPosix } from './lib/util.mjs';
import { imageInfoFromBuffer } from './lib/media.mjs';

const argv = process.argv.slice(2);
const opt = { url: null, local: null, preview: null, json: false, color: !!process.stdout.isTTY && !process.env.NO_COLOR };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--local') opt.local = argv[++i];
  else if (a === '--preview-domain') opt.preview = argv[++i];
  else if (a === '--json') opt.json = true;
  else if (a === '--no-color') opt.color = false;
  else if (!a.startsWith('--') && !opt.url) opt.url = a;
}
if (!opt.url) { console.error('Usage: verify_live.mjs https://example.gr [--local ./public] [--preview-domain x.hostingersite.com] [--json] [--no-color]'); process.exit(2); }
if (!/^https?:\/\//.test(opt.url)) opt.url = 'https://' + opt.url;
const base = new URL(opt.url);
const domain = base.hostname.replace(/^www\./, '');
const apex = `https://${domain}`;
const F = new Findings();
const UA = 'Mozilla/5.0 (compatible; site-verify/1.0)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requestCount = 0;
class EdgeChallenge extends Error {}
async function req(url, { method = 'GET', follow = false } = {}) {
  await sleep(+process.env.VERIFY_DELAY_MS || 300);   // be polite: Hostinger's edge answers bursts (~60 quick requests) with a bot challenge
  requestCount++;
  const t0 = Date.now();
  const res = await fetch(url, { method, redirect: follow ? 'follow' : 'manual', headers: { 'user-agent': UA, 'cache-control': 'no-cache', 'accept-encoding': 'gzip, br' } });
  const ms = Date.now() - t0;
  if ([403, 429, 503].includes(res.status) && /text\/html/i.test(res.headers.get('content-type') || '')) {
    const peek = await res.clone().text().catch(() => '');
    if (/checking your browser|just a moment|attention required|captcha|bot protection/i.test(peek)) throw new EdgeChallenge(`HTTP ${res.status} challenge page after ${requestCount} requests`);
  }
  return { res, ms, status: res.status, headers: res.headers, loc: res.headers.get('location') };
}
async function body(r) { return Buffer.from(await r.res.arrayBuffer()); }
async function drop(r) { try { await r.res.body?.cancel(); } catch { /* ignore */ } }

async function chain(url, max = 8) {
  const hops = [];
  let cur = url;
  for (let i = 0; i < max; i++) {
    let r;
    try { r = await req(cur); } catch (e) { hops.push({ url: cur, error: e.message }); return hops; }
    hops.push({ url: cur, status: r.status, location: r.loc });
    if (r.status >= 300 && r.status < 400 && r.loc) {
      await drop(r);
      cur = new URL(r.loc, cur).toString();
      if (hops.some((h) => h.url === cur)) { hops.push({ url: cur, loop: true }); return hops; }
    } else { await drop(r); return hops; }
  }
  return hops;
}
const fmt = (hops) => hops.map((h) => (h.error ? `ERR(${h.error})` : h.loop ? 'LOOP' : `${h.status} ${h.url}`)).join(' -> ');

async function expectRedirect(from, to, id, label, { allowSame = false } = {}) {
  const hops = await chain(from);
  if (hops[0].error) { F.add('error', 'LIVE-001', from, `Cannot connect: ${hops[0].error}`); return; }
  const last = hops[hops.length - 1];
  const redirects = hops.filter((h) => h.status >= 300 && h.status < 400);
  if (hops.some((h) => h.loop)) { F.add('error', id, from, `${label}: redirect LOOP (${fmt(hops)}). Typical cause: "Force HTTPS" in hPanel + the .htaccess rule, or Cloudflare "Flexible" SSL.`, 'Disable one of the two https redirects.'); return; }
  const finalUrl = hops.length ? new URL(last.location || last.url, last.url).toString() : '';
  if (to === null) { // expect no redirect at all
    if (redirects.length) F.add('error', id, from, `${label}: unexpected redirect (${fmt(hops)}).`);
    return;
  }
  if (!redirects.length) { if (!allowSame) F.add('error', id, from, `${label}: no redirect happened (${fmt(hops)}); expected -> ${to}`); return; }
  const landed = redirects.length ? new URL(redirects[redirects.length - 1].location, redirects[redirects.length - 1].url).toString() : '';
  if (landed !== to) F.add('error', id, from, `${label}: lands on ${landed}, expected ${to} (${fmt(hops)}).`);
  if (redirects.length > 1) F.add('warn', id + 'b', from, `${label}: ${redirects.length}-hop redirect chain (${fmt(hops)}). On Hostinger the edge (hcdn) forces https BEFORE .htaccess runs, so http://www -> https://www -> apex (2 hops) is expected while Force HTTPS is on. Harmless.`);
  const first = redirects[0];
  if (first.status !== 301 && first.status !== 308) F.add('warn', id + 'c', from, `${label}: status ${first.status} is temporary; use 301 so Google consolidates the URLs.`);
  if (last.status !== 200) F.add('error', id + 'd', from, `${label}: chain ends with status ${last.status} (${fmt(hops)}).`);
}

async function main() {
  // ---- 0) reachability
  try { const r = await req(apex + '/', { follow: true }); await drop(r); }
  catch (e) { F.add('error', 'LIVE-001', apex, `Cannot reach ${apex}/ : ${e.message}. (DNS not pointing yet? SSL not issued?)`); return; }

  // ---- 1) redirect matrix
  await expectRedirect(`http://${domain}/`, `${apex}/`, 'LIVE-010', 'http -> https');
  await expectRedirect(`http://www.${domain}/`, `${apex}/`, 'LIVE-011', 'http://www -> https apex');
  await expectRedirect(`https://www.${domain}/`, `${apex}/`, 'LIVE-012', 'https://www -> apex');
  await expectRedirect(`${apex}/index.html`, `${apex}/`, 'LIVE-013', '/index.html -> /');
  await expectRedirect(`${apex}/`, null, 'LIVE-014', 'canonical home must not redirect');

  // ---- 2) home page
  const home = await req(apex + '/', { follow: true });
  const html = (await body(home)).toString('utf8');
  const H = (k) => home.headers.get(k);
  if (home.status !== 200) F.add('error', 'LIVE-020', apex, `Home returns ${home.status}.`);
  if (!/text\/html/i.test(H('content-type') || '')) F.add('error', 'LIVE-021', apex, `Content-Type is "${H('content-type')}".`);
  else if (!/utf-8/i.test(H('content-type')) && !/<meta charset=/i.test(html.slice(0, 1200))) F.add('warn', 'LIVE-021', apex, 'No charset in Content-Type header or early <meta charset>.');
  const need = [['strict-transport-security', 'HSTS'], ['x-content-type-options', 'X-Content-Type-Options'], ['referrer-policy', 'Referrer-Policy']];
  for (const [k, n] of need) if (!H(k)) F.add('warn', 'LIVE-022', apex, `Missing response header ${n} (the .htaccess header rules are not active: was the file renamed to .htaccess? is mod_headers on?).`);
  if (H('x-content-type-options') && !/nosniff/i.test(H('x-content-type-options'))) F.add('warn', 'LIVE-022', apex, 'X-Content-Type-Options should be nosniff.');
  const csp = H('content-security-policy');
  if (!csp) F.add(H('content-security-policy-report-only') ? 'error' : 'warn', 'LIVE-023', apex, H('content-security-policy-report-only') ? 'Only a Report-Only CSP is sent: nothing is enforced.' : 'No Content-Security-Policy header.');
  else {
    if (/unsafe-inline|unsafe-eval/.test((csp.match(/script-src[^;]*/) || [''])[0])) F.add('error', 'LIVE-024', apex, `CSP script-src allows unsafe-inline/eval: ${csp.slice(0, 100)}...`);
    if (H('content-security-policy-report-only')) F.add('warn', 'LIVE-025', apex, 'Both an enforcing and a Report-Only CSP are sent (two policies drift apart).');
  }
  if (!H('x-frame-options') && !/frame-ancestors/.test(csp || '')) F.add('warn', 'LIVE-026', apex, 'No clickjacking protection header.');
  const cc = H('cache-control') || '';
  if (!/no-cache|no-store|max-age=0|must-revalidate/.test(cc)) F.add('warn', 'LIVE-027', apex, `HTML Cache-Control is "${cc || 'absent'}": after an update visitors may keep seeing the old page (shared hosting + CDN purge does not reach their browsers).`);
  if (!/gzip|br|zstd/.test(H('content-encoding') || '')) F.add('warn', 'LIVE-028', apex, 'HTML is not compressed (no Content-Encoding).');
  if (/noindex/i.test(H('x-robots-tag') || '')) F.add('error', 'LIVE-029', apex, `X-Robots-Tag: ${H('x-robots-tag')} on the home page: Google will drop the site.`);
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) F.add('error', 'LIVE-029', apex, 'Home page HTML has a noindex robots meta.');
  const canon = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  if (!canon) F.add('error', 'LIVE-030', apex, 'No canonical link on the live home page.');
  else if (canon !== apex + '/') F.add('error', 'LIVE-030', apex, `Canonical is ${canon}, expected ${apex}/`);
  if (home.ms > 1500) F.add('warn', 'LIVE-031', apex, `Home took ${home.ms} ms (cold start?). Re-run to confirm; > 1.5 s repeatedly means hosting/cache problems.`);
  F.add('info', 'LIVE-032', apex, `Home: ${home.status}, ${home.ms} ms, ${Buffer.byteLength(html)} bytes, server: ${H('server') || '?'}`);

  // ---- 3) a missing URL must be a real 404 with the custom page
  const miss = await req(`${apex}/zz-not-here-${Date.now().toString(36)}`, { follow: false });
  const missBody = (await body(miss)).toString('utf8');
  if (miss.status === 200) F.add('error', 'LIVE-040', apex, 'Unknown URLs return 200 (soft 404): Google indexes junk pages. ErrorDocument is not working or a catch-all rewrite exists.');
  else if (miss.status !== 404) F.add('error', 'LIVE-040', apex, `Unknown URL returned ${miss.status} (expected 404).`);
  else if (!/noindex/i.test(missBody) && !/noindex/i.test(miss.headers.get('x-robots-tag') || '')) F.add('warn', 'LIVE-041', apex, 'The 404 page is not marked noindex.');
  if (miss.status === 404 && /<title>\s*404 Not Found|Not Found<\/title>|LiteSpeed|nginx/i.test(missBody) && missBody.length < 2000) F.add('warn', 'LIVE-042', apex, 'The 404 body looks like the server default, not your custom 404.html (ErrorDocument path wrong?).');

  // ---- 4) static endpoints
  const robots = await req(apex + '/robots.txt', { follow: true });
  const robotsTxt = (await body(robots)).toString('utf8');
  if (robots.status !== 200) F.add('error', 'LIVE-050', apex, `/robots.txt returns ${robots.status}.`);
  else {
    if (!/text\/plain/i.test(robots.headers.get('content-type') || '')) F.add('warn', 'LIVE-051', apex, `/robots.txt Content-Type is ${robots.headers.get('content-type')}.`);
    if (/^\s*Disallow:\s*\/\s*$/m.test(robotsTxt) && /User-agent:\s*\*/i.test(robotsTxt)) F.add('error', 'LIVE-052', apex, 'LIVE robots.txt blocks everything (Disallow: /). If this is the hosting preview domain\'s robots, make sure the real domain serves YOUR file.');
    if (!/^Sitemap:\s*https:\/\//im.test(robotsTxt)) F.add('error', 'LIVE-053', apex, 'LIVE robots.txt has no Sitemap line.');
  }
  const sm = await req(apex + '/sitemap.xml', { follow: true });
  const smTxt = (await body(sm)).toString('utf8');
  if (sm.status !== 200) F.add('error', 'LIVE-054', apex, `/sitemap.xml returns ${sm.status}.`);
  else {
    if (!/xml/i.test(sm.headers.get('content-type') || '')) F.add('warn', 'LIVE-055', apex, `/sitemap.xml Content-Type is ${sm.headers.get('content-type')}.`);
    for (const m of smTxt.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
      const r = await req(m[1], { follow: false });
      await drop(r);
      if (r.status !== 200) F.add('error', 'LIVE-056', m[1], `Sitemap URL returns ${r.status} (must be 200 with no redirect).`);
    }
  }
  for (const [p, id, lvl] of [['/llms.txt', 'LIVE-057', 'info'], ['/site.webmanifest', 'LIVE-058', 'warn'], ['/favicon.ico', 'LIVE-059', 'warn'], ['/apple-touch-icon.png', 'LIVE-059', 'warn']]) {
    const r = await req(apex + p, { follow: true });
    await drop(r);
    if (r.status !== 200) F.add(lvl, id, apex + p, `${p} returns ${r.status}.`);
  }
  const wm = await req(apex + '/site.webmanifest', { follow: true });
  await drop(wm);
  if (wm.status === 200 && !/json/i.test(wm.headers.get('content-type') || '')) F.add('warn', 'LIVE-060', apex, `site.webmanifest Content-Type is ${wm.headers.get('content-type')} (expected application/manifest+json).`);

  // assets referenced from the home page
  const assets = new Set();
  for (const m of html.matchAll(/(?:href|src)=["']([^"']+\.(?:css|js|woff2|webp|png|jpe?g|svg|avif))(?:\?[^"']*)?["']/gi)) assets.add(new URL(m[1], apex + '/').toString());
  const mime = { css: /text\/css/, js: /(text|application)\/javascript/, woff2: /font\/woff2/, webp: /image\/webp/, png: /image\/png/, svg: /image\/svg\+xml/, jpg: /image\/jpeg/, jpeg: /image\/jpeg/, avif: /image\/avif/ };
  let checked = 0;
  for (const u of assets) {
    if (checked++ > 14 || new URL(u).hostname.replace(/^www\./, '') !== domain) continue;
    const ext = u.split('?')[0].split('.').pop().toLowerCase();
    const r = await req(u + (/\?/.test(u) ? '' : ''), { follow: false });
    await drop(r);
    if (r.status !== 200) { F.add('error', 'LIVE-061', u, `Asset returns ${r.status} (forgotten upload or wrong path/case).`); continue; }
    const ct = r.headers.get('content-type') || '';
    if (mime[ext] && !mime[ext].test(ct)) F.add(ext === 'js' ? 'warn' : 'info', 'LIVE-062', u, `Content-Type "${ct}" for .${ext}.${ext === 'js' ? ' Prefer text/javascript (RFC 9239); AddType in .htaccess.' : ''}`);
    if (/x-javascript/.test(ct)) F.add('warn', 'LIVE-062', u, 'Obsolete JS MIME type application/x-javascript.');
    const rc = r.headers.get('cache-control') || '';
    const exp = r.headers.get('expires');
    if (!/max-age=\d{5,}/.test(rc) && !exp && ['woff2', 'webp', 'png', 'svg', 'jpg', 'jpeg', 'avif', 'css', 'js'].includes(ext)) F.add('info', 'LIVE-063', u, `No long-term caching headers (Cache-Control: "${rc}", Expires: ${exp || 'none'}).`);
  }

  // ---- 5) files that must not be reachable
  const secret = ['/.htaccess', '/htaccess', '/.htaccess.off', '/.git/config', '/.env', '/assets/.DS_Store', '/wp-login.php', '/index.php', '/TRACKING-SETUP.md', '/DESIGN.md', '/site-facts.json'];
  for (const p of secret) {
    const r = await req(apex + p, { follow: false });
    const b = r.status === 200 ? (await body(r)).toString('utf8').slice(0, 300) : (await drop(r), '');
    if (r.status === 200) F.add('error', 'LIVE-070', apex + p, `${p} is publicly readable (HTTP 200). ${/RewriteEngine|Header |ErrorDocument/.test(b) ? 'It exposes your server configuration.' : ''}`, 'Delete it from the server or block it in .htaccess.');
  }

  // ---- 6) hosting preview domain must not stay a second copy of the site
  if (opt.preview) {
    await expectRedirect(`https://${opt.preview}/`, `${apex}/`, 'LIVE-080', `preview domain ${opt.preview} -> canonical`);
  } else {
    F.add('info', 'LIVE-081', '', 'Preview-domain check skipped. On Hostinger pass --preview-domain <name>.hostingersite.com (hPanel -> Website -> Details) and finally remove the preview domain there.');
  }

  // ---- 7) every local file must be live and identical
  if (opt.local) {
    const root = path.resolve(opt.local);
    const list = [];
    (function rec(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) rec(f); else list.push(f); } })(root);
    const vq = new Map();   // rel -> "?v=N" exactly as written in the home page (a CDN may cache by path+query)
    for (const m of html.matchAll(/(?:href|src)=["']\/?([^"'?#]+\.(?:css|m?js))(\?[^"']*)["']/gi)) vq.set(m[1], m[2]);
    let same = 0;
    for (const f of list) {
      const rel = toPosix(path.relative(root, f));
      if (/(^|\/)\./.test(rel) || rel === 'htaccess') continue;
      const url = apex + '/' + rel.split('/').map(encodeURIComponent).join('/') + (vq.get(rel) || '');
      let r;
      try { r = await req(rel === 'index.html' ? apex + '/' : url, { follow: false }); } catch (e) { F.add('error', 'LIVE-090', rel, `Fetch failed: ${e.message}`); continue; }
      if (r.status !== 200) { await drop(r); F.add('error', 'LIVE-090', rel, `Local file is NOT live (HTTP ${r.status}): not uploaded, wrong folder, or blocked.`); continue; }
      const live = await body(r);
      const mine = fs.readFileSync(f);
      if (crypto.createHash('sha256').update(live).digest('hex') !== crypto.createHash('sha256').update(mine).digest('hex')) {
        const li = imageInfoFromBuffer(live), mi = imageInfoFromBuffer(mine);
        if (li && mi && li.width === mi.width && li.height === mi.height) { F.add('info', 'LIVE-093', rel, `Image bytes differ (live ${live.length} B vs local ${mine.length} B) but dimensions match: the host/CDN re-compressed it. Fine.`); same++; continue; }
        F.add('warn', 'LIVE-091', rel, `Live file differs from the local one (live ${live.length} B, local ${mine.length} B): old version still deployed, upload incomplete, or the host rewrites it.`);
      } else same++;
    }
    F.add('info', 'LIVE-092', '', `${same}/${list.filter((f) => !/(^|\/)\./.test(toPosix(path.relative(root, f)))).length} local files are live and byte-identical.`);
  }
}

try { await main(); } catch (e) {
  if (e instanceof EdgeChallenge) F.add('warn', 'LIVE-002', '', `The host's edge protection returned a bot-challenge page (${e.message}). Results after this point are INCOMPLETE. Wait ~10 minutes and re-run (VERIFY_DELAY_MS=800 slows the checks); do not try to bypass it.`);
  else F.add('error', 'LIVE-999', '', `verify_live crashed: ${e.stack?.split('\n').slice(0, 3).join(' | ')}`);
}
const counts = { error: F.count('error'), warn: F.count('warn'), verify: F.count('verify'), info: F.count('info') };
if (opt.json) console.log(JSON.stringify({ url: opt.url, counts, findings: F.items }, null, 2));
else {
  console.log(`\nLIVE CHECK ${apex}`);
  printFindings(F, { color: opt.color });
  console.log(`\n${'='.repeat(60)}\nRESULT: ${counts.error} error(s) · ${counts.warn} warning(s) · ${counts.info} info`);
  console.log(counts.error ? 'Live site has problems: fix the ERRORs (see references/07-server-htaccess-deploy.md), re-deploy, re-run.' : 'Live site passes the blocking checks.');
}
process.exit(counts.error ? 1 : 0);
