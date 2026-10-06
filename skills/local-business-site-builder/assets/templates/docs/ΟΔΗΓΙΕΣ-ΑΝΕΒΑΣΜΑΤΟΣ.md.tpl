# Οδηγίες ανεβάσματος: {{LEGAL_NAME}} ({{DOMAIN}})

Αυτό το αρχείο μένει **έξω** από τον φάκελο που ανεβαίνει (δεν πρέπει να υπάρχει στο `public_html`).

## 1. Πριν ανεβάσεις (στον υπολογιστή)

1. Τρέξε τον έλεγχο. Πρέπει να δείξει **0 errors**:
   ```
   deno run -A scripts/audit_site.mjs public --facts site-facts.json
   ```
2. Διάβασε τα `WARN` και τα `VERIFY` (ό,τι χρειάζεται επιβεβαίωση από τον ιδιοκτήτη: ισχυρισμοί, κριτικές, τιμές).
3. Αν άλλαξες `style.css`, `main.js` ή `tracking.js`: αύξησε το `?v=` σε **όλες** τις σελίδες με
   ```
   deno run -A scripts/bump_version.mjs public
   ```
   (αλλιώς οι επισκέπτες βλέπουν το παλιό αρχείο για έως 30 ημέρες).

## 2. Ανέβασμα στο Hostinger

1. hPanel → **Websites** → *Manage* → **File Manager** → φάκελος `public_html`.
2. Αν υπάρχει το αρχείο `default.php`, σβήστο.
3. Ανέβασε το **περιεχόμενο** του φακέλου `public` (όχι τον φάκελο `public` ο ίδιος) μέσα στο `public_html`.
4. Βεβαιώσου ότι ανέβηκε και το **`.htaccess`** (είναι κρυφό αρχείο: File Manager → *Settings* → *Show hidden files*). Πρέπει να λέγεται ακριβώς `.htaccess`, με τελεία μπροστά.
5. hPanel → **SSL**: το πιστοποιητικό για το `{{DOMAIN}}` πρέπει να είναι ενεργό (δωρεάν).
6. Το διακόπτη «Force HTTPS» του hPanel μην τον αλλάξεις στα τυφλά: το `.htaccess` κάνει ήδη τη μετάβαση σε https. Αν και τα δύο είναι ενεργά, το `http://www` κάνει 2 άλματα (ακίνδυνο). Αν δεις **«too many redirects»**, κλείσε το ένα από τα δύο.
7. Όταν δουλέψει το κανονικό domain: hPanel → Websites → ⋮ → *Website Details* → **Remove preview domain** (αλλιώς το Google μπορεί να βρει δεύτερο αντίγραφο του site στο `*.hostingersite.com`).

## 3. Έλεγχος του live site (μετά το ανέβασμα)

```
deno run -A scripts/verify_live.mjs https://{{DOMAIN}} --local public --preview-domain ΟΝΟΜΑ.hostingersite.com
```
Πρέπει να δείξει **0 errors**. Ελέγχει: ανακατευθύνσεις σε ένα βήμα, headers ασφαλείας, πραγματικό 404, robots/sitemap, ότι κάθε τοπικό αρχείο είναι όντως live, και ότι δεν φαίνονται ιδιωτικά αρχεία.

## 4. Αν βγει «500 Internal Server Error» σε όλο το site

Φταίει σχεδόν πάντα το `.htaccess`. Στον File Manager μετονόμασέ το σε `.htaccess.off`. Το site δουλεύει αμέσως (χωρίς τις ρυθμίσεις ασφαλείας). Μετά διόρθωσε το αρχείο και ξαναβάλε το όνομα `.htaccess`.

## 5. Google (μία φορά, μετά το ανέβασμα)

1. [Google Search Console](https://search.google.com/search-console) → προσθήκη ιδιότητας για `https://{{DOMAIN}}` → επαλήθευση.
2. *Sitemaps* → υποβολή του `sitemap.xml`.
3. *Έλεγχος URL* → `https://{{DOMAIN}}/` → *Αίτημα indexing*.
4. Google Business Profile: το **όνομα, η διεύθυνση και το τηλέφωνο** πρέπει να είναι ακριβώς ίδια με το site (`{{LEGAL_NAME}}`, `{{STREET}}`, `{{PHONE_DISPLAY}}`).
5. Ο σύνδεσμος «Γράψτε κριτική» στο site πρέπει να ανοίγει το παράθυρο γραφής κριτικής (`search.google.com/local/writereview?placeid=...`), όχι τη σελίδα της επιχείρησης.

## 6. Μετά από κάθε αλλαγή

Δες το αρχείο `ΑΛΛΑΓΕΣ-ΣΤΟΙΧΕΙΩΝ.md`: τηλέφωνο, τιμές, ωράριο και διεύθυνση εμφανίζονται σε πολλά αρχεία και αλλάζουν **μόνο** από το `site-facts.json`.
