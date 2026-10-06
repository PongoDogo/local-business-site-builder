#!/usr/bin/env node
// render_png.mjs — render an HTML file (or URL) to an exact-size PNG with the installed Edge/Chrome (headless).
// Use it for: og-image.png (1200x630), icons from an SVG logo, social cards. No npm packages needed.
//
//   deno run -A scripts/render_png.mjs <page.html|url> <out.png> [--width 1200] [--height 630] [--transparent] [--scale 1] [--browser <path>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { imageInfo } from './lib/media.mjs';

export function findBrowser(explicit) {
  const c = [explicit, process.env.BROWSER_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'].filter(Boolean);
  return c.find((p) => fs.existsSync(p)) || null;
}

export function renderPng({ input, out, width = 1200, height = 630, transparent = false, scale = 1, browser }) {
  if (width < 500) console.error("NOTE Chromium headless enforces a minimum window width (~500 px): screenshots narrower than that show a wider layout cropped. For phone widths use a browser tool with viewport emulation (resize_window) and scripts/overflow_probe.js.");
  const exe = findBrowser(browser);
  if (!exe) throw new Error('No Edge/Chrome found. Pass --browser <path> or set BROWSER_PATH.');
  const target = /^https?:|^file:/.test(input) ? input : pathToFileURL(path.resolve(input)).href;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`, `--screenshot=${path.resolve(out)}`,
    ...(transparent ? ['--default-background-color=00000000'] : []), '--virtual-time-budget=4000', target];
  let r = spawnSync(exe, args, { encoding: 'utf8', timeout: 60000 });
  if (!fs.existsSync(out) && process.platform === 'win32') {
    // Some shells cannot start a windowed browser directly: Start-Process (hidden window) can.
    const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
    const ps = `$p = Start-Process -FilePath ${q(exe)} -ArgumentList @(${args.map(q).join(',')}) -Wait -PassThru -WindowStyle Hidden`;
    r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 90000 });
  }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  if (!fs.existsSync(out)) throw new Error('Browser did not produce a screenshot: ' + (r.stderr || r.stdout || 'unknown error').slice(0, 300));
  const info = imageInfo(out);
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const o = { input: null, out: null, width: 1200, height: 630, transparent: false, scale: 1, browser: null };
  const pos = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--width') o.width = +a[++i];
    else if (a[i] === '--height') o.height = +a[++i];
    else if (a[i] === '--scale') o.scale = +a[++i];
    else if (a[i] === '--transparent') o.transparent = true;
    else if (a[i] === '--browser') o.browser = a[++i];
    else pos.push(a[i]);
  }
  [o.input, o.out] = pos;
  if (!o.input || !o.out) { console.error('Usage: render_png.mjs <page.html|url> <out.png> [--width 1200] [--height 630] [--transparent] [--scale 1]'); process.exit(2); }
  try {
    const info = renderPng(o);
    console.log(`wrote ${o.out}: ${info?.width}x${info?.height}`);
    if (info && (info.width !== o.width * o.scale || info.height !== o.height * o.scale)) console.log(`WARN requested ${o.width * o.scale}x${o.height * o.scale}; got ${info.width}x${info.height}. Adjust --height (headless adds/removes a few px on some builds).`);
  } catch (e) { console.error('ERROR', e.message); process.exit(1); }
}
