// Tiny forgiving HTML parser (no dependencies). Good enough for hand-written static sites:
// builds an element tree with source offsets, keeps <script>/<style> bodies raw, records comments.
import { decodeEntities } from './util.mjs';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);

export function parseHtml(src) {
  const root = { type: 'root', name: '#root', attrs: {}, children: [], parent: null, start: 0 };
  const comments = [];
  let doctype = null;
  let cur = root;
  let i = 0;
  const n = src.length;
  const pushText = (a, b) => { if (b > a) cur.children.push({ type: 'text', value: src.slice(a, b), start: a, parent: cur }); };

  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt === -1) { pushText(i, n); break; }
    pushText(i, lt);
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt + 4);
      comments.push({ start: lt, text: src.slice(lt + 4, e === -1 ? n : e) });
      i = e === -1 ? n : e + 3;
      continue;
    }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') {
      const e = src.indexOf('>', lt);
      const end = e === -1 ? n : e + 1;
      const raw = src.slice(lt, end);
      if (/^<!doctype/i.test(raw)) doctype = raw;
      i = end;
      continue;
    }
    if (src[lt + 1] === '/') {
      const e = src.indexOf('>', lt);
      const end = e === -1 ? n : e + 1;
      const name = src.slice(lt + 2, e === -1 ? n : e).trim().toLowerCase().split(/\s/)[0];
      let p = cur;
      while (p && p.type !== 'root' && p.name !== name) p = p.parent;
      if (p && p.type !== 'root') { p.end = end; cur = p.parent; }
      i = end;
      continue;
    }
    if (!/[a-zA-Z]/.test(src[lt + 1] || '')) { pushText(lt, lt + 1); i = lt + 1; continue; }

    // ---- open tag
    let j = lt + 1;
    while (j < n && /[^\s/>]/.test(src[j])) j++;
    const name = src.slice(lt + 1, j).toLowerCase();
    const attrs = {};
    let selfClose = false;
    while (j < n) {
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] === '>') { j++; break; }
      if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break; }
      if (src[j] === '/') { j++; continue; }
      let k = j;
      while (k < n && /[^\s=/>]/.test(src[k])) k++;
      const an = src.slice(j, k).toLowerCase();
      j = k;
      while (j < n && /\s/.test(src[j])) j++;
      let val = '';
      if (src[j] === '=') {
        j++;
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === '"' || src[j] === "'") {
          const q = src[j];
          const e = src.indexOf(q, j + 1);
          val = src.slice(j + 1, e === -1 ? n : e);
          j = e === -1 ? n : e + 1;
        } else {
          let e = j;
          while (e < n && /[^\s>]/.test(src[e])) e++;
          val = src.slice(j, e);
          j = e;
        }
      }
      if (an && !(an in attrs)) attrs[an] = val;
    }
    const el = { type: 'el', name, attrs, children: [], parent: cur, start: lt, end: j, selfClose };
    cur.children.push(el);
    if (RAW.has(name) && !selfClose) {
      const re = new RegExp('</' + name + '\\s*>', 'ig');
      re.lastIndex = j;
      const m = re.exec(src);
      el.raw = src.slice(j, m ? m.index : n);
      el.rawStart = j;
      j = m ? m.index + m[0].length : n;
      el.end = j;
      i = j;
      continue;
    }
    if (!VOID.has(name) && !selfClose) cur = el;
    i = j;
  }
  return { root, comments, doctype, src };
}

export function* iter(node) {
  for (const c of node.children || []) {
    yield c;
    if (c.type === 'el') yield* iter(c);
  }
}

export function els(root, name) {
  const out = [];
  for (const n of iter(root)) if (n.type === 'el' && (!name || n.name === name)) out.push(n);
  return out;
}

export function ancestors(node) {
  const out = [];
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) out.push(p);
  return out;
}

/** Text a reader would see inside node (no script/style/head); entities decoded. */
export function textOf(node, { skipHidden = false, skip = null } = {}) {
  let out = '';
  (function rec(n) {
    if (n.type === 'text') { out += n.value; return; }
    if (n.type !== 'el' && n.type !== 'root') return;
    if (['script', 'style', 'head', 'noscript', 'template'].includes(n.name)) return;
    if (skipHidden && ('hidden' in n.attrs)) return;
    if (skip && n.type === 'el' && skip(n)) return;
    if (n.name === 'br' || /^(p|div|li|h[1-6]|section|summary|details|figcaption|blockquote|tr|ul|ol)$/.test(n.name)) out += '\n';
    for (const c of n.children) rec(c);
    if (/^(p|div|li|h[1-6]|section|summary|details|figcaption|blockquote|tr)$/.test(n.name)) out += '\n';
  })(node);
  return decodeEntities(out).replace(/[ \t\f\r]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export function meta(root) {
  const byName = {};
  const byProp = {};
  for (const m of els(root, 'meta')) {
    if ('name' in m.attrs) (byName[m.attrs.name.toLowerCase()] ||= []).push(m);
    if ('property' in m.attrs) (byProp[m.attrs.property.toLowerCase()] ||= []).push(m);
  }
  return { byName, byProp };
}
