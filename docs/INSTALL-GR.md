# Εγκατάσταση σε άλλο υπολογιστή ή agent

## Codex και Claude Code με μία εντολή

Χρειάζεσαι Node 22.20 ή νεότερο για το σημερινό skills CLI. Σε ένα terminal:

```sh
npx skills add PongoDogo/local-business-site-builder --skill local-business-site-builder -a codex -a claude-code -g -y --copy
```

Για Cursor πρόσθεσε `-a cursor`. Για άλλους agents:

```sh
npx skills add PongoDogo/local-business-site-builder -g --copy
```

Ο installer του skills CLI υποστηρίζει πολλές πλατφόρμες· η επιλογή και οι προεπιλογές εξαρτώνται από το ποιον agent εντοπίζει. Με `-a ΟΝΟΜΑ` επιλέγεις ρητά κάποιον από τους υποστηριζόμενους agents του CLI.

## Χωρίς το skills CLI

Κατέβασε το repository ZIP από GitHub → Code → Download ZIP και αποσυμπίεσέ το. Άνοιξε terminal μέσα στον φάκελο με το `install.mjs`:

```sh
node install.mjs --agents codex,claude,cursor
node doctor.mjs
```

Ο δικός μας installer χρειάζεται μόνο Node 18+ και δεν χρειάζεται npm install. Αν θέλεις το skill μόνο σε ένα project:

```sh
node install.mjs --agents codex,claude --project "ΔΙΑΔΡΟΜΗ_PROJECT"
```

## Claude στον browser ή στο desktop

Πάρε το **local-business-site-builder.zip** από το Release, όχι το ZIP ολόκληρου του repository. Στο Claude: Customize → Skills → + → Create skill → Upload a skill. Ανέβασε το ZIP και ενεργοποίησέ το.

## Πώς το καλείς

- Codex: `$local-business-site-builder` και το αίτημά σου.
- Claude Code: `/local-business-site-builder` και το αίτημά σου.
- Άλλος agent: επίλεξε το skill από το αντίστοιχο μενού ή ζήτησέ το με το όνομά του.

Αν δεν εμφανίζεται, ξανάνοιξε το session και έλεγξε τη σωστή θέση εγκατάστασης στο README.

## Τι σημαίνει πλήρης λειτουργία

Τα scripts για scaffold και audit χρειάζονται Node/Deno και πρόσβαση αρχείων. Για icons και OG image χρειάζεται Chrome/Edge/Chromium, για το WebP helper FFmpeg, και για live ελέγχους δίκτυο. Το `doctor.mjs` ελέγχει τα τοπικά εργαλεία και εκτελεί το audit του παραδείγματος. Δεν εγκαθιστά αυτόματα λογισμικό ούτε δίνει πρόσβαση στο hosting.

Η εγκατάσταση ελέγχθηκε από το δημοσιευμένο GitHub URL. Η εμφάνιση στα μενού κάθε προϊόντος και οι δυνατότητες του Claude web πρέπει να επιβεβαιωθούν μέσα στα ίδια τα προϊόντα.
