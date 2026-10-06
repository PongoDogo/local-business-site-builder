// NAP-xxx: name / address / phone / email / tax data / prices / reviews must be identical everywhere
// and must come from site-facts.json (never invented).
import { findPhones, findEmails, findPrices, normPhone, norm, snippet } from '../lib/util.mjs';
import { textOf } from '../lib/html.mjs';

export function run(ctx) {
  const { F, pages, facts } = ctx;
  const biz = facts?.business;

  // ------------------------------------------------------------ phones
  const phones = new Map(); // e164 -> Set(where)
  const add = (map, key, where) => (map.get(key) || map.set(key, new Set()).get(key)).add(where);
  const displayFormats = new Map();
  for (const pg of pages) {
    if (ctx.skipDir.test(pg.rel)) continue;
    for (const e of pg.all) {
      if (e.name === 'a' && /^tel:/i.test(e.attrs.href || '')) add(phones, normPhone(e.attrs.href.slice(4)), `${pg.rel} (tel link)`);
      for (const k of ['alt', 'title', 'aria-label', 'content']) if (e.attrs[k] && !(e.name === 'meta' && /^(theme-color|viewport)/.test(e.attrs.name || ''))) for (const p of findPhones(e.attrs[k])) add(phones, p.e164, `${pg.rel} (${k})`);
    }
    for (const p of findPhones(pg.text)) { add(phones, p.e164, `${pg.rel} (text)`); add(displayFormats, p.raw.replace(/\d/g, '9'), pg.rel); }
  }
  for (const s of ctx.ld.nodes) if (s.telephone) add(phones, normPhone(s.telephone), 'JSON-LD telephone');
  for (const [name, t] of [['llms.txt', ctx.txt.llms]]) if (t) for (const p of findPhones(t.text)) add(phones, p.e164, name);
  for (const v of ctx.vcf) for (const m of v.text.matchAll(/^TEL[^:]*:(.+)$/gim)) add(phones, normPhone(m[1]), v.rel);
  const keys = [...phones.keys()].filter((k) => /^\+30\d{10}$/.test(k));
  if (keys.length > 1) F.add('error', 'NAP-001', '', `More than one phone number found: ${keys.map((k) => `${k} in ${[...phones.get(k)].slice(0, 3).join(', ')}`).join(' | ')}.`, 'Every number must be the one in site-facts.json (check the old template/other client!).');
  if (biz?.phone) {
    const want = normPhone(biz.phone);
    for (const k of keys) if (k !== want) F.add('error', 'NAP-002', '', `Phone ${k} differs from facts (${want}); found in ${[...phones.get(k)].slice(0, 3).join(', ')}.`);
    if (!phones.has(want)) F.add('error', 'NAP-003', '', `The facts phone ${want} never appears on the site.`);
    for (const pg of pages) {
      if (pg.rel === '404.html' || ctx.skipDir.test(pg.rel)) continue;
      if (!pg.all.some((e) => e.name === 'a' && normPhone((e.attrs.href || '').replace(/^tel:/i, '')) === want && /^tel:/i.test(e.attrs.href || ''))) F.add('warn', 'NAP-004', pg.rel, 'No tap-to-call link (tel:) for the business phone on this page.');
    }
  }
  if (displayFormats.size > 1) F.add('warn', 'NAP-005', '', `The visible phone number is written in different formats: ${[...displayFormats.keys()].join(' vs ')}. Pick one (e.g. 6XX XXX XXXX).`);
  const phoneAnywhere = keys.length || ctx.pages.some((p) => /\btel:/.test(p.src));
  if (!phoneAnywhere) F.add('error', 'NAP-006', '', 'No phone number found anywhere on the site.');

  // ------------------------------------------------------------ emails
  const emails = new Map();
  for (const pg of pages) {
    if (ctx.skipDir.test(pg.rel)) continue;
    for (const e of pg.all) if (e.name === 'a' && /^mailto:/i.test(e.attrs.href || '')) add(emails, e.attrs.href.slice(7).split('?')[0].toLowerCase(), pg.rel);
    for (const m of findEmails(pg.text)) add(emails, m, pg.rel);
  }
  for (const s of ctx.ld.nodes) if (s.email) add(emails, String(s.email).toLowerCase(), 'JSON-LD');
  if (ctx.txt.llms) for (const m of findEmails(ctx.txt.llms.text)) add(emails, m, 'llms.txt');
  for (const v of ctx.vcf) for (const m of findEmails(v.text)) add(emails, m, v.rel);
  // visible text may glue a label to the address ("Emailinfo@x.gr"): drop candidates that merely extend another found address
  for (const k of [...emails.keys()]) if ([...emails.keys()].some((o) => o !== k && k.endsWith(o) && k.length > o.length)) emails.delete(k);
  const ek = [...emails.keys()];
  if (ek.length > 1) F.add('error', 'NAP-010', '', `More than one email address: ${ek.map((k) => `${k} (${[...emails.get(k)].slice(0, 3).join(', ')})`).join(' | ')}`);
  if (biz?.email) for (const k of ek) if (k !== biz.email.toLowerCase()) F.add('error', 'NAP-011', '', `Email ${k} differs from facts (${biz.email}).`);

  // ------------------------------------------------------------ address + tax ids
  const street = biz?.address?.street || ctx.ld.biz?.address?.streetAddress;
  const postal = biz?.address?.postal_code || ctx.ld.biz?.address?.postalCode;
  for (const pg of pages) {
    if (pg.rel === '404.html' || ctx.skipDir.test(pg.rel)) continue;
    const t = norm(pg.text);
    if (street && !t.includes(norm(street))) F.add('warn', 'NAP-020', pg.rel, `The street address "${street}" is not visible on this page (footer?).`);
    if (postal && !t.includes(String(postal))) F.add('warn', 'NAP-021', pg.rel, `Postal code ${postal} is not visible on this page.`);
  }
  if (ctx.country === 'GR') {
    const afms = new Set(), gemis = new Set();
    for (const pg of pages) {
      if (pg.rel === '404.html' || ctx.skipDir.test(pg.rel)) continue;
      const a = [...pg.text.matchAll(/ΑΦΜ[:.\s]*([0-9]{9})/g)].map((m) => m[1]);
      const g = [...pg.text.matchAll(/ΓΕΜΗ[:.\s]*([0-9]{9,12})/g)].map((m) => m[1]);
      a.forEach((x) => afms.add(x)); g.forEach((x) => gemis.add(x));
      if (pg.rel === 'index.html') {
        if (!a.length) F.add('warn', 'NAP-030', pg.rel, 'No ΑΦΜ in the footer. Greek business sites normally show the legal identity (επωνυμία, διεύθυνση, email, ΑΦΜ, ΓΕΜΗ): Π.Δ. 131/2003 art. 4 (information-society services) and ν. 4919/2022 art. 22 par. 3 (ΓΕΜΗ on websites). Whether a purely informational site of a sole trader is covered is unresolved: confirm with the accountant.');
        if (!g.length) F.add('warn', 'NAP-031', pg.rel, 'No ΓΕΜΗ number in the footer.');
      }
    }
    if (afms.size > 1) F.add('error', 'NAP-032', '', `Different ΑΦΜ values: ${[...afms].join(', ')}`);
    if (gemis.size > 1) F.add('error', 'NAP-033', '', `Different ΓΕΜΗ values: ${[...gemis].join(', ')}`);
    if (biz?.afm && afms.size && !afms.has(String(biz.afm))) F.add('error', 'NAP-034', '', `ΑΦΜ on the site (${[...afms]}) differs from facts (${biz.afm}).`);
    if (biz?.gemi && gemis.size && !gemis.has(String(biz.gemi))) F.add('error', 'NAP-035', '', `ΓΕΜΗ on the site (${[...gemis]}) differs from facts (${biz.gemi}).`);
  }

  // ------------------------------------------------------------ prices
  if (ctx.home) {
    const visible = new Set(findPrices(ctx.home.text));
    if (ctx.txt.llms) {
      const lp = new Set(findPrices(ctx.txt.llms.text));
      for (const p of lp) if (!visible.has(p)) F.add('warn', 'NAP-040', 'llms.txt', `llms.txt mentions ${p}€ but the page does not show that price.`);
      for (const p of visible) if (!lp.has(p) && lp.size) F.add('info', 'NAP-041', 'llms.txt', `The page shows ${p}€ but llms.txt does not mention it.`);
    }
    if (facts?.prices) {
      const known = new Set(facts.prices.filter((x) => x.from != null).map((x) => +x.from));
      for (const p of visible) if (!known.has(p)) F.add('error', 'NAP-042', 'index.html', `Price ${p}€ is on the page but not in site-facts.json: invented or stale price?`, 'Prices come only from the owner; add it to the facts file (confirmed) or remove it.');
      for (const x of facts.prices) if (x.confirmed === false) F.add('error', 'NAP-043', '', `Price "${x.label}" (${x.from}€) is marked confirmed:false in site-facts.json.`);
      for (const k of known) if (!visible.has(k)) F.add('warn', 'NAP-044', 'index.html', `Facts price ${k}€ is not shown on the home page.`);
    }
  }

  // ------------------------------------------------------------ hours claims
  if (ctx.home) {
    const t = norm(ctx.home.text);
    const claims247 = /24\s*\/\s*7|24\s*ωρες|24ωρο|ανοιχτα τωρα/.test(t);
    if (facts?.business?.hours?.mode && facts.business.hours.mode !== '24_7' && claims247) F.add('error', 'NAP-050', 'index.html', 'The page claims 24/7 or "open now" but facts hours.mode is not 24_7. A static "open now" badge is false outside opening hours.', 'Remove the claim or compute open/closed in JS from the real hours.');
    if (claims247 && facts && !facts.claims_confirmed?.some((c) => /24/.test(c))) F.add('verify', 'NAP-051', 'index.html', 'The page claims 24/7 availability: confirm it with the owner (add "24/7" to claims_confirmed in site-facts.json).');
  }

  // ------------------------------------------------------------ "write a review" must open the write-review flow
  for (const pg of pages) for (const e of pg.all) {
    if (e.name !== 'a' || !/google\./.test(e.attrs.href || '')) continue;
    if (/γρ[αά]ψ(τε|ε)|write (a )?review|αφ[ηή]στε κριτικ/i.test(textOf(e)) && !/writereview/.test(e.attrs.href)) {
      F.add('warn', 'REV-010', pg.rel, `"${snippet(textOf(e), 0, 50)}" links to ${e.attrs.href.slice(0, 60)}, which opens the listing, not the write-review dialog.`, 'Use the review link from Google Business Profile ("Get more reviews") or https://search.google.com/local/writereview?placeid=PLACE_ID (widely used, not documented by Google). Never gate or incentivise reviews.', pg.line(e.start));
    }
  }

  // ------------------------------------------------------------ reviews: only real ones
  if (ctx.home) {
    const hasReviewUi = ctx.home.all.some((e) => /\breview/.test(e.attrs.class || '') || (e.name === 'blockquote') || (e.attrs.role === 'img' && /αστ[έε]ρι|stars?/i.test(e.attrs['aria-label'] || '')));
    const rv = facts?.reviews;
    if (hasReviewUi && facts && (!rv || rv.confirmed !== true)) F.add('error', 'REV-001', 'index.html', 'The page shows reviews/ratings but site-facts.json has no owner-confirmed reviews. Fabricated testimonials are fraud and break Google/consumer rules.', 'Ask the owner for real reviews (text, author initials, source, month) or delete the section.');
    if (rv?.items?.length) {
      const pageText = norm(ctx.home.text);
      const blocks = ctx.home.all.filter((e) => e.name === 'blockquote').map((e) => norm(textOf(e)));
      for (const b of blocks) {
        const ok = rv.items.some((it) => b.includes(norm(it.text).slice(0, 40)));
        if (!ok) F.add('error', 'REV-002', 'index.html', `A quoted review is not in site-facts.json (invented or edited?): "${snippet(b, 0, 70)}"`);
      }
      if (rv.rating && !pageText.includes(String(rv.rating).replace('.', ',')) && !pageText.includes(String(rv.rating))) F.add('warn', 'REV-003', 'index.html', `Facts rating ${rv.rating} is not shown on the page.`);
    }
    if (hasReviewUi) F.add('verify', 'REV-005', 'index.html', 'Reviews are shown: Greek law (ν. 2251/1994 art. 9ε par. 6, added by ν. 4933/2022) requires saying whether and how reviews are verified, and bans fake or paid reviews. Add a short factual note (source, month, unedited) and have the owner confirm it is true.');
    const prof = facts?.business?.regulated_profession;
    if (prof && ['doctor', 'dentist', 'lawyer', 'pharmacist'].includes(prof) && (hasReviewUi || rv)) F.add('error', 'REG-001', 'index.html', `Testimonials/ratings are restricted for this regulated profession (${prof}; e.g. ν. 3418/2005 art. 17-18 for doctors, ν. 4194/2013 art. 40 for lawyers). Remove the reviews section and success claims, and have the professional body/lawyer approve the copy.`);
    if (hasReviewUi && rv?.as_of && !/20\d\d/.test(ctx.home.text)) F.add('info', 'REV-004', 'index.html', 'Rating shown without a date/source stamp (e.g. "Στοιχεία Google · Σεπτέμβριος 2026"). Add one so it can be verified and refreshed.');
  }
}
