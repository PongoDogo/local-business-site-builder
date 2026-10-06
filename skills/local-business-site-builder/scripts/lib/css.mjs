// Minimal CSS reader: enough to list selectors/declarations with their @media chain,
// custom properties, @font-face sources, and url() references. No dependencies.
import { lineIndex } from './util.mjs';

export function stripComments(css) {
  // keep newlines so line numbers stay valid
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Find next index of any char in `chars` at depth 0 (outside quotes/parens). */
function scan(css, pos, chars) {
  let depth = 0;
  let q = null;
  for (let i = pos; i < css.length; i++) {
    const ch = css[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0 && chars.includes(ch)) return i;
  }
  return -1;
}

const GROUP_AT = /^@(media|supports|layer|container|document|scope)\b/i;

export function parseCss(source) {
  const css = stripComments(source);
  const line = lineIndex(css);
  const result = { rules: [], fontFaces: [], keyframes: [], atProperties: [], imports: [], size: source.length };

  function parseDecls(body, offset) {
    const decls = [];
    let pos = 0;
    while (pos < body.length) {
      const end = scan(body, pos, ';');
      const chunk = body.slice(pos, end === -1 ? body.length : end);
      const colon = chunk.indexOf(':');
      if (colon > 0) {
        decls.push({
          prop: chunk.slice(0, colon).trim().toLowerCase(),
          value: chunk.slice(colon + 1).trim(),
          line: line(offset + pos + chunk.search(/\S|$/)),
        });
      }
      if (end === -1) break;
      pos = end + 1;
    }
    return decls;
  }

  function parseBlock(start, end, chain) {
    let pos = start;
    while (pos < end) {
      const stop = scan(css, pos, '{;}');
      if (stop === -1 || stop >= end) break;
      const prelude = css.slice(pos, stop).trim();
      if (css[stop] === ';') {
        if (/^@import\b/i.test(prelude)) result.imports.push({ value: prelude, line: line(pos) });
        pos = stop + 1;
        continue;
      }
      if (css[stop] === '}') { pos = stop + 1; continue; }
      // find matching }
      let depth = 1;
      let k = stop + 1;
      let q = null;
      while (k < end && depth > 0) {
        const ch = css[k];
        if (q) { if (ch === '\\') k++; else if (ch === q) q = null; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') depth--;
        k++;
      }
      const bodyStart = stop + 1;
      const bodyEnd = k - 1;
      if (prelude.startsWith('@')) {
        if (GROUP_AT.test(prelude)) parseBlock(bodyStart, bodyEnd, [...chain, prelude]);
        else if (/^@font-face/i.test(prelude)) result.fontFaces.push({ decls: parseDecls(css.slice(bodyStart, bodyEnd), bodyStart), line: line(pos) });
        else if (/^@(-\w+-)?keyframes/i.test(prelude)) result.keyframes.push({ name: prelude.replace(/^@(-\w+-)?keyframes\s+/i, '').trim(), line: line(pos), body: css.slice(bodyStart, bodyEnd) });
        else if (/^@property/i.test(prelude)) result.atProperties.push({ name: prelude.replace(/^@property\s+/i, '').trim(), line: line(pos) });
      } else {
        result.rules.push({ selector: prelude, decls: parseDecls(css.slice(bodyStart, bodyEnd), bodyStart), chain, line: line(pos) });
      }
      pos = k;
    }
  }
  parseBlock(0, css.length, []);
  return result;
}

/** All class names used in selectors (not in declarations). */
export function selectorClasses(rules) {
  const set = new Map();
  for (const r of rules) {
    const sel = r.selector.replace(/\[[^\]]*\]/g, '').replace(/::?[\w-]+\([^)]*\)/g, (m) => m); // keep :not(.x) args
    for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (!set.has(m[1])) set.set(m[1], r.line);
  }
  return set;
}

export function selectorIds(rules) {
  const set = new Map();
  for (const r of rules) for (const m of r.selector.matchAll(/#(-?[_a-zA-Z][\w-]*)/g)) if (!set.has(m[1])) set.set(m[1], r.line);
  return set;
}

/** url(...) targets in a declaration value, skipping data: and #fragment-only refs. */
export function urlsIn(value) {
  const out = [];
  for (const m of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
    const u = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (u && !u.startsWith('data:') && !u.startsWith('#')) out.push(u);
  }
  return out;
}

export function hasDataUrl(value) { return /url\(\s*["']?data:/i.test(value); }

// ------------------------------------------------------------ colour helpers
export function parseHex(hex) {
  const h = hex.trim().replace('#', '');
  if (![3, 4, 6, 8].includes(h.length) || /[^0-9a-f]/i.test(h)) return null;
  const f = h.length <= 4 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
export function luminance([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
