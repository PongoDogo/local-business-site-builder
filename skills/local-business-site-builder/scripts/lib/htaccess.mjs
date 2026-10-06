// Parse an Apache/LiteSpeed .htaccess: directives with their <IfModule> context, section balance,
// and every Content-Security-Policy header. Pure text analysis (nothing is executed).

export function parseHtaccess(text) {
  const raw = text.split(/\r?\n/);
  // join "\" line continuations
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    let l = raw[i];
    const startLine = i + 1;
    while (/\\\s*$/.test(l) && i + 1 < raw.length) { l = l.replace(/\\\s*$/, ' ') + raw[++i].trim(); }
    lines.push({ text: l.trim(), line: startLine });
  }
  const directives = [];
  const issues = [];
  const stack = [];
  for (const { text: line, line: ln } of lines) {
    if (!line || line.startsWith('#')) continue;
    let m;
    if ((m = line.match(/^<(IfModule|IfDefine|IfVersion|FilesMatch|Files|Directory|DirectoryMatch|Location|Limit|LimitExcept|RequireAny|RequireAll|RequireNone)\b\s*(.*?)>$/i))) {
      stack.push({ tag: m[1], arg: m[2], line: ln });
      continue;
    }
    if ((m = line.match(/^<\/(\w+)\s*>$/))) {
      const top = stack.pop();
      if (!top || top.tag.toLowerCase() !== m[1].toLowerCase()) issues.push({ line: ln, msg: `Unbalanced </${m[1]}>` });
      continue;
    }
    directives.push({
      name: line.split(/\s+/)[0],
      text: line,
      line: ln,
      ifModules: stack.filter((s) => /^ifmodule$/i.test(s.tag)).map((s) => s.arg.replace(/^!/, '')),
      ctx: stack.map((s) => `${s.tag} ${s.arg}`.trim()),
    });
  }
  for (const s of stack) issues.push({ line: s.line, msg: `Unclosed <${s.tag} ${s.arg}>` });
  // quote balance on Header lines (a stray quote is a classic 500)
  for (const d of directives) {
    if (/^Header\b/i.test(d.name)) {
      const quotes = (d.text.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2) issues.push({ line: d.line, msg: 'Odd number of double quotes in Header directive' });
    }
  }
  return { directives, issues };
}

/** Return [{ name, reportOnly, value, line }] for each CSP header set in the file. */
export function cspHeaders(parsed) {
  const out = [];
  for (const d of parsed.directives) {
    const m = d.text.match(/^Header\s+(?:always\s+)?(?:set|add|merge|append)\s+"?(Content-Security-Policy(-Report-Only)?)"?\s+"((?:[^"\\]|\\.)*)"/i);
    if (m) out.push({ name: m[1], reportOnly: !!m[2], value: m[3], line: d.line });
  }
  return out;
}

export function parseCsp(value) {
  const map = new Map();
  for (const part of value.split(';')) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    map.set(toks[0].toLowerCase(), toks.slice(1));
  }
  return map;
}

/** Does CSP allow loading `url` for `directive` (falls back to default-src)? */
export function cspAllows(csp, directive, url) {
  const toks = csp.get(directive) ?? csp.get('default-src');
  if (!toks) return true; // no policy for this directive
  if (toks.includes("'none'")) return false;
  if (/^(data|blob):/i.test(url)) return toks.includes(url.split(':')[0].toLowerCase() + ':');
  let u;
  try { u = new URL(url); } catch { return false; }
  for (const t of toks) {
    if (t === '*') return true;
    if (t === 'https:' && u.protocol === 'https:') return true;
    if (t === 'http:' && u.protocol === 'http:') return true;
    const m = t.match(/^(?:(https?):\/\/)?(\*\.)?([a-z0-9.-]+)(?::(\d+|\*))?(\/.*)?$/i);
    if (!m) continue;
    if (m[1] && m[1].toLowerCase() !== u.protocol.replace(':', '')) continue;
    const host = u.hostname.toLowerCase();
    const want = m[3].toLowerCase();
    if (m[2]) { if (host.endsWith('.' + want)) return true; }
    else if (host === want) return true;
  }
  return false;
}
