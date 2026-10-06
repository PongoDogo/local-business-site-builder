#!/usr/bin/env node
// audit_site.mjs — deterministic pre-launch audit of a static website folder.
//
//   deno run -A scripts/audit_site.mjs <deploy-folder> [--facts site-facts.json] [--json] [--no-color] [--strict] [--country GR] [--domain example.gr]
//   node scripts/audit_site.mjs <deploy-folder> ...
//
// Exit code: 0 = no errors, 1 = at least one ERROR (or any WARN with --strict), 2 = bad usage.
// Levels: ERROR = must fix before go-live · WARN = very likely a mistake · VERIFY = a human/owner must confirm · INFO = FYI.
import process from 'node:process';
import fs from 'node:fs';
import { buildContext } from './lib/ctx.mjs';
import { printFindings } from './lib/util.mjs';
import * as files from './checks/files.mjs';
import * as html from './checks/html.mjs';
import * as seo from './checks/seo.mjs';
import * as jsonld from './checks/jsonld.mjs';
import * as nap from './checks/nap.mjs';
import * as privacy from './checks/privacy.mjs';
import * as server from './checks/server.mjs';
import * as css from './checks/css.mjs';
import * as claims from './checks/claims.mjs';

const argv = process.argv.slice(2);
const opt = { json: false, color: !!process.stdout.isTTY && !process.env.NO_COLOR, strict: false, facts: null, country: null, domain: null, dir: null, quiet: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') opt.json = true;
  else if (a === '--no-color') opt.color = false;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--quiet') opt.quiet = true;
  else if (a === '--facts') opt.facts = argv[++i];
  else if (a === '--country') opt.country = argv[++i];
  else if (a === '--domain') opt.domain = argv[++i];
  else if (a === '-h' || a === '--help') opt.dir = null;
  else if (!a.startsWith('--') && !opt.dir) opt.dir = a;
}
if (!opt.dir || !fs.existsSync(opt.dir) || !fs.statSync(opt.dir).isDirectory()) {
  console.error('Usage: audit_site.mjs <deploy-folder> [--facts site-facts.json] [--json] [--no-color] [--strict] [--quiet] [--country GR] [--domain example.gr]');
  process.exit(2);
}

const ctx = buildContext(opt.dir, opt);
const stages = [
  ['files', files], ['html', html], ['seo', seo], ['jsonld', jsonld], ['nap', nap],
  ['privacy', privacy], ['server', server], ['css', css], ['claims', claims],
];
for (const [name, mod] of stages) {
  try { mod.run(ctx); }
  catch (e) { ctx.F.add('warn', 'AUDIT-999', '', `Check group "${name}" crashed: ${e.stack?.split('\n').slice(0, 2).join(' ')}`, 'Report this as an audit bug; the other groups still ran.'); }
}

const F = ctx.F;
const counts = { error: F.count('error'), warn: F.count('warn'), verify: F.count('verify'), info: F.count('info') };
if (opt.json) {
  console.log(JSON.stringify({ root: ctx.root, domain: ctx.domain, facts: ctx.factsPath, counts, findings: F.items }, null, 2));
} else {
  const shown = { items: opt.quiet ? F.items.filter((i) => i.level !== 'info') : F.items };
  console.log(`\nAUDIT ${ctx.root}\n  domain: ${ctx.domain || '(unknown)'} · pages: ${ctx.pages.length} · facts: ${ctx.factsPath || 'none (limited NAP/price/review checks)'}`);
  printFindings(shown, { color: opt.color });
  console.log(`\n${'='.repeat(60)}\nRESULT: ${counts.error} error(s) · ${counts.warn} warning(s) · ${counts.verify} to verify with the owner · ${counts.info} info`);
  console.log(counts.error ? 'NOT READY: fix every ERROR, re-run, then review WARN and VERIFY items.' : (counts.warn || counts.verify ? 'No blocking errors. Review WARN/VERIFY items before go-live.' : 'Clean.'));
}
process.exit(counts.error || (opt.strict && counts.warn) ? 1 : 0);
