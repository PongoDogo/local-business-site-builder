# 06 · Privacy, consent and legal pointers (Greece)

Verified: 2026-10-05. NOT legal advice: the owner or a lawyer confirms. Contents: 1 Consent rules · 2 GA4 + Consent Mode v2 · 3 Embeds and fonts · 4 Privacy page · 5 Business identification · 6 Advertising/consumer rules · 7 Accessibility law · 8 Gaps

## 1. Consent rules
- ν. 3471/2006 art. 4 par. 5 (as replaced by art. 170 ν. 4070/2012): prior informed consent for anything stored/read on the device that is not strictly necessary. GDPR art. 6/7.
- ΑΠΔΠΧ Recommendations 1/2020 (25/02/2020): Accept and Reject at the same level, same clicks, same size/emphasis/colour; no pre-ticked boxes; scrolling/continued browsing is not consent; no cookie walls; withdrawal as easy as giving; the re-ask period equal for accept and reject (no number set; we use 6 months); information per category. Statistics cookies are not exempt; GA needs prior consent. 2022 sweep of 30 news sites: missing first-layer reject button, 15-day deadline. No later Greek cookie fine found (absence is not proof).
- EDPB Guidelines 05/2020 and the 2023 banner taskforce report agree. A site with no trackers needs no banner.
- Implementation (templates/js/tracking.js): defaults all `denied` first, tag loaded only after Accept, choice in localStorage (version + timestamp, 6 months), "Ρυθμίσεις cookies" in every footer, withdrawal deletes `_ga*` cookies and reloads.

## 2. GA4 and Consent Mode v2
Four signals: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`. We run "basic" mode (no Google request before consent). Statistics-only config: `allow_google_signals:false`, `allow_ad_personalization_signals:false`, `ads_data_redaction:true`. Set GA4 data retention to 14 months (max for standard; privacy text says so). Google changed (15 Jun 2026) so `ad_storage` alone controls ad-data flow from GA to Google Ads; more changes "later in 2026": re-check before adding ads. CSP for GA4 without ads (Google guide): `script-src https://www.googletagmanager.com`; `img-src https://www.googletagmanager.com https://*.google-analytics.com`; `connect-src https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com` (the template also allows `*.analytics.google.com`, seen in beacons). Ads/Signals add `*.google.<TLD>` (each TLD listed, e.g. `*.google.gr`), `*.g.doubleclick.net`, `pagead2.googlesyndication.com`, `frame-src https://www.googletagmanager.com`.
Ads/Meta later = new banner category + new `CONSENT_VERSION` + privacy text + CSP, same deploy.

## 3. Embeds and fonts
Google Maps: click-to-load (privacy + speed). YouTube: `youtube-nocookie.com`, on click. Google Fonts via Google's CDN: avoid (LG München I, 3 O 17493/20, 20 Jan 2022, EUR 100 damages): self-host. No Greek authority found on these three. EU-US Data Privacy Framework valid (General Court dismissed Latombe 3 Sep 2025; appeal C-703/25 P pending, secondary source).

## 4. Privacy page (template: assets/templates/privacy.html.tpl)
Controller · data and purposes with legal basis (6(1)(b) contract, (c) legal obligation, (f) legitimate interest for server logs, (a) consent for analytics) · cookies (id="cookies": the banner links to it) · recipients (host, email provider, Google only with consent/click, ΑΑΔΕ/accountant) · transfers · retention (invoices: tax law, typically 5 years) · rights · complaint to ΑΠΔΠΧ (dpa.gr). Update it in the same change as any new provider, form or pixel. A form adds: fields, recipient, retention.

## 5. Business identification
Π.Δ. 131/2003 art. 4 (a)-(ζ): name, address, contact incl. email, registry/tax data, regulator where relevant; price rule in par. 2 (prices clear, tax/delivery included). ΓΕΜΗ on business websites: ν. 4919/2022 art. 22 par. 3 (in force 1 Oct 2022; fine reported EUR 200-500, one source EUR 120). Whether a sole trader's purely informational site is covered is unresolved: default = show επωνυμία, διεύθυνση, email, ΑΦΜ, ΓΕΜΗ (when the owner has one) in the footer. The ODR-platform link has not been required since 20 Jul 2025.

## 6. Advertising and consumer rules (summary; ν. 2251/1994 as amended)
Art. 9δ/9ε/9στ: misleading omissions, "δωρεάν", false urgency, bait advertising; ν. 4933/2022 (Omnibus): fake/unverified reviews, disclosure of how reviews are verified. Prior-price rule 30 days (ν. 4177/2013 art. 15 par. 2α). Regulated professions: see 01 §4.

## 7. Accessibility law
EAA transposed by ν. 4994/2022 (ΦΕΚ Α' 215/18.11.2022), applying since 28 Jun 2025; microenterprises (<10 staff, ≤EUR 2m turnover/balance sheet) providing services are exempt (art. 5 par. 4); the Greek e-commerce-service definition covers services concluding consumer contracts online, so an informational micro-business site is probably out of scope (inference). Build to WCAG 2.2 AA anyway (EN 301 549 v3.2.1 = WCAG 2.1 AA is the current legal reference; v4.1.1 awaits citation).

## 8. Gaps to tell the owner
No numeric consent lifetime in Greek law; ΓΕΜΗ coverage of sole traders; professions beyond §01-4; penalties under ν. 3471/2006 not verified. Re-verify before relying on any of this.
