#!/usr/bin/env node
// bump_version.mjs — raise the ?v=N cache-buster of the local CSS/JS on EVERY page at once, to the same new number.
// Run it after ANY change to style.css / main.js / tracking.js (browsers cache them for 30 days).
//
//   deno run -A scripts/bump_version.mjs <deploy-folder> [--only style.css,tracking.js]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { walk, toPosix } from './lib/util.mjs';

const a = process.argv.slice(2);
const dir = a.find((x) => !x.startsWith('--'));
const only = a.includes('--only') ? a[a.indexOf('--only') + 1].split(',') : null;
if (!dir || !fs.existsSync(dir)) { console.error('Usage: bump_version.mjs <deploy-folder> [--only style.css,tracking.js]'); process.exit(2); }

const pages = walk(dir).filter((f) => !f.dir && /\.html?$/i.test(f.rel)).map((f) => f.rel);
const re = /((?:href|src)=["'])([^"']+\.(?:css|m?js))(?:\?v=(\d+))?(["'])/g;
const current = new Map(); // asset -> max version
for (const p of pages) {
  for (const m of fs.readFileSync(path.join(dir, p), 'utf8').matchAll(re)) {
    if (/^(https?:)?\/\//.test(m[2])) continue;
    const name = path.basename(m[2]);
    if (only && !only.includes(name)) continue;
    current.set(name, Math.max(current.get(name) || 0, +(m[3] || 0)));
  }
}
if (!current.size) { console.log('No local CSS/JS references found.'); process.exit(0); }
const next = new Map([...current].map(([k, v]) => [k, v + 1]));
let changed = 0;
for (const p of pages) {
  const f = path.join(dir, p);
  const before = fs.readFileSync(f, 'utf8');
  const after = before.replace(re, (m, pre, url, v, post) => {
    const name = path.basename(url);
    if (/^(https?:)?\/\//.test(url) || !next.has(name)) return m;
    return `${pre}${url}?v=${next.get(name)}${post}`;
  });
  if (after !== before) { fs.writeFileSync(f, after); changed++; console.log(`updated ${toPosix(p)}`); }
}
for (const [k, v] of next) console.log(`${k}: v=${current.get(k)} -> v=${v}`);
console.log(`${changed} page(s) updated. Upload ALL of them together with the changed asset.`);
