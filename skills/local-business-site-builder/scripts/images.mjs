#!/usr/bin/env node
// images.mjs — turn one photo into responsive WebP files and print the exact <img> markup (real width/height, srcset, sizes).
// Needs ffmpeg on PATH (Windows: winget install Gyan.FFmpeg).
//
//   deno run -A scripts/images.mjs <photo.jpg> --out public/assets/img/photos --name ochima --widths 560,960
//        [--quality 78] [--sizes "(min-width: 900px) 560px, 92vw"] [--alt "..."] [--lazy] [--hero]
//   --hero : the main above-the-fold image (adds fetchpriority="high", never lazy)
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { imageInfo } from './lib/media.mjs';

const a = process.argv.slice(2);
const o = { input: null, out: null, name: null, widths: [600], quality: 78, sizes: '100vw', alt: '', lazy: false, hero: false };
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--out') o.out = a[++i];
  else if (a[i] === '--name') o.name = a[++i];
  else if (a[i] === '--widths') o.widths = a[++i].split(',').map(Number);
  else if (a[i] === '--quality') o.quality = +a[++i];
  else if (a[i] === '--sizes') o.sizes = a[++i];
  else if (a[i] === '--alt') o.alt = a[++i];
  else if (a[i] === '--lazy') o.lazy = true;
  else if (a[i] === '--hero') o.hero = true;
  else if (!o.input) o.input = a[i];
}
if (!o.input || !o.out || !o.name) { console.error('Usage: images.mjs <photo> --out <dir> --name <base> --widths 360,720 [--quality 78] [--sizes "..."] [--alt "..."] [--lazy|--hero]'); process.exit(2); }
if (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', shell: process.platform === 'win32' }).status !== 0) { console.error('ffmpeg not found on PATH. Install it (Windows: winget install Gyan.FFmpeg) or compress the image another way (Squoosh).'); process.exit(1); }

fs.mkdirSync(o.out, { recursive: true });
const made = [];
for (const w of o.widths.sort((x, y) => x - y)) {
  const dest = path.join(o.out, `${o.name}-${w}.webp`);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', o.input, '-vf', `scale='min(${w},iw)':-2`, '-c:v', 'libwebp', '-quality', String(o.quality), '-compression_level', '6', dest], { encoding: 'utf8', shell: false });
  if (r.status !== 0) { console.error('ffmpeg failed:', r.stderr); process.exit(1); }
  const info = imageInfo(dest);
  made.push({ w: info.width, h: info.height, file: dest, kb: Math.round(fs.statSync(dest).size / 1024) });
  console.log(`wrote ${dest}  ${info.width}x${info.height}  ${made[made.length - 1].kb} KB`);
}
const big = made[made.length - 1];
const web = (f) => '/' + path.relative(process.cwd(), f).replace(/\\/g, '/').replace(/^.*?(assets\/)/, '$1');
const srcset = made.length > 1 ? ` srcset="${made.map((m) => `${web(m.file)} ${m.w}w`).join(', ')}" sizes="${o.sizes}"` : '';
const loading = o.hero ? ' fetchpriority="high"' : o.lazy ? ' loading="lazy" decoding="async"' : '';
console.log(`\n<img src="${web(big.file)}"${srcset} width="${big.w}" height="${big.h}"${loading} alt="${o.alt || 'DESCRIBE WHAT THE PHOTO REALLY SHOWS'}">`);
if (big.kb > 120) console.log(`NOTE ${big.kb} KB is large for the biggest size: lower --quality or the largest width.`);
