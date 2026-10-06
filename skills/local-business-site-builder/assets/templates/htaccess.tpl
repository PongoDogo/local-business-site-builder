# =====================================================================
# .htaccess — {{LEGAL_NAME}}  ({{DOMAIN}})   Apache / LiteSpeed (Hostinger)
# ---------------------------------------------------------------------
# WARNING: one mistake here returns "500 Internal Server Error" for the WHOLE site.
# ΓΡΗΓΟΡΗ ΕΠΑΝΑΦΟΡΑ: στον File Manager μετονόμασε το αρχείο σε  .htaccess.off
# (το site δουλεύει αμέσως χωρίς τις ρυθμίσεις ασφαλείας) και μετά διόρθωσε.
# Blocks are wrapped in <IfModule> for Apache portability. NOTE: LiteSpeed (Hostinger) IGNORES <IfModule> and always runs the
# contents, and it silently ignores directives it does not support. So ALWAYS verify headers/redirects live (scripts/verify_live.mjs).
# The file must be named exactly ".htaccess" (with the leading dot) ON THE SERVER.
# =====================================================================


# ---------- 1) Home page, 404 page, no folder listings ----------
# index.html first, so Hostinger's default.php placeholder never shows.
ErrorDocument 404 /404.html
ErrorDocument 403 /404.html
<IfModule mod_dir.c>
  DirectoryIndex index.html
</IfModule>
<IfModule mod_autoindex.c>
  Options -Indexes
</IfModule>


