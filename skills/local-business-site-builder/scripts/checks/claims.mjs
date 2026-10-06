// CLAIM-xxx / COPY-xxx: statements that need owner confirmation, generic filler, "AI look" tells.
import { norm, snippet } from '../lib/util.mjs';
import { textOf } from '../lib/html.mjs';

// patterns run on norm()-alised text: lowercase, no accents, final sigma = sigma
const CLAIMS = [
  [/\d+\s*\+?\s*(χρονια|ετη|χρονων)\b/, 'years / experience figure'],
  [/εμπειρια\s+(\d+|πανω απο|ανω των)/, 'years / experience figure'],
  [/εγγυη|εγγυομαστε|εγγυημεν|guarantee|warranty/, 'guarantee / warranty'],
  [/\b100\s?%/, '100% claim'],
  [/δωρεαν|χωρισ χρεωση|χωρισ κρυφεσ|free of charge|no hidden/, 'free / no fees / no hidden fees'],
  [/πιστοποι|\biso\s?\d{3,5}|αδεια λειτουργιασ|αδειουχ|διπλωματουχ|εγκεκριμεν|licensed|certified/, 'certification / licence'],
  [/ασφαλισμεν|ασφαλιστικη καλυψη|insured/, 'insurance'],
  [/\b(ο|η|το|οι|τα)\s+καλυτερ|νουμερο\s?1|\bno\.?\s?1\b|#1|\bοι πρωτοι|μοναδικ|κορυφαι|\bthe best\b|market leader/, 'superlative / ranking'],
  [/(σε|εντοσ|μεσα σε)\s+\d+\s*(λεπτα|ωρα|ωρεσ|minutes)/, 'arrival / response-time promise'],
  [/αμεση (αφιξη|ανταποκριση|εξυπηρετηση|παρεμβαση)|(ερχομαστε|φτανουμε|ερχεται) αμεσωσ/, 'immediacy promise'],
  [/\d{2,}\s*\+?\s*(πελατεσ|εργα|εγκαταστασεισ|ικανοποιημενοι|customers|projects)/, 'customer / job count'],
  [/ικανοποιημενοι πελατεσ|ικανοποιηση πελατων/, 'satisfaction claim'],
  [/βραβε|award/, 'awards'],
  [/24\s*\/\s*7|24\s*ωρεσ|24ωρο|ανοιχτα τωρα/, '24/7 availability'],
  [/οικογενειακη επιχειρηση|απο το \d{4}|εδω και \d+/, 'history / "since" claim'],
  [/συνεργαζομαστε με|επισημοσ αντιπροσωποσ|εξουσιοδοτημενοσ/, 'partnership / authorisation'],
];

const CLICHES = [
  /ολοκληρωμενεσ λυσεισ/, /υψηλησ ποιοτητασ υπηρεσιεσ/, /αριστη ποιοτητα/, /τεχνολογιασ αιχμησ/, /καινοτομεσ λυσεισ/, /μοναδικη εμπειρια/,
  /η ικανοποιηση σασ ειναι η προτεραιοτητα μασ/, /με παθοσ και/, /ειμαστε στη διαθεση σασ/, /στο επικεντρο/, /εξατομικευμενεσ λυσεισ/, /κορυφαιεσ υπηρεσιεσ/,
  /παροχη υπηρεσιων υψηλων προδιαγραφων/, /cutting-edge/, /state-of-the-art/, /\bseamless\b/, /\belevate\b/, /\bunlock\b/, /world-class/, /tailored solutions/, /your trusted partner/, /fast-paced world/,
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2705}\u{274C}]/u;

export function run(ctx) {
  const { F } = ctx;
  const grouped = new Map();
  for (const pg of ctx.pages) {
    if (['404.html', 'privacy.html'].includes(pg.rel) || ctx.skipDir.test(pg.rel)) continue;
    // reviews are the customers' words, not the business's claims
    const text = textOf(pg.doc.root, { skip: (e) => e.name === 'blockquote' || /\breview/.test(e.attrs.class || '') });
    const sentences = text.split(/\n|(?<=[.!;])\s+/).map((s) => s.trim()).filter((s) => s.length > 6);
    for (const s of sentences) {
      const n = norm(s);
      for (const [re, label] of CLAIMS) if (re.test(n)) {
        const arr = grouped.get(label) || grouped.set(label, []).get(label);
        if (!arr.some((x) => x.s === s)) arr.push({ s, rel: pg.rel });
      }
      for (const re of CLICHES) if (re.test(n)) F.add('warn', 'COPY-001', pg.rel, `Generic filler copy: "${snippet(s, 0, 90)}"`, 'Replace with something concrete only this business can say (a method, a real number, a real situation).');
    }
    const em = (text.match(EMOJI) || []).length;
    if (em) F.add('warn', 'COPY-002', pg.rel, `${em} emoji in the page text: reads as generic AI/template output on a trades/professional site.`, 'Use real photos or purposeful icons instead.');
    const dashes = (text.match(/—/g) || []).length;
    if (dashes > 4) F.add('info', 'COPY-003', pg.rel, `${dashes} em-dashes (—) in the copy: a common AI-writing tell. Prefer commas, full stops or "·".`);
    const excl = (text.match(/!/g) || []).length;
    if (excl > 6) F.add('info', 'COPY-004', pg.rel, `${excl} exclamation marks: reads as hype.`);
    for (const m of text.matchAll(/(?<![Α-Ωα-ωΆ-Ώά-ώ])[Α-Ω]*[ΆΈΉΊΌΎΏ][Α-Ω]{2,}(?![α-ωά-ώ])/g)) {
      F.add('warn', 'COPY-005', pg.rel, `All-caps Greek word carries an accent: "${m[0]}". Capitals in all-caps words take no tonos (ΤΣΑΒΑΡΗΣ, not ΤΣΑΒΆΡΗΣ).`);
      break;
    }
  }
  const confirmed = (ctx.facts?.claims_confirmed || []).map((c) => norm(String(c)));
  for (const [label, allArr] of grouped) {
    // a claim the owner already confirmed (site-facts.json -> claims_confirmed) is not raised again
    const arr = allArr.filter((x) => !confirmed.some((c) => c && (norm(x.s).includes(c) || norm(label).includes(c))));
    if (!arr.length) continue;
    const sample = arr.slice(0, 3).map((x) => `"${snippet(x.s, 0, 80)}" (${x.rel})`).join(' | ');
    F.add('verify', 'CLAIM-001', '', `Claim: ${label} (${arr.length}x). Owner must confirm it is true and provable: ${sample}`, 'Confirm in writing; then add it to claims_confirmed in site-facts.json, or delete the sentence.');
  }
}
