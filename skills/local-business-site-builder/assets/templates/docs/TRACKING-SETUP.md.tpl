# Στατιστικά και cookies: {{LEGAL_NAME}}

Το site χρησιμοποιεί **Google Analytics 4 μόνο μετά από συγκατάθεση**. Πριν την επιλογή του επισκέπτη δεν γίνεται κανένα αίτημα προς την Google και δεν μπαίνει κανένα cookie.

## Πώς δουλεύει

- `assets/js/tracking.js` ορίζει πρώτα το Consent Mode v2 με όλα `denied` και δείχνει το banner (Αποδοχή και Απόρριψη ίδια, χωρίς «Χ»).
- Το αρχείο της Google (`gtag.js`) **δεν** είναι στο HTML. Φορτώνεται από το `tracking.js`, μόνο μετά από «Αποδοχή».
- Η επιλογή αποθηκεύεται στη συσκευή του επισκέπτη για 6 μήνες (ίδια για αποδοχή και απόρριψη) και αλλάζει από το «Ρυθμίσεις cookies» στο footer.
- Τα κλικ στα κουμπιά μετριούνται από τα `data-track` και `data-location` στο HTML. Events: `phone_click`, `cta_click`.

## Δημιουργία ή αλλαγή του ID (GA4)

1. [analytics.google.com](https://analytics.google.com) → Admin → δημιουργία property → *Web data stream* για `https://{{DOMAIN}}` → αντιγραφή του **Measurement ID** (`G-XXXXXXXXXX`).
2. Βάλτο στο `site-facts.json` (`analytics.ga4_id`) και στη γραμμή `GOOGLE_TAG_ID` του `assets/js/tracking.js`.
3. `deno run -A scripts/bump_version.mjs public` (αλλάζει το `?v=` σε όλες τις σελίδες).
4. Έλεγχος: `deno run -A scripts/audit_site.mjs public --facts site-facts.json`. Το `.htaccess` (CSP) έχει ήδη τα domains του GA4.
5. Στο GA4 → Admin → Data retention: βάλε **14 μήνες** (το λέει η privacy page).

## Αν θέλεις Google Ads ή Meta pixel αργότερα

**Δεν αρκεί να μπει το ID.** Στην ίδια αλλαγή χρειάζονται:

1. Νέα κατηγορία «Διαφήμιση» στο banner (`ADS_ENABLED = true` στο `tracking.js`).
2. Νέο `CONSENT_VERSION` (το banner ξαναρωτά όλους).
3. Ενημέρωση της `privacy.html` (πάροχοι, σκοποί, χρόνοι).
4. Τα domains της διαφήμισης στο CSP του `.htaccess` (κατά Google: developers.google.com/tag-platform/security/guides/csp, με τα domains ανά χώρα).
5. Έλεγχος ότι τίποτα δεν φορτώνει πριν τη συγκατάθεση (`audit_site.mjs`, κανόνες `PRIV-0xx`).

## Έλεγχος στον browser (2 λεπτά)

1. Άνοιξε το site σε παράθυρο ανώνυμης περιήγησης → στα DevTools → *Network*: μέχρι να πατήσεις κάτι **δεν** πρέπει να υπάρχει αίτημα προς `googletagmanager.com` ή `google-analytics.com`.
2. Πάτα «Απόρριψη» → ξανά κανένα αίτημα.
3. Καθάρισε τα δεδομένα του site, πάτα «Αποδοχή» → εμφανίζεται αίτημα `gtag/js` και `g/collect`.

> Νομική σημείωση: οι κανόνες βασίζονται στον ν. 3471/2006 (άρθρο 4 παρ. 5), στον ΓΚΠΔ και στις οδηγίες της Αρχής Προστασίας Δεδομένων (2020). Το κείμενο της `privacy.html` πρέπει να επιβεβαιωθεί από τον ιδιοκτήτη ή το νομικό του σύμβουλο.
