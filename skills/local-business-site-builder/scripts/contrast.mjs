#!/usr/bin/env node
// contrast.mjs — WCAG contrast ratio of colour pairs.
//   deno run -A scripts/contrast.mjs "#2b3150" "#f6f2ea"  "#182052" "#f2b233"
// Normal text needs >= 4.5:1 (AA), large text (>= 24px or 19px bold) >= 3:1, UI borders/icons >= 3:1.
import process from 'node:process';
import { parseHex, contrast } from './lib/css.mjs';

const a = process.argv.slice(2);
if (a.length < 2 || a.length % 2) { console.error('Usage: contrast.mjs <fg> <bg> [<fg> <bg> ...]  (hex colours)'); process.exit(2); }
let bad = 0;
for (let i = 0; i < a.length; i += 2) {
  const f = parseHex(a[i]), b = parseHex(a[i + 1]);
  if (!f || !b) { console.log(`${a[i]} on ${a[i + 1]}: not a valid hex colour`); bad++; continue; }
  const r = contrast(f, b);
  const tag = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large text only' : 'FAIL';
  if (r < 4.5) bad++;
  console.log(`${a[i]} on ${a[i + 1]}: ${r.toFixed(2)}:1  ${tag}`);
}
process.exit(bad ? 1 : 0);
