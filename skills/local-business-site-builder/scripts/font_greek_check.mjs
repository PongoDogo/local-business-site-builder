#!/usr/bin/env node
// font_greek_check.mjs — does a Google Font really contain GREEK glyphs? (Poppins, Montserrat, Nunito, Playfair Display do NOT:
// Greek text silently falls back to another font and looks broken.) Optionally download the woff2 files for self-hosting
// and print the ready-to-paste @font-face CSS.
//
//   deno run -A scripts/font_greek_check.mjs "Manrope"
//   deno run -A scripts/font_greek_check.mjs "Manrope" --download public/assets/fonts --weights 400..800
// Downloading the files contacts fonts.googleapis.com / fonts.gstatic.com once, from your machine (not from the visitors').
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const a = process.argv.slice(2);
const family = a.find((x) => !x.startsWith('--'));
const dl = a.includes('--download') ? a[a.indexOf('--download') + 1] : null;
const weights = a.includes('--weights') ? a[a.indexOf('--weights') + 1] : '400..800';
if (!family) { console.error('Usage: font_greek_check.mjs "Font Name" [--download <dir>] [--weights 400..800]'); process.exit(2); }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function css(spec) {
  const r = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${spec}&display=swap`, { headers: { 'user-agent': UA } });
  return r.ok ? r.text() : null;
}
let text = await css(`:wght@${weights}`);
let usedSpec = weights;
if (!text) { text = await css(':wght@400;700'); usedSpec = '400;700 (static weights: this font has no variable axis)'; }
if (!text) { text = await css(''); usedSpec = 'default weight'; }
if (!text) { console.error(`Font "${family}" not found on Google Fonts (check the exact spelling).`); process.exit(1); }

const faces = [...text.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)].map((m) => ({
  subset: m[1], body: m[2],
  url: (m[2].match(/url\(([^)]+)\)/) || [])[1],
  range: (m[2].match(/unicode-range:\s*([^;]+)/) || [])[1],
  weight: (m[2].match(/font-weight:\s*([^;]+)/) || [])[1],
}));
const subsets = [...new Set(faces.map((f) => f.subset))];
const hasGreek = subsets.includes('greek');
console.log(`Font: ${family}   weights: ${usedSpec}\nSubsets offered: ${subsets.join(', ')}`);
console.log(hasGreek ? 'GREEK: YES, usable for Greek text.' : 'GREEK: NO. Greek letters would fall back to another font. Pick a different font.');
if (!hasGreek) process.exit(1);

if (dl) {
  fs.mkdirSync(dl, { recursive: true });
  const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const out = [];
  for (const sub of ['greek', 'latin']) {
    const f = faces.find((x) => x.subset === sub);
    if (!f) continue;
    const dest = path.join(dl, `${slug}-${sub}.woff2`);
    const r = await fetch(f.url, { headers: { 'user-agent': UA } });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    console.log(`downloaded ${dest} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
    out.push(`@font-face {\n  font-family: "${family}";\n  src: url("/assets/fonts/${slug}-${sub}.woff2") format("woff2");\n  font-weight: ${f.weight || '400 800'};\n  font-style: normal;\n  font-display: swap;\n  unicode-range: ${f.range};\n}`);
  }
  console.log('\n--- paste into style.css section 2 ---\n' + out.join('\n'));
  console.log(`\n--- preload in <head> (both files) ---\n<link rel="preload" href="/assets/fonts/${slug}-greek.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/${slug}-latin.woff2" as="font" type="font/woff2" crossorigin>`);
  console.log('\nAlso copy the font licence (OFL.txt) next to the font files. Set --font-sans to "' + family + '", system-ui, sans-serif.');
}
