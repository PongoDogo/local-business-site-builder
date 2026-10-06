#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

export const name = 'local-business-site-builder';
export const source = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills', name);
const roots = { codex: '.agents/skills', claude: '.claude/skills', cursor: '.cursor/skills', generic: '.agents/skills' };
const marker = '.local-business-site-builder-install.json';

function files(root) {
  const list = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.DS_Store', 'Thumbs.db', 'evals', '.git', 'node_modules', marker].includes(item.name)) continue;
      const full = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw new Error(`Symlinks are not supported: ${full}`);
      if (item.isDirectory()) walk(full);
      else if (item.isFile()) list.push(path.relative(root, full));
    }
  }
  walk(root);
  return list.sort();
}
function hashes(root) {
  return Object.fromEntries(files(root).map(rel => [rel.split(path.sep).join('/'), createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex')]));
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function isWithin(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function assertNoLinks(dest, boundary) {
  for (let p = dest;; p = path.dirname(p)) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw new Error(`Destination contains a symlink: ${p}`);
    if (p === boundary || p === path.dirname(p)) break;
  }
}

export function install({ targets = ['codex', 'claude'], project, dest, update = false, dryRun = false, home = os.homedir(), src = source } = {}) {
  if (!fs.existsSync(path.join(src, 'SKILL.md'))) throw new Error('Missing SKILL.md in source');
  if (dest && project) throw new Error('Use --dest or --project, not both');
  for (const t of targets) if (!Object.hasOwn(roots, t)) throw new Error(`Unknown agent: ${t}. Supported: ${Object.keys(roots).join(', ')}`);
  const base = path.resolve(project || home);
  const destinations = [...new Set(dest ? [path.resolve(dest, name)] : targets.map(t => path.join(base, roots[t], name)))];
  const manifest = hashes(src);
  // Preflight ALL destinations before changing anything.
  const plans = destinations.map(d => {
    assertNoLinks(d, dest ? path.resolve(dest) : base);
    if (isWithin(src, d) || isWithin(d, src)) throw new Error('Source and destination must be separate');
    if (!fs.existsSync(d)) return { d, action: 'install' };
    const current = hashes(d);
    if (same(current, manifest)) return { d, action: 'unchanged' };
    if (!update) throw new Error(`Existing installation differs: ${d}. Use --update; nothing overwritten.`);
    const receipt = path.join(d, marker);
    if (!fs.existsSync(receipt)) throw new Error(`Unmanaged installation: ${d}. Back up and move it manually before installing.`);
    const previous = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    if (previous.name !== name || !same(previous.hashes, current)) throw new Error(`Local changes detected: ${d}. Back up and move it manually; nothing overwritten.`);
    return { d, action: 'update' };
  });
  for (const { d, action } of plans) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${action}: ${d}`);
    if (dryRun || action === 'unchanged') continue;
    const parent = path.dirname(d);
    fs.mkdirSync(parent, { recursive: true });
    const stage = fs.mkdtempSync(path.join(parent, '.' + name + '-stage-'));
    let backup;
    try {
      for (const rel of files(src)) {
        const to = path.join(stage, rel);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(src, rel), to);
      }
      if (!same(hashes(stage), manifest)) throw new Error('Staged copy failed integrity verification');
      fs.writeFileSync(path.join(stage, marker), JSON.stringify({ name, installedAt: new Date().toISOString(), hashes: manifest }, null, 2) + '\n');
      if (action === 'update') {
        const backupRoot = path.join(path.dirname(parent), 'agent-skill-backups');
        fs.mkdirSync(backupRoot, { recursive: true });
        backup = path.join(backupRoot, name + '.backup-' + randomUUID());
        fs.renameSync(d, backup);
      }
      try { fs.renameSync(stage, d); }
      catch (error) { if (backup) fs.renameSync(backup, d); throw error; }
      if (backup) console.log(`Backup retained: ${backup}`);
    } finally {
      // Only remove our own staging directory under the verified destination parent.
      if (fs.existsSync(stage) && isWithin(parent, stage) && path.basename(stage).startsWith('.' + name + '-stage-')) fs.rmSync(stage, { recursive: true });
    }
  }
  return plans;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node install.mjs [--agents codex,claude,cursor] [--project PATH | --dest SKILLS_PARENT] [--update] [--dry-run]\nDefault: user-level Codex + Claude Code. --dest targets another agent\'s documented skills folder. Updates retain a backup and refuse local edits.');
    return;
  }
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--update') opts.update = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (['--agents', '--project', '--dest'].includes(a)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${a}`);
      if (a === '--agents') {
        opts.targets = value.split(',');
        if (opts.targets.some(t => !t)) throw new Error('Empty agent name');
      } else opts[a.slice(2)] = value;
    } else throw new Error(`Unknown option: ${a}. Use --help.`);
  }
  install(opts);
  console.log('Installation checked. Reload your agent if the skill does not appear. Run node doctor.mjs to check optional tools.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error('ERROR: ' + e.message); process.exitCode = 1; }
}
