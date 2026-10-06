#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findBrowser } from './skills/local-business-site-builder/scripts/render_png.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
console.log(`Node ${process.version}: core scripts available (Node 18+ required).`);
const browser = findBrowser();
console.log(browser ? `Browser available: ${browser}` : 'OPTIONAL: Edge/Chrome/Chromium missing. Icon/OG rendering needs a browser; set BROWSER_PATH.');
const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000 });
console.log(ff.status === 0 ? 'FFmpeg available: WebP helper available.' : 'OPTIONAL: FFmpeg missing. Use your agent image tools or install FFmpeg for images.mjs.');
const runner = ['--preserve-symlinks', '--preserve-symlinks-main'];
const skill = path.join(root, 'skills', 'local-business-site-builder');
const audit = spawnSync(process.execPath, [...runner, path.join(skill, 'scripts', 'audit_site.mjs'), path.join(skill, 'assets', 'example-site', 'public'), '--facts', path.join(skill, 'assets', 'example-site', 'site-facts.json'), '--json'], { encoding: 'utf8', timeout: 30000 });
if (audit.status !== 0) { console.error(audit.stderr || audit.stdout); process.exitCode = 1; }
else { const report = JSON.parse(audit.stdout); console.log(`Bundled example audit: ${report.counts.error} errors, ${report.counts.warn} warnings.`); }
console.log('Network access is needed for live-site/font checks. Browser QA and hosting access depend on your agent. No credentials are bundled.');
if (!fs.existsSync(path.join(skill, 'SKILL.md'))) process.exitCode = 1;
