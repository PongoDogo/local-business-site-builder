// SRV-xxx / CSP-xxx: .htaccess correctness (a mistake here = 500 on the whole site) and CSP coverage.
import { cspAllows } from '../lib/htaccess.mjs';

const NEEDS_MODULE = /^(Header|RequestHeader|RewriteEngine|RewriteCond|RewriteRule|RewriteBase|RewriteOptions|Expires\w*|AddOutputFilterByType|SetOutputFilter|AddType|AddCharset|AddDefaultCharset|AddEncoding|DirectoryIndex|Options|Require|SetEnvIf|BrowserMatch|ForceType|BrowserMatchNoCase)$/i;
const TLD = /\.(gr|com|eu|net|org|io|co|info|biz|app|dev|online|shop|store|tech|me|cc|tv|xyz|site|uk|de|fr)$/i;

export function run(ctx) {
  const { F } = ctx;
  const ht = ctx.htaccess;
  if (!ht) {
    F.add('warn', 'SRV-001', '', 'No .htaccess in the deploy folder: no HTTPS/www redirects, no custom 404, no security headers, no cache rules (applies to Apache/LiteSpeed hosting such as Hostinger).', 'Run scripts/scaffold.mjs or start from assets/templates/htaccess.');
    return;
  }
  const file = ht.rel;
  if (ht.rel === 'htaccess') F.add('warn', 'SRV-002', file, 'The file is named "htaccess" (no leading dot). The server ignores it until it is renamed to .htaccess on the server.', 'Rename after upload and verify with scripts/verify_live.mjs.');
  for (const i of ht.parsed.issues) F.add('error', 'SRV-003', file, `${i.msg} (a malformed .htaccess returns 500 for the entire site).`, '', i.line);

  const D = ht.parsed.directives;
  const has = (re) => D.some((d) => re.test(d.text));
  for (const d of D) {
    if (NEEDS_MODULE.test(d.name) && !d.ifModules.length) F.add('warn', 'SRV-004', file, `"${d.text.slice(0, 60)}" is not wrapped in <IfModule>: on Apache a missing module then returns 500 for the whole site. (LiteSpeed/Hostinger ignores <IfModule> and always runs the contents, so the wrapper is for portability, not protection.)`, 'Wrap it in <IfModule mod_xxx.c> and always run verify_live.mjs after upload.', d.line);
  }

  // ---- error pages / listing / index
  const ed = D.find((d) => /^ErrorDocument\s+404\b/i.test(d.text));
  if (!ed) F.add('warn', 'SRV-005', file, 'No "ErrorDocument 404 /404.html": visitors get the host\'s ugly default page.');
  else {
    const p = ed.text.split(/\s+/)[2];
    if (!p || !p.startsWith('/')) F.add('error', 'SRV-005', file, `ErrorDocument must use a root-relative path (got "${p}").`, '', ed.line);
    else if (!ctx.fileSet.has(p.slice(1))) F.add('error', 'SRV-005', file, `ErrorDocument points to ${p} which does not exist in the deploy folder.`, '', ed.line);
  }
  if (!has(/^Options\s+.*-Indexes/i)) F.add('warn', 'SRV-006', file, 'Directory listing is not disabled (Options -Indexes).');
  if (!has(/^DirectoryIndex\s+index\.html/i)) F.add('warn', 'SRV-007', file, 'No "DirectoryIndex index.html": on Hostinger the default.php placeholder can show instead of your page.');

  // ---- redirects
  const rules = D.filter((d) => /^Rewrite(Rule|Cond)/i.test(d.name));
  if (!has(/^RewriteEngine\s+On/i) && rules.length) F.add('error', 'SRV-008', file, 'Rewrite rules without "RewriteEngine On".');
  const httpsRule = D.find((d) => /^RewriteRule/i.test(d.name) && /https:\/\//.test(d.text));
  if (!httpsRule) F.add('warn', 'SRV-009', file, 'No http -> https redirect rule.');
  if (ctx.domain && !D.some((d) => /^RewriteCond.*HTTP_HOST.*www/i.test(d.text))) F.add('warn', 'SRV-009', file, 'No www <-> non-www canonicalisation rule: two copies of the site compete in Google.');
  if (httpsRule && !has(/X-Forwarded-Proto/i)) F.add('warn', 'SRV-011', file, 'The https redirect does not check X-Forwarded-Proto: behind a CDN/proxy (Cloudflare, hPanel force-https) this can loop forever.');
  for (const r of D.filter((d) => /^RewriteRule/i.test(d.name))) {
    const flags = (r.text.match(/\[([^\]]+)\]\s*$/) || [])[1] || '';
    if (/\bR(=30[12])?\b/.test(flags) && !/R=301/.test(flags) && /https?:\/\//.test(r.text)) F.add('warn', 'SRV-012', file, `Redirect without R=301 is a temporary (302) redirect: ${r.text.slice(0, 70)}`, 'Use [R=301,L].', r.line);
    const target = (r.text.match(/^RewriteRule\s+\S+\s+(\S+)/i) || [])[1] || '';
    if (/^http:\/\//i.test(target)) F.add('warn', 'SRV-013', file, `Redirect target is http:// (extra hop): ${target}`, '', r.line);
  }
  // domains mentioned in rewrite lines must be this site's (classic: htaccess copied from another client)
  if (ctx.domain) {
    const foreign = new Set();
    for (const r of rules) {
      const plain = r.text.replace(/\\\./g, '.');
      for (const m of plain.matchAll(/\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)\b/gi)) {
        const d = m[1].toLowerCase();
        if (!TLD.test(d) || /^mod_/.test(d) || /\.(html?|php|css|js|png|webp|xml|txt)$/.test(d)) continue;
        const base = d.replace(/^www\./, '');
        if (base !== ctx.domain && !base.endsWith('hostingersite.com') && !/^(\[a-z0-9-\]\+)/.test(d)) foreign.add(d);
      }
    }
    for (const d of foreign) F.add('error', 'SRV-010', file, `.htaccess mentions the domain "${d}" but this site is "${ctx.domain}" (copied from another project?).`);
    const hostingHint = ctx.facts?.site?.hosting === 'hostinger' || /hostinger/i.test(ht.text);
    if (hostingHint && !/hostingersite\.com/.test(ht.text)) F.add('info', 'SRV-014', file, 'No redirect for the Hostinger preview domain (*.hostingersite.com): Google can index a duplicate of the site.', 'Add the rule and also remove the preview domain in hPanel.');
  }

  // ---- headers
  const hdr = (name) => D.find((d) => new RegExp(`^Header\\s+(always\\s+)?(set|add|append|merge)\\s+"?${name}"?\\s`, 'i').test(d.text));
  const hsts = hdr('Strict-Transport-Security');
  if (!hsts) F.add('warn', 'SRV-020', file, 'No Strict-Transport-Security header.');
  else {
    if (/preload/i.test(hsts.text)) F.add('warn', 'SRV-021', file, 'HSTS "preload" is practically irreversible: only add it deliberately.', '', hsts.line);
    if (/includeSubDomains/i.test(hsts.text)) F.add('verify', 'SRV-022', file, 'HSTS includeSubDomains forces https on EVERY subdomain (mail., cpanel., staging.): confirm none is http-only.', '', hsts.line);
  }
  for (const [n, level] of [['X-Content-Type-Options', 'warn'], ['Referrer-Policy', 'warn'], ['Permissions-Policy', 'info']]) if (!hdr(n)) F.add(level, 'SRV-023', file, `Missing ${n} header.`);
  if (!hdr('X-Frame-Options') && !(ht.csp.get('frame-ancestors'))) F.add('warn', 'SRV-024', file, 'No clickjacking protection (X-Frame-Options or CSP frame-ancestors).');
  const robotsHdr = D.find((d) => /^Header\b.*X-Robots-Tag/i.test(d.text));
  if (robotsHdr && !robotsHdr.ctx.some((c) => /404/.test(c))) F.add('error', 'SRV-025', file, `X-Robots-Tag is sent for the whole site (${robotsHdr.text.slice(0, 70)}): it overrides the HTML and de-indexes everything.`, 'Scope it to <Files "404.html"> only.', robotsHdr.line);

  // ---- cache + types
  if (!D.some((d) => /^ExpiresActive\s+On/i.test(d.text))) F.add('warn', 'SRV-030', file, 'No browser caching (mod_expires): repeat visits re-download images/fonts.');
  if (!D.some((d) => /^Header\b.*Cache-Control.*no-cache/i.test(d.text) && d.ctx.some((c) => /html/.test(c)))) F.add('info', 'SRV-031', file, 'HTML is not set to Cache-Control: no-cache: visitors may see an old page after an update.');
  if (/application\/x-javascript/i.test(ht.text)) F.add('warn', 'SRV-032', file, 'JS MIME type application/x-javascript is obsolete; use text/javascript (RFC 9239).');
  if (!D.some((d) => /AddType\s+(text|application)\/javascript/i.test(d.text))) F.add('info', 'SRV-033', file, 'No explicit AddType for .js (host default may be application/javascript or x-javascript).');
  if (!D.some((d) => /FilesMatch/i.test(d.ctx.join(' ')) && /php/.test(d.ctx.join(' ')))) F.add('info', 'SRV-034', file, 'Static site: consider denying php/phtml execution and private extensions (bak, sql, log, env, md).');
  if (!D.some((d) => /^RewriteRule\s+\(\^\|\/\)\\\./i.test(d.text))) F.add('info', 'SRV-035', file, 'Hidden files/folders (.git, .env) are not explicitly blocked.');

  cspChecks(ctx, ht);
}

function cspChecks(ctx, ht) {
  const { F } = ctx;
  const file = ht.rel;
  if (!ht.hasCsp) { F.add('warn', 'CSP-010', file, 'No Content-Security-Policy header.', 'Design the page CSP-clean (no inline code) and enforce a minimal policy from day one.'); return; }
  if (!ht.enforcing) F.add('error', 'CSP-011', file, 'The CSP is Report-Only: nothing is enforced.', 'Enforce it (Content-Security-Policy).', ht.reportOnly.line);
  if (ht.enforcing && ht.reportOnly) F.add('warn', 'CSP-012', file, 'An enforcing CSP AND a Report-Only CSP coexist: two policies drift apart (seen in the original project: a full policy in Report-Only, a minimal one enforced).', 'Keep ONE enforced policy that matches the page.', ht.reportOnly.line);
  const csp = ht.csp;
  const sc = csp.get('script-src') || csp.get('default-src') || [];
  if (sc.includes("'unsafe-inline'")) F.add('error', 'CSP-013', file, "script-src contains 'unsafe-inline' (defeats the point of CSP).");
  if (sc.includes("'unsafe-eval'")) F.add('error', 'CSP-013', file, "script-src contains 'unsafe-eval'.");
  if (sc.includes('*') || sc.includes('http:')) F.add('error', 'CSP-013', file, 'script-src allows any/http host.');
  if ((csp.get('style-src') || csp.get('default-src') || []).includes("'unsafe-inline'")) F.add('warn', 'CSP-014', file, "style-src contains 'unsafe-inline'.");
  if (!csp.has('default-src')) F.add('warn', 'CSP-015', file, 'No default-src.');
  if (!(csp.get('object-src') || []).includes("'none'")) F.add('warn', 'CSP-016', file, "object-src is not 'none'.");
  for (const k of ['base-uri', 'form-action', 'frame-ancestors']) if (!csp.has(k)) F.add('info', 'CSP-017', file, `No ${k} directive.`);

  // coverage: what the site actually loads vs what the CSP allows
  const need = [];
  const push = (dir, url, why) => need.push({ dir, url, why });
  const abs = (u) => (/^\/\//.test(u) ? 'https:' + u : u);
  for (const pg of ctx.pages) {
    for (const e of pg.all) {
      const s = e.attrs.src || '';
      if (e.name === 'script' && /^(https?:)?\/\//.test(s)) push('script-src', abs(s), `${pg.rel} <script>`);
      if (e.name === 'link' && /stylesheet/.test(e.attrs.rel || '') && /^(https?:)?\/\//.test(e.attrs.href || '')) push('style-src', abs(e.attrs.href), `${pg.rel} stylesheet`);
      if (e.name === 'link' && e.attrs.as === 'font' && /^(https?:)?\/\//.test(e.attrs.href || '')) push('font-src', abs(e.attrs.href), `${pg.rel} font preload`);
      if ((e.name === 'img' || e.name === 'source') && /^(https?:)?\/\//.test(s)) push('img-src', abs(s), `${pg.rel} <${e.name}>`);
      if (e.name === 'iframe' && /^(https?:)?\/\//.test(s)) push('frame-src', abs(s), `${pg.rel} <iframe>`);
      if (e.name === 'form' && /^(https?:)?\/\//.test(e.attrs.action || '')) push('form-action', abs(e.attrs.action), `${pg.rel} <form>`);
      for (const k of ['data-map-src', 'data-src']) if (/google\.com\/maps\/embed/.test(e.attrs[k] || '')) push('frame-src', e.attrs[k].split('?')[0], `${pg.rel} map embed`);
      for (const k of ['src', 'srcset']) if (/^\s*data:/.test(e.attrs[k] || '') && ['img', 'source'].includes(e.name)) push('img-src', 'data:', `${pg.rel} data: image`);
    }
  }
  if (ctx.css.some((c) => /url\(\s*["']?data:/i.test(c.src))) push('img-src', 'data:', 'CSS data: URI (masks/backgrounds)');
  for (const c of ctx.css) for (const m of c.src.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi)) push('img-src', m[1], c.rel);
  const js = ctx.jsText;
  if (/googletagmanager\.com\/gtag\/js/.test(js)) {
    push('script-src', 'https://www.googletagmanager.com/gtag/js', 'gtag loader');
    for (const u of ['https://www.google-analytics.com/g/collect', 'https://region1.google-analytics.com/g/collect', 'https://analytics.google.com/g/collect', 'https://region1.analytics.google.com/g/collect', 'https://www.googletagmanager.com/gtag/js']) push('connect-src', u, 'GA4 beacon');
    for (const u of ['https://www.google-analytics.com/g/collect', 'https://www.googletagmanager.com/a']) push('img-src', u, 'GA4 pixel fallback');
  }
  if (/google\.com\/maps\/embed/.test(js) || /google\.com\/maps\/embed/.test(ctx.pages.map((p) => p.src).join(''))) push('frame-src', 'https://www.google.com/maps/embed', 'map embed');
  if (/youtube(-nocookie)?\.com\/embed/.test(js + ctx.pages.map((p) => p.src).join(''))) push('frame-src', 'https://www.youtube-nocookie.com/embed/x', 'YouTube embed');
  const seen = new Set();
  for (const n of need) {
    const key = n.dir + n.url;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!cspAllows(csp, n.dir, n.url)) F.add('error', 'CSP-020', file, `The CSP would BLOCK ${n.url} (${n.why}): ${n.dir} does not allow it.`, 'Add the host to that directive IN THE SAME DEPLOY as the feature.');
  }
  // least privilege: allowances nothing needs
  for (const dir of ['script-src', 'frame-src', 'connect-src', 'img-src', 'font-src', 'style-src']) {
    for (const t of csp.get(dir) || []) {
      if (!/^(https?:\/\/)?(\*\.)?[a-z0-9.-]+\.[a-z]+/i.test(t)) continue;
      const solo = new Map([[dir, [t]]]);
      const used = need.some((n) => n.dir === dir && cspAllows(solo, dir, n.url));
      if (!used) F.add(/googletagmanager|google-analytics|google\.com|doubleclick|facebook/.test(t) ? 'warn' : 'info', 'CSP-021', file, `${dir} allows ${t} but nothing on the site uses it (least privilege: remove it, or you forgot to wire the feature).`);
    }
  }
}
