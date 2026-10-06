// LD-xxx: JSON-LD structured data must be valid, linked, and match what visitors can see.
import path from 'node:path';
import { findPrices, normPhone } from '../lib/util.mjs';

const LOCAL_TYPES = new Set([
  'LocalBusiness', 'Plumber', 'Electrician', 'HVACBusiness', 'Locksmith', 'RoofingContractor', 'GeneralContractor', 'HomeAndConstructionBusiness',
  'MovingCompany', 'HousePainter', 'Dentist', 'Physician', 'MedicalClinic', 'Optician', 'Pharmacy', 'Restaurant', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub',
  'FoodEstablishment', 'HairSalon', 'BeautySalon', 'DaySpa', 'AutoRepair', 'AutoBodyShop', 'AutoDealer', 'LegalService', 'Attorney', 'AccountingService',
  'RealEstateAgent', 'TravelAgency', 'Store', 'HealthAndBeautyBusiness', 'ProfessionalService', 'AutomotiveBusiness', 'EmergencyService', 'Notary', 'VeterinaryCare',
  'SportsActivityLocation', 'GymOrFitnessCenter', 'ChildCare', 'Florist', 'FurnitureStore', 'HardwareStore', 'PetStore', 'TattooParlor', 'SelfStorage', 'InsuranceAgency',
]);
const types = (n) => [].concat(n?.['@type'] || []);

function flatten(data) {
  const out = [];
  const visit = (d) => {
    if (Array.isArray(d)) d.forEach(visit);
    else if (d && typeof d === 'object') { if (d['@graph']) visit(d['@graph']); else out.push(d); }
  };
  visit(data);
  return out;
}

export function run(ctx) {
  const { F } = ctx;
  ctx.ld = { biz: null, nodes: [] };
  for (const pg of ctx.pages) {
    if (pg.rel === '404.html' || ctx.skipDir.test(pg.rel)) continue;
    const blocks = [];
    for (const s of pg.all.filter((e) => e.name === 'script' && /ld\+json/i.test(e.attrs.type || ''))) {
      try { blocks.push({ data: JSON.parse(s.raw), el: s }); }
      catch (e) { F.add('error', 'LD-001', pg.rel, `JSON-LD is not valid JSON: ${e.message}`, 'Validate it; common causes: trailing commas, unescaped quotes.', pg.line(s.start)); }
    }
    const nodes = blocks.flatMap((b) => flatten(b.data));
    if (pg.rel === 'index.html') ctx.ld.nodes = nodes;
    const ids = new Set(nodes.map((n) => n['@id']).filter(Boolean));
    const dup = nodes.map((n) => n['@id']).filter(Boolean).filter((v, i, a) => a.indexOf(v) !== i);
    for (const d of new Set(dup)) F.add('error', 'LD-002', pg.rel, `Duplicate @id ${d}.`);
    // unresolved @id-only references
    const refs = [];
    (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { const k = Object.keys(o); if (k.length === 1 && k[0] === '@id') refs.push(o['@id']); else Object.values(o).forEach(walk); } })(blocks.map((b) => b.data));
    for (const r of refs) if (!ids.has(r)) F.add('error', 'LD-003', pg.rel, `JSON-LD references @id ${r} that is not defined on the page.`);
    for (const n of nodes) {
      if (types(n).includes('FAQPage')) F.add('info', 'LD-020', pg.rel, 'FAQPage markup present: harmless, but Google retired FAQ rich results on 7 May 2026, so it earns no visual benefit. It must mirror the visible FAQ word for word.');
      if (n.url && typeof n.url === 'string' && ctx.domain) {
        try { const u = new URL(n.url); if (u.hostname.replace(/^www\./, '') !== ctx.domain) F.add('warn', 'LD-004', pg.rel, `JSON-LD url ${n.url} is not on the site's domain.`); } catch { /* ignore */ }
      }
    }
    if (pg.rel === 'index.html') businessChecks(ctx, pg, nodes);
  }
  if (ctx.home && !ctx.home.all.some((e) => e.name === 'script' && /ld\+json/i.test(e.attrs.type || ''))) {
    F.add('error', 'LD-010', 'index.html', 'No JSON-LD at all on the home page (LocalBusiness data is the core of local SEO).', 'Generate it with scripts/scaffold.mjs from site-facts.json.');
  }
}

