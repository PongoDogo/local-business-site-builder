# Mistake registry (from the Τσαβάρης project) → rule → audit check

| # | What went wrong | Rule | Caught by |
|---|---|---|---|
| 1 | `robots.txt` left on `Disallow: /` (staging) | robots = `Allow: /` + `Sitemap:` line before go-live | SEO-001/003, LIVE-052 |
| 2 | JSON-LD `sameAs` pointed to an empty WordPress shell | `sameAs` only real, populated, owned profiles | LD-018/019 |
| 3 | Full CSP only in Report-Only, a minimal one enforced | one enforced CSP, designed from the page inventory | CSP-011/012/020, LIVE-023/025 |
| 4 | FAQPage markup recommended | optional; FAQ rich results retired 2026-05-07 | LD-020 (info) |
| 5 | `priceRange` contradicted the headline price | prices only from facts; JSON-LD prices must be visible | LD-021/022, NAP-042 |
| 6 | "Write a review" opened the listing (`cid`) | use `search.google.com/local/writereview?placeid=` | REV-010 |
| 7 | `/privacy` returned 404 | link to `.html`, add rewrite for the bare path | LINK-001/003, LIVE-013 |
| 8 | No `Sitemap:` in robots | see 1 | SEO-003 |
| 9 | Render-blocking 73 KB CSS, latin font not preloaded | preload both woff2 with `crossorigin`; remove dead CSS | FONT-003, CSS-004, PERF-003 |
| 10 | Banner linked `#cookies` that did not exist | link/anchor integrity incl. links built in JS | LINK-005 |
| 11 | HTML cache vs CDN confusion | HTML `no-cache`; assets long cache + `?v=` | SRV-031, CACHE-001/002, LIVE-027 |
| 12 | Empty verification metas | delete until a real token exists | HTML-007 |
| 13 | JS served as `application/x-javascript` | `AddType text/javascript .js` | SRV-032, LIVE-062 |
| 14 | `http://www` → https → apex (2 hops), loops with Force-HTTPS + rules | one-hop rules, `X-Forwarded-Proto` check, don't double up | SRV-011, LIVE-010..012 |
| 15 | 500 on the whole site from `.htaccess` | wrap in `<IfModule>`, keep `.htaccess.off` rollback | SRV-003/004 |
| 16 | Preview domain (`*.hostingersite.com`) duplicated the site | redirect rule + remove preview domain | SRV-014, LIVE-080 |
| 17 | GTM→gtag migration left stale comments; form removed left dead CSS vars/classes | grep old identifiers; remove dead CSS | CSS-003/004 |
| 18 | `.DS_Store` / handoff `.md` / `htaccess` (no dot) in the upload folder | docs outside deploy folder; file named `.htaccess` | FILE-001/002, SRV-002, LIVE-070 |
| 19 | Handoff doc referenced but missing (`TRACKING-SETUP.md`) | scaffold generates `docs/` | (manual) |
| 20 | Hero graphic overlapped the title at some phone widths (5 per-width patches) | no decoration tied to text line count; probe every width | `overflow_probe.js` |
| 21 | Generic "AI look" | DESIGN.md §7 blacklist; real photos; one named direction | COPY-001/002/005 |
| 22 | Phone/price/hours inconsistent between pages and files | `site-facts.json` + `derive` | NAP-xxx, REV-xxx |
| 23 | Link differs by letter case from the file (works on Windows, 404 on Linux) | exact-case paths | LINK-002 |
| 24 | Static "open now" badge on non-24/7 business | only claim 24/7 if facts say so | NAP-050 |

Always re-check live facts you rely on (Google/GA4 policies change): e.g. GA4 CSP domains at developers.google.com/tag-platform/security/guides/csp.
