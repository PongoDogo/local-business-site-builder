---
name: local-business-site-builder
description: "Builds, audits and deploys a production-grade static website (HTML, CSS, vanilla JS) for a local business in Greece, such as a plumber, electrician, clinic, restaurant or shop, hosted on Hostinger. Use when the user asks for a new website, ιστοσελίδα or landing page for a client, a site rebuild, SEO or schema fixes, a cookie banner or GA4 consent setup, .htaccess, redirect, robots or sitemap problems, a 500 error after upload, or a pre-launch or live-site audit of an existing site folder, even if they never say local business. Covers phone-call conversion design, Greek copy, GDPR and ν. 3471/2006 consent, local SEO, JSON-LD, CSP and deployment, with audit scripts. Do not use for e-shops, WordPress theming, or web apps with logins."
license: MIT
compatibility: "Scripts are dependency-free .mjs files that run with Deno (deno run -A) or Node 18+. Without either, follow the manual checklists in references/. Browser rendering requires Edge/Chrome/Chromium; WebP conversion requires FFmpeg. Network is needed for live-site and font checks."
---

# Local business site builder (Greece)

Distilled from a real site (Αποφράξεις Τσαβάρης) that took dozens of prompts because the invisible plumbing went wrong again and again: server config, consent, SEO files, inconsistent facts. Goal: get it right the first time. Talk to the user in **Greek**.

Paths below are relative to this skill's folder. Resolve them to absolute paths before running scripts; run scripts with `deno run -A scripts/<name>.mjs` (or `node`). If neither exists, tell the user (install: `winget install DenoLand.Deno`, ask first) and use the manual checklists.

## Portable execution

Check the host capabilities before running helpers: terminal and file access, Node 18+ or Deno, browser tooling, optional FFmpeg and network permissions. Never assume installation supplies these tools. Use available equivalent image/browser tools or manual reference checklists; report any automated checks you could not execute. Resolve every supporting path against this installed skill directory. Never assume a Windows user path or install software without authorization.

## Rules that never bend (each cost real time or money)
1. **Never invent facts.** Phone, email, address, ΑΦΜ, ΓΕΜΗ, hours, prices, reviews, ratings, years in business, licences, guarantees, arrival times come from the owner. Missing → ask, or leave out; `[ΧΡΕΙΑΖΕΤΑΙ: …]` markers block go-live. Regulated professions (doctor, dentist, lawyer, pharmacist): no reviews, no success claims (references/01 §4).
2. **One source of truth:** `site-facts.json` (outside the deploy folder). Derived files (JSON-LD, sitemap, llms.txt, robots, manifest, vCard) are regenerated with `scaffold.mjs derive`, never hand-edited.
3. **Design is decided per client**, never copied from a previous site: write `docs/DESIGN.md`, get the user's pick of ONE direction, then code (references/02).
4. **CSP-clean from line one:** no inline script/style/handlers; every third party added to the CSP in the same change; one enforced CSP.
5. **No third-party request before consent or a click.** GA4 loads only after "Αποδοχή"; Accept/Reject equal; map on click; fonts self-hosted with verified Greek glyphs (many popular fonts, e.g. Poppins/Montserrat, have none).
6. **Fix root causes, not per-width patches.** Mobile-first; test the width matrix with `scripts/overflow_probe.js`.
7. **Never trust a server directive.** Hostinger/LiteSpeed ignores `<IfModule>`, silently ignores unsupported directives and forces HTTPS at the edge: verify live with `verify_live.mjs`.
8. **SEO files are deliverables:** canonical, robots (`Allow: /` + Sitemap), sitemap, JSON-LD (LocalBusiness subtype), OG 1200×630, icons incl. maskable.
9. **Bump `?v=`** on every page after any CSS/JS change (`bump_version.mjs`) and purge Hostinger caches.
10. **Verify, don't assume.** Say "done" only after the audit shows 0 errors on the final files, browser QA is done, and you report honestly what is unverified.

