# 07 · Server, .htaccess and deployment (Hostinger / LiteSpeed)

Verified: 2026-10-05, partly by live probes of one Hostinger site (single observation, not a guarantee). Contents: 1 How Hostinger behaves · 2 The template · 3 Headers · 4 Caching · 5 Deploy steps · 6 Verify · 7 500 runbook · 8 Handoff · 9 Previously WordPress

## 1. How Hostinger behaves (read this before debugging)
- Hostinger runs LiteSpeed and reads `.htaccess`. **`<IfModule>` is ignored (contents always run)**, `[L]` acts like `[END]`, rewrite rules inside `<Files>/<FilesMatch>/<Location>` do not work, **unsupported directives fail silently**. Confirmed live: `Header always set`, `ExpiresByType`, `ErrorDocument` (status preserved), `FilesMatch` + `Require all denied`. So never trust a directive: verify with curl/`verify_live.mjs`.
- **HTTPS is forced at the edge (hcdn) before `.htaccess`** (Force HTTPS is on by default once SSL exists; the 301 carries `upgrade-insecure-requests`, no HSTS). Therefore `http://www` → `https://www` → apex = 2 hops and cannot be one while Force HTTPS is on; the template's https rule is only a safety net (conditions `%{HTTPS} !=on` AND `X-Forwarded-Proto` avoid loops). A loop means a second redirect source (Cloudflare "Flexible", leftover WordPress/SSL plugin, hPanel Redirects).
- `AddCharset utf-8` showed no effect (no charset in Content-Type): keep `<meta charset="utf-8">` first in every page; `AddDefaultCharset UTF-8` is in the template (effect unverified).
- Brotli/gzip negotiated, HTTP/3 advertised; no Early Hints (use `<link rel=preload>`). Hostinger CDN may re-compress PNGs (live: og-image 100 KB → 73 KB, same dimensions).
- Dotfiles (`/.htaccess`, `/.env`, `/.git/config`) returned 403; a file named `htaccess` (no dot) is NOT blocked by dot rules (the template denies it).
- After ~60 rapid requests the edge answered a bot-challenge page: `verify_live.mjs` throttles (`VERIFY_DELAY_MS`) and reports `LIVE-002` instead of failing; never bypass it.
- SSL: Let's Encrypt, 90 days, auto-renewed while DNS points to Hostinger; remove CAA records; never change nameservers or add Cloudflare.
- Preview domain `*.hostingersite.com`: Hostinger serves a robots.txt blocking only Googlebot; 301 it to the canonical host and remove it in hPanel.
- `default.php` is recreated when a domain is added and can mask your page: delete it; template sets `DirectoryIndex index.html`.

## 2. The template (assets/templates/htaccess.tpl; scaffold fills domain and CSP)
Order: ErrorDocument 404/403 → DirectoryIndex + no listings → rewrites (index.html → /, trailing slash on .html, /privacy → /privacy.html, preview domain, www → apex, http → https safety net, hidden files) → file denials (dotfiles, php, backups/md/ts/sh, facts json) → MIME types → headers → cache → compression. Every redirect targets the canonical absolute URL with `R=301,L` (one hop for path/host fixes; query strings are kept). Domain = the client's (audit SRV-010 catches a copied foreign domain). Extensionless URLs: keep `.html` canonical and 301 the bare path.

## 3. Headers
HSTS `max-age=31536000` (includeSubDomains only after checking every subdomain; `preload` practically irreversible, needs the header on redirects too) · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` (camera, microphone, geolocation, payment, usb off) · `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'` · optional `Cross-Origin-Opener-Policy: same-origin` · omit `X-XSS-Protection` (or 0) · **no COEP `require-corp`** (breaks Maps/GA) · SRI is not workable for Google tag. CSP: enforced, minimal, no `unsafe-inline` (the pages have no inline code); roll out new policies in Report-Only first only while developing, then keep ONE enforced policy. Validate with DevTools console on home/privacy/404 with consent accepted, declined and map clicked.

## 4. Caching
HTML `no-cache` (revalidate); CSS/JS 30 days with `?v=`; images/fonts 1 year; manifest/vcf 7 days. Hostinger layers are independent (browser, Cache Manager/LiteSpeed, CDN, OPcache): after upload purge Cache Manager and CDN (Performance → CDN → Flush), then `verify_live.mjs --local public`. If the CDN ignores `?v=`, rename files (`style.45.css`) instead.

## 5. Deploy steps
`audit_site.mjs` 0 errors → hPanel File Manager → `public_html` → delete `default.php` → upload the **contents** of `public/` → enable "show hidden files" and confirm `.htaccess` (with dot) is there → SSL active → purge caches → `verify_live.mjs https://DOMAIN --local public --preview-domain X.hostingersite.com` → remove preview domain → Search Console sitemap → GBP NAP check. The generated `docs/ΟΔΗΓΙΕΣ-ΑΝΕΒΑΣΜΑΤΟΣ.md` gives the owner the same steps in Greek.

## 6. Verify (curl cheat sheet)
`curl -sI -L --max-redirs 5 http://DOMAIN/` · `curl -sI https://DOMAIN/ | grep -iE "strict|content-security|x-content|referrer|cache-control"` · `curl -s -o /dev/null -w "%{http_code}" https://DOMAIN/zz-nope` (expect 404) · `curl -sI https://DOMAIN/.htaccess` (expect 403/404). Tools: MDN HTTP Observatory, hstspreload.org, SSL Labs, WebPageTest, Lighthouse (do not promise letter grades).

## 7. 500 runbook
Private window + `curl -sI` to rule out the browser → File Manager: rename `.htaccess` to `.htaccess.off` (site returns, without headers/redirects; do not leave it so) → restore the last good copy (keep one outside the server), re-test → still 500: hPanel Analytics → Access logs (5xx tab; the `.logs/error_log` records only PHP) → permissions (folders 755, files 644) → last resort Backups → restore Files (overwrites, irreversible: download first). Common causes: BOM, smart quotes from a word processor, a stray `<IfModule>` tag, regex with unescaped space, a second redirect source. Edit `.htaccess` only in a code editor, one change at a time.

## 8. Handoff (owner card, in Greek in docs/)
Renewals (domain + hosting auto-renew, reminders 60/30 days), never touch DNS/nameservers, backups (Hostinger weekly/daily covers `public_html` and databases only; keep a master copy of the project outside the host), external uptime monitor on `/` at modest frequency, 500 card, how to change data (`ΑΛΛΑΓΕΣ-ΣΤΟΙΧΕΙΩΝ.md`).

## 9. Domain previously hosted WordPress
Replace the whole `.htaccess` (never append: `# BEGIN WordPress` front-controller and `# BEGIN LSCACHE` blocks misroute); delete `wp-*`, `xmlrpc.php`, `wp-config.php`, `readme.html`, `license.txt`, old sitemaps, `.user.ini`, `advanced-cache.php`; drop the old database; purge all caches; 301 genuinely valuable old URLs, let the rest 404/410; keep MX/SPF/DKIM DNS records.
