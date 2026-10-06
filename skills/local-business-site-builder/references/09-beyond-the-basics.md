# 09 · Beyond the basics (stop and scope with the user first)

Contents: 1 Contact form · 2 Booking/quotes · 3 More pages · 4 CMS/blog · 5 E-shop · 6 Another language · 7 Ads and pixels

The default product is a fast static one-pager with phone conversion. Anything below changes privacy, security and maintenance. Agree scope, price and owner responsibilities before building; never bolt these on silently.

## 1. Contact form
Needs a backend (no PHP in the default hosting setup: use a form service or small serverless endpoint), spam protection (honeypot + time check; avoid CAPTCHA that loads third parties before consent, or load it on interaction), labels/errors/success messages, privacy-text update (fields, recipient, retention), CSP `form-action` (and `connect-src`) for the endpoint, `features.form = true` in the facts, no personal data in URLs. For emergencies keep the phone as the primary CTA.

## 2. Booking / quotes
Prefer a link to a hosted booking tool opened on click (third party = privacy + CSP + processor agreement). Calendar embeds must be click-to-load.

## 3. More pages (services, areas, about)
Only with unique content per page. Add each to sitemap (derive), nav, canonical, JSON-LD `WebPage`, privacy/footer parity, and the audit passes per page. Avoid templated town pages (05 §8). Use directory-style `.html` files consistently with the redirect rules.

## 4. CMS / blog
A static site has no admin. Options: Markdown + build step (Astro/Eleventy: needs Node, a deploy path, and a different skill/process), or a headless CMS. Tell the user it changes hosting and maintenance. A blog is justified only if someone will write and keep it current.

## 5. E-shop
Out of scope (payments, VAT, consumer law, GDPR, security). Recommend a hosted platform and link out; do not build checkout by hand.

## 6. Another language
Separate folder per language (`/en/`), `lang` per page, hreflang pairs (`el`, `en`, `x-default`) in head and sitemap, translated privacy and banner (TEXT object in tracking.js), same facts file with per-language fields. Greek templates here are Greek-only.

## 7. Ads and pixels
New consent category, `CONSENT_VERSION` bump, privacy text, CSP domains (per-country TLDs), conversion events via `data-track`, test the whole consent flow again. Treat as its own task (06 §2).
