# 08 · QA and launch (definition of done)

Contents: 1 Gates · 2 Browser QA procedure · 3 Consent test · 4 Content QA · 5 Report to the user

## 1. Gates (all must be true before saying "ready")
1. `scaffold.mjs check` clean, `meta.status = confirmed`.
2. `audit_site.mjs public --facts site-facts.json`: **0 errors**; every WARN fixed or justified in one line; VERIFY list handed to the owner.
3. Browser QA (§2) and consent test (§3) done.
4. After upload: `verify_live.mjs … --local public` 0 errors; preview domain removed; Search Console sitemap submitted.
Never report success from memory of earlier runs: re-run after the last edit.

## 2. Browser QA
Serve `public/` at a local root. With a browser tool (built-in browser, Chrome extension, Playwright) for each width in 03 §8: resize → reload → run `scripts/overflow_probe.js` (returns JSON; `ok:true` expected) → screenshot hero + first fold + footer. Check: no horizontal scroll; hero art never covers text; call bar visible on mobile, hidden ≥900px; menu opens/closes; folds closed on mobile/open on desktop; keyboard Tab order and visible focus; console has no errors/CSP violations (production CSP is not applied locally: confirm CSP by reading the audit's CSP-020 results). Without a browser tool: say so, run the audit, and ask the user to open the site at 2-3 phone widths.

## 3. Consent test
Private window, DevTools Network: (a) before choosing, no request to googletagmanager/google-analytics; (b) Reject → still none, banner gone, reload keeps the choice; (c) clear site data → Accept → `gtag/js` then `g/collect` appear; (d) footer "Ρυθμίσεις cookies" reopens the banner; changing to reject deletes `_ga*` and reloads; (e) call bar hides while the banner is open.

## 4. Content QA
Every phone/tel link identical (audit NAP); prices equal facts; "24/7" only if true; reviews verbatim with month; no `[ΧΡΕΙΑΖΕΤΑΙ…]`, no lorem; Greek spelling/accents read aloud once; alt texts describe real photos; privacy page matches the real providers; footer shows ΑΦΜ/ΓΕΜΗ; GBP link and write-review link open the right pages.

## 5. Report to the user (Greek, short)
What was built · files to upload · the 3-5 things the owner must confirm (VERIFY list) · what you could not verify (e.g. no browser tool, unverified legal points) · next steps (upload, GBP, Search Console). No jargon walls; no "everything is perfect" without the audit output.
