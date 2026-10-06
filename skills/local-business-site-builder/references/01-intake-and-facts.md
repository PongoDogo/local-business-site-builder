# 01 · Intake and facts (read before asking the client anything)

Verified: 2026-10-05. Contents: 1 Principles · 2 Question batch · 3 `site-facts.json` · 4 Regulated professions · 5 Analytics decision · 6 When the owner cannot answer

## 1. Principles
- Every fact on the site comes from the owner. A wrong phone number, price or "24/7" costs real money and can break consumer-protection law (ν. 2251/1994 art. 9δ-9στ: misleading claims, false urgency, fake reviews).
- Ask ONCE, in one message, grouped. Then write `site-facts.json` and run `scripts/scaffold.mjs check`. Re-ask only for what the check reports.
- A fact marked `confirmed: false` or `meta.status != "confirmed"` blocks generation on purpose.

## 2. Question batch (Greek, copy the structure)
1. **Identity:** επωνυμία όπως στα τιμολόγια · εμπορικό όνομα (όπως θέλει να φαίνεται) · ΑΦΜ · αριθμός ΓΕΜΗ (ή «δεν έχω») · ΔΟΥ δεν χρειάζεται.
2. **Contact:** τηλέφωνο που θα καλούν (κινητό ή σταθερό) · email · διεύθυνση + ΤΚ · υπηρεσία χωρίς πελατειακό κατάστημα; (τότε στο Google Business Profile η διεύθυνση κρύβεται).
3. **Hours:** πραγματικό ωράριο. «24/7» μόνο αν ο ιδιοκτήτης το υποστηρίζει όλες τις μέρες και αργίες· έκτακτες βλάβες εκτός ωραρίου;
4. **Services + prices:** λίστα υπηρεσιών · για ποιες υπάρχει σταθερή τιμή «από X€» που ο ιδιοκτήτης επιβεβαιώνει · ΦΠΑ περιλαμβάνεται; · τι λέγεται στο τηλέφωνο (εκτίμηση).
5. **Areas:** περιοχές που πραγματικά καλύπτει (ανά ενότητα) · πού δεν πάει.
6. **Proof:** πραγματικές φωτογραφίες (όχημα, έργα πριν/μετά, ομάδα) · πραγματικές κριτικές Google (κείμενο, όνομα/αρχικά, μήνας) · αριθμός και βαθμολογία με ημερομηνία · πιστοποιήσεις/άδειες που ΥΠΑΡΧΟΥΝ με αποδεικτικό.
7. **Google:** σύνδεσμος Google Maps / CID · Place ID · συντεταγμένες από το Maps (≥5 δεκαδικά, για το `geo`) · ποιο προφίλ Google Business Profile ελέγχει ο ιδιοκτήτης.
8. **Technical:** domain και πού είναι (registrar) · hosting (Hostinger;) · πρόσβαση hPanel · υπήρχε προηγούμενο site (WordPress;) · θέλει στατιστικά (GA4) ή όχι · έχει λογότυπο/χρώματα;
9. **Design:** αναφορές που του αρέσουν, ανταγωνιστές που δεν θέλει να θυμίζει, τόνος (δες 02).
10. **Profession:** είναι ρυθμιζόμενο επάγγελμα (ιατρός, οδοντίατρος, δικηγόρος, φαρμακοποιός); → §4.

## 3. `site-facts.json`
Template: `assets/site-facts.example.json` (fictional; has `_example: true` which blocks generation). Keep it OUTSIDE the deploy folder.
- `business.*` identity/contact/hours/geo/google/same_as. `hours.mode`: `24_7` or `weekly` (weekly entries: days `Mo..Su`, `opens`, `closes`).
- `site.domain` = bare apex (`example.gr`, never `www.`/`https://`). `site.seo.title` (30-60 chars: service + city | brand) and `description` (90-160 chars with phone) are written by you from the facts.
- `prices[]` only owner-confirmed; `services[].price_from` null when "after estimate".
- `reviews.items[]` verbatim; `confirmed: true` only when the owner supplied them. `as_of` = month.
- `claims_confirmed[]` = every marketing claim the owner confirmed (the audit lists unconfirmed ones as VERIFY).
- `design.contrast_pairs`, `design.tokens`, `design.fonts` come from DESIGN.md.
- `business.final_price_by_phone: true` ONLY if the owner confirms that the final price is always given by phone before work (otherwise the line is not written anywhere).
- `features`: `map`, `vcard`, `form`, `llms_txt` (optional; no proven effect, see 05), `youtube`.
- `business.regulated_profession`: `doctor|dentist|lawyer|pharmacist|other`.

## 4. Regulated professions (stop and check)
Official/primary where marked; the rest secondary: ask the professional body or a lawyer.
- Doctors: ν. 3418/2005 art. 17-18: website allowed; show last-update date and conflict-of-interest statement; no testimonials, no success claims, no comparisons.
- Lawyers: ν. 4194/2013 art. 40: no case counts or success rates, no comparisons, no client names without consent (fines reported EUR 1,000-10,000).
- Dentists: Π.Δ. 39/2009 (near-total ban on promotional advertising; secondary source). Pharmacists: Π.Δ. 340/1993 art. 25 (secondary).
- Therefore for these: no reviews section, no ratings, no superlatives, no price promotions, factual information only. The audit raises `REG-001`.
- Other professions (vets, psychologists, accountants, clinics) were not researched: ask.

## 5. Analytics decision
- No analytics = no banner = simplest GDPR/ePrivacy position. Offer it as the default if the owner has no marketing plans.
- GA4 only with prior consent (Greek DPA says statistics cookies are not exempt). Cost: banner, privacy text, CSP, maintenance. See 06.
- Google Ads/Meta later = a new project step (06), not a one-line change.

## 6. When the owner cannot answer (or nobody can be asked: automation, tests, `codex exec`)
Leave the fact out of the site (no hours claim, no price, no reviews section, no coordinates) and list it in `QUESTIONS.md` and in the final report. Never fill gaps with "typical" values. Requests that conflict with the rules (invented reviews, "the best", unproven years, discounts for regulated professions) are declined in writing with the reason, and the compliant alternative is built.
