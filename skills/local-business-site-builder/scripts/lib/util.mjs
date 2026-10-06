// Shared helpers for the audit scripts. Zero dependencies: runs on Deno (`deno run -A`) and Node >= 18.
import fs from 'node:fs';
import path from 'node:path';

export const toPosix = (p) => p.split(path.sep).join('/');

/** Recursively list every file (dotfiles included) under root. */
export function walk(root) {
  const out = [];
  (function rec(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = toPosix(path.relative(root, full));
      if (ent.isDirectory()) { out.push({ rel, dir: true, size: 0 }); rec(full); }
      else out.push({ rel, dir: false, size: fs.statSync(full).size });
    }
  })(root);
  return out;
}

/** Read a text file as UTF-8; reports a BOM instead of keeping it in the text. */
export function readText(file) {
  const buf = fs.readFileSync(file);
  let text = buf.toString('utf8');
  const bom = text.charCodeAt(0) === 0xFEFF;
  if (bom) text = text.slice(1);
  return { text, bom };
}

/** Fast offset -> 1-based line lookup. */
export function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', middot: '·', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', rarr: '→', larr: '←' };
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Lowercase, accent-free, final-sigma-free Greek/Latin text for tolerant matching. */
export function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ');
}

export function snippet(s, idx = 0, len = 110) {
  const start = Math.max(0, idx - 30);
  return s.slice(start, start + len).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- extractors
const SEP = '[ .\\-]?';
const PHONE_RE = new RegExp(
  '(?<![\\d.,+])(?:(?:\\+|00)30' + SEP + ')?(' +
  '69\\d' + SEP + '\\d{3}' + SEP + '\\d{4}|' +
  '69\\d{2}' + SEP + '\\d{3}' + SEP + '\\d{3}|' +
  '2\\d{2}' + SEP + '\\d{3}' + SEP + '\\d{4}|' +
  '2\\d{3}' + SEP + '\\d{3}' + SEP + '\\d{3}|' +
  '800' + SEP + '\\d{3}' + SEP + '\\d{4}' +
  ')(?!\\d)', 'g');

/** Greek phone numbers found in text, normalised to +30XXXXXXXXXX. */
export function findPhones(text) {
  const out = [];
  PHONE_RE.lastIndex = 0;
  let m;
  while ((m = PHONE_RE.exec(text))) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 10) out.push({ e164: '+30' + digits, raw: m[0], index: m.index });
  }
  return out;
}

/** Normalise any user-entered phone to +30XXXXXXXXXX when it is a Greek number. */
export function normPhone(s) {
  const d = String(s).replace(/[^\d+]/g, '').replace(/^00/, '+');
  const digits = d.replace(/\D/g, '');
  if (digits.length === 10) return '+30' + digits;
  if (digits.length === 12 && digits.startsWith('30')) return '+' + digits;
  return d;
}

export function findEmails(text) {
  return [...text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0].toLowerCase());
}

/** Euro amounts such as "40€", "€40", "40 €", "40,50€". Returns numbers. */
export function findPrices(text) {
  const out = [];
  for (const m of text.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s?€|€\s?(\d{1,4}(?:[.,]\d{1,2})?)/g)) {
    out.push(parseFloat((m[1] || m[2]).replace(',', '.')));
  }
  return out;
}

// ---------------------------------------------------------------- findings
export class Findings {
  constructor() { this.items = []; }
  /** level: error | warn | verify | info */
  add(level, id, file, message, fix = '', line = null) {
    this.items.push({ level, id, file, line, message, fix });
  }
  count(level) { return this.items.filter((i) => i.level === level).length; }
}

const ICON = { error: 'ERROR ', warn: 'WARN  ', verify: 'VERIFY', info: 'INFO  ' };
export function printFindings(findings, { color = true } = {}) {
  const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const col = { error: 31, warn: 33, verify: 36, info: 90 };
  for (const level of ['error', 'warn', 'verify', 'info']) {
    const items = findings.items.filter((i) => i.level === level);
    if (!items.length) continue;
    console.log('\n' + c(col[level] + ';1', `== ${level.toUpperCase()} (${items.length}) ==`));
    for (const it of items) {
      const where = it.file ? ` ${it.file}${it.line ? ':' + it.line : ''}` : '';
      console.log(`${c(col[level], ICON[level])} [${it.id}]${where}\n         ${it.message}` + (it.fix ? `\n         -> ${it.fix}` : ''));
    }
  }
}