## Gotchas (obsolete or false beliefs that look right)
- FAQPage/HowTo markup brings nothing: FAQ rich results were retired on 7 May 2026. `llms.txt` has no proven effect (Google says it does not use it): optional.
- Never add `aggregateRating`/`review` JSON-LD for the business itself; `sameAs` only for real, populated profiles (never an empty second domain).
- A staging `Disallow: /` or `noindex` left in production deindexes the site (audit SEO-001/023).
- Hostinger preview domain `*.hostingersite.com` duplicates the site: 301 it and remove it.
- `htaccess` without the dot is ignored; with a dot it must be uploaded explicitly (hidden file). Docs/facts/`.md` must not sit in `public_html`.
- Google Fonts CDN links break privacy and CSP; frontend design advice that names Poppins/DM Sans/Playfair etc. fails on Greek.
- A link that differs from a file only by letter case works on Windows and 404s on the server.
- Anchors built inside JS (cookie banner → `/privacy.html#cookies`) must exist too.
- The edge bot challenge after ~60 quick requests is not a site failure: wait, don't bypass.

## Workflow (load the reference named in each step before doing it)
0. **Triage:** new site · rework · audit-only (jump to 6) · small change (jump to 5). Check which tools exist (deno/node, browser tool, ffmpeg, Edge/Chrome for `render_png`).
1. **Intake** → read `references/01-intake-and-facts.md`. Ask everything in one Greek message (if nobody can answer, use only the facts given, never invent, write `QUESTIONS.md`); write `site-facts.json` from `assets/site-facts.example.json`; `scaffold.mjs check --facts site-facts.json`.
2. **Design brief** → `references/02-design-direction.md`; fill `docs/DESIGN.md`, propose 2-3 directions, get a choice.
3. **Scaffold:** `scaffold.mjs init --facts site-facts.json --out public --docs docs [--logo logo.svg]` (creates pages, base CSS, JS, `.htaccess` with CSP from the features, robots, sitemap, llms.txt, manifest, vCard, Greek handoff docs, AGENTS.md/CLAUDE.md for the project).
4. **Build** → `references/03-build-and-code.md`, `04-conversion-and-content.md`, `05-seo-schema-geo.md`: tokens + THEME in `style.css`, sections in `index.html` (replace the `[ΧΡΕΙΑΖΕΤΑΙ…]` marker), assets via `make_icons.mjs`, `render_png.mjs` (OG image from an HTML page), `images.mjs`, `font_greek_check.mjs --download`. For consent, privacy text, footer identity, prices or reviews also read `06-privacy-consent-legal.md`. A finished fictional example of the quality bar is in `assets/example-site/` (study structure and copy tone, never its look).
5. **After any fact change:** facts → `scaffold.mjs derive` → visible text → `bump_version.mjs`.
6. **Audit:** `audit_site.mjs public --facts site-facts.json` → fix every ERROR, read WARN, give the owner the VERIFY list. Unclear finding → `references/mistake-registry.md`.
7. **QA and launch** → `references/08-qa-and-launch.md` (width matrix, consent test, content QA); deploy and server details in `references/07-server-htaccess-deploy.md`.
8. **Post-deploy:** `verify_live.mjs https://DOMAIN --local public --preview-domain X.hostingersite.com`; hand the owner `docs/`.
Forms, booking, more pages, CMS, e-shop, other languages, ads pixels → `references/09-beyond-the-basics.md` and agree scope first.

## Scripts (`scripts/`)
`audit_site.mjs` pre-launch audit (ERROR/WARN/VERIFY/INFO; `--json`, `--strict`; exit 1 on errors) · `verify_live.mjs` live check (redirects, headers, 404, exposed files, byte-identity; throttled) · `scaffold.mjs` init/derive/check · `bump_version.mjs` · `render_png.mjs` · `make_icons.mjs` · `images.mjs` (ffmpeg) · `contrast.mjs` · `font_greek_check.mjs` · `overflow_probe.js` (run inside the page). All print `--help`-style usage when called without arguments. They write only inside the folders you pass.

## Reference index
01 intake/facts/regulated professions · 02 design directions, Greek fonts · 03 build, performance, accessibility, widths · 04 conversion and copy · 05 SEO/schema/GBP/AI search · 06 privacy and Greek law pointers · 07 Hostinger server and deploy · 08 QA/launch · 09 beyond the basics · mistake-registry. Research date: 2026-10-05; laws and Google policies change: re-verify before relying on them, and say when something is unverified.
