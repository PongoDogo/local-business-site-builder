// validate_skill.mjs — checks a skill folder against the Agent Skills spec + Anthropic/Codex portability rules.
//   deno run -A tools/validate_skill.mjs src/local-business-site-builder
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dir = path.resolve(process.argv[2] || '.');
const errs = [], warns = [];
const E = (m) => errs.push(m), W = (m) => warns.push(m);
const skillMd = path.join(dir, 'SKILL.md');
if (!fs.existsSync(skillMd)) { console.error('ERROR SKILL.md missing'); process.exit(1); }
const src = fs.readFileSync(skillMd, 'utf8').replace(/^﻿/, '');
const lines = src.split(/\r?\n/);
if (lines[0].trim() !== '---') E('first line must be --- (frontmatter)');
const end = lines.indexOf('---', 1);
if (end < 0) E('frontmatter is not closed with ---');
const fm = {};
let curKey = null;
for (const l of lines.slice(1, end)) {
  const m = l.match(/^([A-Za-z_-]+):\s*(.*)$/);
  if (m && !/^\s/.test(l)) { curKey = m[1]; fm[curKey] = m[2].trim(); }
  else if (curKey) fm[curKey] += ' ' + l.trim();
}
const unq = (v) => (/^"(.*)"$/s.test(v) ? v.slice(1, -1) : /^'(.*)'$/s.test(v) ? v.slice(1, -1) : v);
const ALLOWED = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
for (const k of Object.keys(fm)) if (!ALLOWED.has(k)) E(`frontmatter key "${k}" is not portable (claude.ai/API reject it; Codex ignores it). Allowed: ${[...ALLOWED].join(', ')}`);
const name = unq(fm.name || ''), desc = unq(fm.description || '');
if (!name) E('name missing');
else {
  if (name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) E(`name "${name}" must be lowercase a-z0-9 and single hyphens, ≤64 chars`);
  if (/claude|anthropic/.test(name)) E('name must not contain "claude" or "anthropic"');
  if (name !== path.basename(dir)) E(`name "${name}" must equal the folder name "${path.basename(dir)}"`);
}
if (!desc) E('description missing');
else {
  if (desc.length > 1024) E(`description is ${desc.length} chars (max 1024)`);
  if (/[<>]/.test(desc)) E('description must not contain < or > (XML tags are rejected)');
  if (desc.length > 600) W(`description is ${desc.length} chars: the first ~200 must carry the core use (claude.ai help page mentions a 200-char limit)`);
  if (/^"/.test(fm.description) === false && /: /.test(desc)) E('description has ": " but is not quoted: invalid YAML, skill would load without metadata');
}
if (fm.compatibility && unq(fm.compatibility).length > 500) E('compatibility > 500 chars');
const body = lines.slice(end + 1);
if (body.length > 500) E(`SKILL.md body is ${body.length} lines (limit 500)`);
const approxTokens = Math.round(src.length / 4);
if (approxTokens > 5000) W(`SKILL.md ≈ ${approxTokens} tokens (guideline < 5000)`);

// references mentioned must exist; long references need a contents line
const mentioned = new Set([...src.matchAll(/(?:references|scripts|assets|agents)\/[A-Za-z0-9_./-]+/g)].map((m) => m[0].replace(/[.,;:)]+$/, '')));
for (const p of mentioned) {
  const f = path.join(dir, p);
  if (/[*]|<|>/.test(p)) continue;
  const parent = path.dirname(f), base = path.basename(f);
  const prefixOk = fs.existsSync(parent) && fs.readdirSync(parent).some((x) => x.startsWith(base));   // e.g. "references/01" -> 01-intake-...
  if (!fs.existsSync(f) && !fs.existsSync(f + '.mjs') && !prefixOk) W(`SKILL.md mentions ${p} which does not exist`);
}
const refDir = path.join(dir, 'references');
if (fs.existsSync(refDir)) for (const f of fs.readdirSync(refDir)) {
  const t = fs.readFileSync(path.join(refDir, f), 'utf8');
  if (t.split('\n').length > 100 && !/contents/i.test(t.slice(0, 600))) W(`references/${f} is >100 lines without a "Contents" line near the top`);
}
// customer data must not ship inside the skill
const LEAK = [/165903147/, /175842408000/, /6972842280|697 284 2280/, /apofraxis\.tsavaris/i, /3674773359917400934/, /G-88VS53JQQJ/];
(function scan(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { scan(f); continue; }
    if (/\.(png|webp|jpg|ico|woff2)$/i.test(e.name)) continue;
    const t = fs.readFileSync(f, 'utf8');
    for (const re of LEAK) if (re.test(t)) E(`client data leaked into ${path.relative(dir, f)} (${re})`);
    if (/\r\n/.test(t) && /\.(mjs|js)$/.test(e.name) && /^#!/.test(t)) W(`${path.relative(dir, f)} has a shebang with CRLF line endings (breaks on Linux)`);
  }
})(dir);

for (const w of warns) console.log('WARN  ', w);
for (const e of errs) console.log('ERROR ', e);
console.log(errs.length ? `\n${errs.length} error(s)` : `\nOK: ${name} (${desc.length}-char description, ${body.length} body lines, ≈${approxTokens} tokens)`);
process.exit(errs.length ? 1 : 0);