# ---------- 2) ONE canonical address: https://{{DOMAIN}} ----------
# Every "wrong" address goes to the right one with ONE permanent (301) redirect, no chains.
# Rules apply to the main domain (with/without www) and Hostinger's temporary domain only,
# so local testing is unaffected. On Hostinger "Force HTTPS" is ON by default at the edge (hcdn) and runs BEFORE this file:
# rule (f) is only a safety net and http://www takes 2 hops (expected, harmless). The query string (?gclid=..., ?utm_...) is kept automatically.
<IfModule mod_rewrite.c>
  RewriteEngine On

  # a) /index.html -> /   (THE_REQUEST = what the visitor asked for, so the internal "/ -> index.html" cannot loop)
  RewriteCond %{HTTP_HOST} ^((www\.)?{{DOMAIN_RE}}{{#if HOSTINGER}}|[a-z0-9-]+\.hostingersite\.com{{/if}})(:[0-9]+)?$ [NC]
  RewriteCond %{THE_REQUEST} ^[A-Z]+\s/+index\.html/*[\s?] [NC]
  RewriteRule ^index\.html/*$ https://{{DOMAIN}}/ [R=301,L,NC]

  # b) /page.html/ (trailing slash) -> /page.html
  RewriteCond %{HTTP_HOST} ^((www\.)?{{DOMAIN_RE}}{{#if HOSTINGER}}|[a-z0-9-]+\.hostingersite\.com{{/if}})(:[0-9]+)?$ [NC]
  RewriteCond %{REQUEST_URI} ^/(.+\.html)/+$ [NC]
  RewriteRule ^ https://{{DOMAIN}}/%1 [R=301,L]

  # c) /privacy or /privacy/ (no .html) -> /privacy.html
  RewriteCond %{HTTP_HOST} ^((www\.)?{{DOMAIN_RE}}{{#if HOSTINGER}}|[a-z0-9-]+\.hostingersite\.com{{/if}})(:[0-9]+)?$ [NC]
  RewriteRule ^privacy/?$ https://{{DOMAIN}}/privacy.html [R=301,L,NC]
{{#if HOSTINGER}}
  # d) Hostinger's temporary domain (...hostingersite.com) -> main domain, so Google never sees a "second site".
  #    (Its robots.txt is served by Hostinger and cannot be changed here; the full fix is
  #    hPanel -> Websites -> Website Details -> "Remove preview domain" once the real domain works.)
  RewriteCond %{HTTP_HOST} \.hostingersite\.com(:[0-9]+)?$ [NC]
  RewriteRule ^ https://{{DOMAIN}}%{REQUEST_URI} [L,R=301]
{{/if}}
  # e) www -> non-www (and straight to https) in one step
  RewriteCond %{HTTP_HOST} ^www\.{{DOMAIN_RE}}$ [NC]
  RewriteRule ^ https://{{DOMAIN}}%{REQUEST_URI} [L,R=301]

  # f) http -> https (also checks X-Forwarded-Proto so it never loops behind a CDN/proxy)
  RewriteCond %{HTTP_HOST} ^{{DOMAIN_RE}}$ [NC]
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https [NC]
  RewriteRule ^ https://{{DOMAIN}}%{REQUEST_URI} [L,R=301]

  # g) hidden folders/files (.git, .env) -> forbidden. Exception: .well-known (SSL certificates)
  RewriteCond %{REQUEST_URI} !^/\.well-known/
  RewriteRule (^|/)\. - [F,L]
</IfModule>


# ---------- 3) File denials ----------
<IfModule mod_authz_core.c>
  # nothing that starts with a dot (.htaccess, .user.ini, ...) and the un-dotted config copy
  <FilesMatch "^(\.|htaccess$)">
    Require all denied
  </FilesMatch>
  # the site has no PHP: no PHP file is ever executed (not even Hostinger's default.php)
  <FilesMatch "\.(php[0-9]?|phtml|phar|inc)$">
    Require all denied
  </FilesMatch>
  # files that must never be downloaded (also keep docs/facts OUTSIDE the uploaded folder)
  <FilesMatch "\.(bak|old|orig|save|swp|log|sql|zip|tar|gz|env|ini|conf|off|md|ts|sh|ps1)$">
    Require all denied
  </FilesMatch>
  <FilesMatch "^(package(-lock)?|site-facts)\.json$">
    Require all denied
  </FilesMatch>
</IfModule>


# ---------- 4) File types ----------
<IfModule mod_mime.c>
  # JavaScript: the right type per RFC 9239 (application/javascript and x-javascript are obsolete)
  AddType text/javascript .js .mjs
  AddType font/woff2 .woff2
  AddType image/svg+xml .svg
  AddType image/webp .webp
  AddType image/avif .avif
  AddType application/manifest+json .webmanifest
  AddType text/vcard .vcf
  AddCharset utf-8 .html .css .js .svg .xml .txt .webmanifest .vcf
  AddDefaultCharset UTF-8
  # (LiteSpeed may ignore both charset lines: keep <meta charset="utf-8"> as the first tag of every page)
</IfModule>


# ---------- 5) Security headers ----------
<IfModule mod_headers.c>
  # HTTPS only for 1 year (NO preload: it is practically irreversible). includeSubDomains is OFF by default:
  # add it only after checking that no subdomain (mail., cpanel., staging.) is http-only.
  Header always set Strict-Transport-Security "{{HSTS}}"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  Header always set X-Frame-Options "SAMEORIGIN"

  # CSP (Content Security Policy): ENFORCED, minimum access. It allows ONLY what the pages use today:
  # {{CSP_EXPLAIN}}
  # There is no inline script/style in the HTML, so there is no 'unsafe-inline'.
  # WHEN YOU ADD a third party (Google Ads, Meta, a form service, YouTube): add its domains HERE,
  # IN THE SAME UPLOAD as the feature (see docs/TRACKING-SETUP.md). Keep ONE enforced policy, never a second Report-Only one.
  Header always set Content-Security-Policy "{{CSP}}"

  # pages that must not appear in Google
  <Files "404.html">
    Header set X-Robots-Tag "noindex"
  </Files>

  # HTML: "no-cache" = the browser asks every time whether it changed (304 if not). Changes show immediately.
  # NOT max-age: an old page would stay in browsers and "Purge all" does not reach them.
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>


# ---------- 6) Browser cache ----------
# Images/fonts: 1 year. CSS/JS: 30 days -> when you change them, bump the ?v= in the HTML (scripts/bump_version.mjs).
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType text/javascript "access plus 30 days"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresByType image/vnd.microsoft.icon "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType application/manifest+json "access plus 7 days"
  ExpiresByType text/vcard "access plus 7 days"
</IfModule>


# ---------- 7) Compression (LiteSpeed also compresses by itself; this is for safety) ----------
<IfModule mod_deflate.c>
  <IfModule mod_filter.c>
    AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript text/javascript application/json application/xml image/svg+xml application/manifest+json
  </IfModule>
</IfModule>