function businessChecks(ctx, pg, nodes) {
  const { F } = ctx;
  const biz = nodes.find((n) => types(n).some((t) => LOCAL_TYPES.has(t)));
  if (!biz) { if (nodes.length) F.add('error', 'LD-011', 'index.html', 'JSON-LD has no LocalBusiness (or subtype such as Plumber/Electrician/Dentist).'); return; }
  ctx.ld.biz = biz;
  const need = ['name', 'url', 'telephone', 'address', 'image'];
  for (const k of need) if (!biz[k]) F.add('error', 'LD-012', 'index.html', `LocalBusiness is missing "${k}".`);
  for (const k of ['@id', 'geo', 'openingHoursSpecification', 'areaServed', 'logo', 'email', 'description']) {
    if (!biz[k] && !(k === 'openingHoursSpecification' && biz.openingHours)) F.add('warn', 'LD-013', 'index.html', `LocalBusiness is missing recommended "${k}".`);
  }
  const a = biz.address || {};
  for (const k of ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']) if (!a[k]) F.add('error', 'LD-014', 'index.html', `address.${k} missing.`);
  if (biz.geo) {
    const { latitude: la, longitude: lo } = biz.geo;
    if (ctx.country === 'GR' && !(la > 34 && la < 42 && lo > 19 && lo < 30)) F.add('warn', 'LD-015', 'index.html', `geo (${la}, ${lo}) is not inside Greece: swapped lat/lng or wrong place?`);
  }
  if (biz.geo) {
    const dec = (n) => (String(n).split('.')[1] || '').length;
    if (dec(biz.geo.latitude) < 5 || dec(biz.geo.longitude) < 5) F.add('warn', 'LD-015', 'index.html', 'geo coordinates need at least 5 decimal places (Google LocalBusiness guideline).');
  }
  if (biz.priceRange && String(biz.priceRange).length > 99) F.add('warn', 'LD-022', 'index.html', 'priceRange must be under 100 characters.');
  if (biz.telephone && !/^\+\d{10,15}$/.test(String(biz.telephone).replace(/\s/g, ''))) F.add('warn', 'LD-016', 'index.html', `telephone ${biz.telephone} should be E.164 (+30...).`);

  // image / logo files exist
  for (const u of [].concat(biz.image || [], biz.logo || [])) {
    const url = typeof u === 'string' ? u : u?.url;
    if (!url) continue;
    const r = ctx.resolve('index.html', url);
    if (r.kind === 'internal') {
      const lk = ctx.lookup(r.rel);
      if (!lk.ok && lk.caseOnly) F.add('error', 'LINK-002', 'index.html', `JSON-LD image ${url} differs only by letter case from the real file "${lk.caseOnly}": fine on Windows, 404 on the Linux server.`);
      else if (!lk.ok) F.add('error', 'LD-017', 'index.html', `JSON-LD image/logo points to a missing file: ${url}`);
      else if (!r.abs) F.add('warn', 'LD-017', 'index.html', `JSON-LD image URL should be absolute: ${url}`);
    }
  }

  // sameAs: only real, populated profiles
  for (const s of [].concat(biz.sameAs || [])) {
    const r = ctx.resolve('index.html', s);
    if (r.kind === 'internal') F.add('error', 'LD-018', 'index.html', `sameAs points to the site itself (${s}).`);
    else if (r.kind === 'external') {
      if (r.url.protocol !== 'https:') F.add('warn', 'LD-018', 'index.html', `sameAs is not https: ${s}`);
      F.add('verify', 'LD-019', 'index.html', `sameAs lists ${s}. Is it a real, owned profile/site with real content (not an empty WordPress shell, parked domain or someone else's page)?`, 'Remove it if unsure. Keep only profiles the owner confirms (Google Maps CID, Facebook page, ...).');
    }
  }

  // price consistency: structured data must reflect what is visible
  const visible = new Set(findPrices(pg.text));
  const ldPrices = [];
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (['minPrice', 'price', 'maxPrice'].includes(k) && v !== '' && !isNaN(+v)) ldPrices.push(+v); else walk(v); } } })(biz);
  for (const p of new Set(ldPrices)) if (!visible.has(p)) F.add('error', 'LD-021', 'index.html', `JSON-LD price ${p}€ does not appear on the visible page (visible: ${[...visible].join(', ') || 'none'}). Structured data must match visible content.`);
  if (biz.priceRange) {
    const nums = (String(biz.priceRange).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(',', '.')));
    const minVisible = visible.size ? Math.min(...visible) : null;
    if (nums.length && minVisible != null && Math.min(...nums) !== minVisible) F.add('warn', 'LD-022', 'index.html', `priceRange "${biz.priceRange}" starts at ${Math.min(...nums)} but the lowest visible price is ${minVisible}. Contradictory prices confuse visitors and Google; omit priceRange unless exact.`);
    if (!nums.length) F.add('warn', 'LD-022', 'index.html', `priceRange "${biz.priceRange}" has no number.`);
  }
  if (biz.aggregateRating || biz.review) F.add('warn', 'LD-023', 'index.html', 'aggregateRating/review on a LocalBusiness describing itself: Google treats self-serving review markup as ineligible for rich results (and it must match real, verifiable reviews).', 'Remove it; show real Google reviews on the page instead.');
  for (const n of ctx.ld.nodes) for (const h of [].concat(n.openingHoursSpecification || [])) {
    for (const k of ['opens', 'closes']) if (h[k] && !/^\d{2}:\d{2}(:\d{2})?$/.test(h[k])) F.add('warn', 'LD-024', 'index.html', `openingHoursSpecification.${k} "${h[k]}" is not HH:MM.`);
  }
  // facts
  const fp = ctx.facts?.business;
  if (fp) {
    if (fp.schema_type && !types(biz).includes(fp.schema_type)) F.add('warn', 'LD-025', 'index.html', `JSON-LD @type ${types(biz).join('/')} differs from facts schema_type ${fp.schema_type}.`);
    if (fp.afm && biz.taxID && String(biz.taxID) !== String(fp.afm)) F.add('error', 'LD-026', 'index.html', `JSON-LD taxID ${biz.taxID} differs from facts AFM ${fp.afm}.`);
  }
}
