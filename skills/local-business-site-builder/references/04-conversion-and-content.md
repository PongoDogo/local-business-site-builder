# 04 · Conversion and content

Verified: 2026-10-05. Contents: 1 Evidence quality · 2 Page structure · 3 Hero and call mechanics · 4 Prices · 5 Reviews and proof · 6 Copy rules · 7 FAQ · 8 Areas · 9 Greek typography

## 1. Evidence quality (be honest about it)
Phone is the main conversion for urgent trades, but the numbers are vendor-only (Invoca 2025: 46% phone-lead conversion in home services; agency claims of 65-85% have no method). No independent study of sticky call bars or phone-vs-form exists; GoodUI's 29 sticky-CTA tests lean positive; NN/g found hidden (hamburger) navigation is used less than visible (57% vs 86%, 2016). BrightLocal 2026 (US): 31% require 4.5+ stars, 74% weigh reviews of the last 3 months, 47% avoid businesses with <20 reviews. So: the design is built on sound practice, not on a guaranteed uplift: do not promise numbers to the client.

## 2. Page structure (single page; add pages only per 09)
Top bar (hours status + phone) → header (brand, menu, call button) → hero → prices → reviews (if real) → work photos → services (grouped, foldable) → why us (concrete) → how we work (3-4 steps) → areas → FAQ (10-12 practical questions) → contact callout (huge phone, save-contact vCard, 3 tips for faster service) → footer (legal identity) → mobile call bar. Skip sections the facts cannot support (no reviews section without real reviews).

## 3. Hero and call mechanics
- H1: service + place ("Αποφράξεις 24 ώρες σε Αθήνα & Αττική"). Lead: 2 sentences, what to do now. XL call button with the number inside it; "από X€" link below.
- Call button = the loudest element, same colour everywhere, ≥48 px, number `nowrap` + tabular numerals. Repeat it: top bar, header, hero, prices, van/photo block, areas, callout, footer, mobile call bar (≥ 8 places in the reference).
- Mobile: fixed bottom call bar (hides under the cookie banner). Desktop: sticky header with button.
- A "save to contacts" vCard link and `data-track` on every CTA.
- Hours badge: static "Ανοιχτά τώρα" only for true 24/7; otherwise real hours text.

## 4. Prices
Show "από X€" only for owner-confirmed prices; everything else "Τιμή μετά από εκτίμηση στο τηλέφωνο". State that the final price is given by phone before work starts (only if the owner does that). Prices appear in JSON-LD only if visible. Format: choose ONE style (`40€` or `40 €` with `&nbsp;`) and use it everywhere. Consumer law: prices must be clear and VAT-inclusive for consumers (Π.Δ. 131/2003 art. 4 par. 2, ν. 2251/1994); "Δωρεάν", "έκπτωση" and urgency claims are regulated (art. 9δ-9στ; a "was/now" price needs the 30-day prior-price rule, ν. 4177/2013 art. 15).

## 5. Reviews and proof
- Only real reviews, verbatim, short author form ("Μαρία Α."), source and month ("Στοιχεία Google · Σεπτέμβριος 2026"), links to the Google listing and to the write-review flow. Letter avatars, not photos.
- ν. 2251/1994 art. 9ε par. 6 (added by ν. 4933/2022): say whether/how reviews are verified; fake or paid reviews are banned. Never gate, filter or incentivise reviews (Google policy, extended April 2026).
- Never add `aggregateRating`/`review` JSON-LD for your own business (ineligible, even via widgets).
- Licences, insurance, years in business, certificates: only with a document the owner can show.
- Before/after photos: real, same job, honest captions.

## 6. Copy rules
Concrete, plain, practical. Say what causes the problem, what the customer should do while waiting (e.g. don't use chemical drain cleaners, don't re-flush), what the method is and why. No superlatives ("καλύτεροι", "νούμερο 1"), no "ολοκληρωμένες λύσεις", no arrival-time promises unless the owner commits ("Εξαρτάται από το πού βρίσκεστε"). Em-dashes sparingly, no emoji, no exclamation marks. Each claim must pass: *can the owner prove it today?* Otherwise delete it. Use the owner's real words from reviews/phone calls for tone.

## 7. FAQ (also the main SEO text)
Cost · how fast · nights/Sundays · will you break tiles · when is a camera inspection needed · how do I know it's blocking · smell · plumber vs drain crew · what to do until you arrive · how to prevent · who pays in a block of flats · do you issue a receipt. Adapt per trade. Answers 2-5 sentences, honest about limits. (FAQ rich results no longer exist; the value is the content.)

## 8. Areas
Group municipalities by region (7 groups in the reference) in foldable cards + "Δεν βλέπετε την περιοχή σας; Πάρτε μας τηλέφωνο". Do NOT generate templated per-town pages (Google spam policy: doorway/scaled content); a dedicated area page needs unique, useful content.

## 9. Greek typography and formats
All-caps words take no accent (ΤΣΑΒΑΡΗΣ; with `lang="el"` CSS `text-transform:uppercase` removes accents, in JS use `toLocaleUpperCase('el')`); normal case keeps them (Τσαβάρης). Dates "5 Οκτωβρίου 2026"; Greek question mark is `;`; thousands `1.250,50`; phone `6XX XXX XXXX` / `tel:+306XXXXXXXXX`; quotes « ». Titles ≤ ~60 chars; Greek truncation is pixel-based (no official Greek figure).
