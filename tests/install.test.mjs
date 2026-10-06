import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { install, name } from '../install.mjs';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'business-skill-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'source');
  fs.mkdirSync(path.join(src, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(src, 'SKILL.md'), '---\nname: local-business-site-builder\ndescription: Test fixture\n---\n');
  fs.writeFileSync(path.join(src, 'scripts', 'demo.mjs'), 'export const version = 1;');
  return { src, home: path.join(dir, 'home with spaces') };
}
test('installs complete copies for all supported agents; rerun is unchanged', t => {
  const f = fixture(t);
  const opts = { ...f, targets: ['codex', 'claude', 'cursor'] };
  const plans = install(opts);
  assert.equal(plans.length, 3);
  for (const { d } of plans) assert.equal(fs.readFileSync(path.join(d, 'scripts', 'demo.mjs'), 'utf8'), 'export const version = 1;');
  assert.ok(install(opts).every(p => p.action === 'unchanged'));
});
test('dry run does not create folders; invalid options fail', t => {
  const f = fixture(t);
  install({ ...f, dryRun: true });
  assert.equal(fs.existsSync(f.home), false);
  assert.throws(() => install({ ...f, targets: ['unsupported'] }), /Unknown agent/);
  assert.throws(() => install({ ...f, project: f.home, dest: f.home }), /not both/);
  assert.equal(fs.existsSync(f.home), false);
});
test('update preserves old installation as backup', t => {
  const f = fixture(t);
  const [{ d }] = install({ ...f, targets: ['codex'] });
  fs.writeFileSync(path.join(f.src, 'scripts', 'demo.mjs'), 'export const version = 2;');
  assert.throws(() => install({ ...f, targets: ['codex'] }), /differs/);
  install({ ...f, targets: ['codex'], update: true });
  assert.equal(fs.readFileSync(path.join(d, 'scripts', 'demo.mjs'), 'utf8'), 'export const version = 2;');
  const backupRoot = path.join(path.dirname(path.dirname(d)), 'agent-skill-backups');
  const backup = fs.readdirSync(backupRoot).find(n => n.startsWith(name + '.backup-'));
  assert.ok(backup);
  assert.equal(fs.readFileSync(path.join(backupRoot, backup, 'scripts', 'demo.mjs'), 'utf8'), 'export const version = 1;');
});
test('local edits stop all destinations before any mutation', t => {
  const f = fixture(t);
  const plans = install(f);
  fs.writeFileSync(path.join(plans[1].d, 'scripts', 'demo.mjs'), 'local edits');
  fs.writeFileSync(path.join(f.src, 'scripts', 'demo.mjs'), 'new release');
  assert.throws(() => install({ ...f, update: true }), /Local changes/);
  assert.equal(fs.readFileSync(path.join(plans[0].d, 'scripts', 'demo.mjs'), 'utf8'), 'export const version = 1;');
});
test('project and custom destination paths work with spaces', t => {
  const f = fixture(t);
  const [{ d }] = install({ ...f, project: f.home, targets: ['cursor'] });
  assert.equal(d, path.join(f.home, '.cursor', 'skills', name));
  const custom = path.join(f.home, 'another agent skills');
  assert.equal(install({ ...f, dest: custom })[0].d, path.join(custom, name));
});
test('unmanaged differing install is never overwritten', t => {
  const f = fixture(t);
  const d = path.join(f.home, '.agents', 'skills', name);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'SKILL.md'), 'custom skill');
  assert.throws(() => install({ ...f, targets: ['codex'], update: true }), /Unmanaged/);
  assert.equal(fs.readFileSync(path.join(d, 'SKILL.md'), 'utf8'), 'custom skill');
});
