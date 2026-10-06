# Example site (FICTIONAL): quality bar, not a template to copy

`public/` is a complete small site for an invented bakery ("ΔΕΙΓΜΑ ΦΟΥΡΝΟΣ", domain fournos-deigma.gr, no real person/number/address). It was produced with this skill's own tools and passes `audit_site.mjs` with 0 errors (`site-facts.json` is its facts file; no analytics, so no cookie banner).

Study: section order, honest copy tone, price display ("από", "στο τηλέφωνο"), FAQ style, how facts, JSON-LD, sitemap, llms.txt and `.htaccess` stay consistent, how the theme sits on top of the base CSS (tokens + a THEME block), how fonts (Brygada 1918 + Manrope, greek+latin subsets) are self-hosted and preloaded.

**Never reuse its look.** The direction "Ζεστό χειροτεχνικό" (flour paper, terracotta, serif headlines, scoring-slash motif, chalkboard hours card) belongs to this fictional bakery. Every real client gets its own direction from `references/02-design-direction.md`. Do not copy its palette, motif or layout; do not copy its facts.

Re-run for yourself: `deno run -A scripts/audit_site.mjs assets/example-site/public --facts assets/example-site/site-facts.json`
