#!/usr/bin/env node
// make_icons.mjs — from ONE logo (SVG or PNG, square-ish) create every icon the site needs:
//   favicon.ico (16/32/48), favicon.svg (if the logo is SVG), apple-touch-icon.png (180),
//   icon-192.png, icon-512.png (transparent, purpose "any"), icon-maskable-512.png (solid background, safe-zone padding).
// Uses the installed Edge/Chrome (headless). No npm packages.
//
//   deno run -A scripts/make_icons.mjs --logo logo.svg --out public --bg "#f6f2ea"
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { renderPng } from './render_png.mjs';

const a = process.argv.slice(2);
const o = { logo: null, out: null, bg: '#ffffff' };
for (let i = 0; i < a.length; i++) { if (a[i] === '--logo') o.logo = a[++i]; else if (a[i] === '--out') o.out = a[++i]; else if (a[i] === '--bg') o.bg = a[++i]; }
if (!o.logo || !o.out || !fs.existsSync(o.logo)) { console.error('Usage: make_icons.mjs --logo logo.svg|png --out <deploy-folder> [--bg "#f6f2ea"]  (the logo file must exist)'); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
const logoUrl = pathToFileURL(path.resolve(o.logo)).href;
function make(name, size, { bg = null, scale = 0.9 }) {
  const html = path.join(tmp, name + '.html');
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${size}px;height:${size}px;background:${bg || 'transparent'}}body{display:flex;align-items:center;justify-content:center}img{width:${scale * 100}%;height:${scale * 100}%;object-fit:contain}</style><img src="${logoUrl}">`);
  const out = path.join(tmp, name + '.png');
  renderPng({ input: html, out, width: size, height: size, transparent: !bg });
  return out;
}
const dest = (f) => { const p = path.join(path.resolve(o.out), f); fs.mkdirSync(path.dirname(p), { recursive: true }); return p; };

fs.copyFileSync(make('i192', 192, { scale: 0.92 }), dest('icon-192.png'));
fs.copyFileSync(make('i512', 512, { scale: 0.92 }), dest('icon-512.png'));
fs.copyFileSync(make('imask', 512, { bg: o.bg, scale: 0.62 }), dest('icon-maskable-512.png'));   // 62% = inside the 80% maskable safe zone
fs.copyFileSync(make('iapple', 180, { bg: o.bg, scale: 0.84 }), dest('apple-touch-icon.png'));     // iOS paints transparency black: use a solid background

// favicon.ico: three PNG-compressed images (16, 32, 48)
const imgs = [16, 32, 48].map((s) => fs.readFileSync(make('f' + s, s, { scale: 1 })));
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let offset = 6 + 16 * imgs.length;
const entries = imgs.map((png, i) => {
  const e = Buffer.alloc(16); const s = [16, 32, 48][i];
  e[0] = s; e[1] = s; e[2] = 0; e[3] = 0; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
fs.writeFileSync(dest('favicon.ico'), Buffer.concat([head, ...entries, ...imgs]));
if (/\.svg$/i.test(o.logo)) fs.copyFileSync(o.logo, dest('favicon.svg'));
else console.log('NOTE logo is not SVG: no favicon.svg created (the page must not link /favicon.svg then).');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Created: favicon.ico, ' + (/\.svg$/i.test(o.logo) ? 'favicon.svg, ' : '') + 'apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png in ' + o.out);
console.log('Look at icon-maskable-512.png and apple-touch-icon.png: the logo must not touch the edges.');
