// CSS-xxx: dead rules, undefined variables, motion gating, fonts (Greek), contrast pairs.
import { selectorClasses, parseHex, contrast } from '../lib/css.mjs';

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont', 'inherit']);

export function run(ctx) {
  const { F } = ctx;
  if (!ctx.css.length) { F.add('warn', 'CSS-000', '', 'No CSS file found.'); return; }

  const htmlClasses = new Set();
  for (const pg of ctx.pages) for (const e of pg.all) if (e.attrs.class) for (const c of e.attrs.class.split(/\s+/)) htmlClasses.add(c);
  const jsTokens = new Set(ctx.jsText.match(/[A-Za-z_][\w-]*/g) || []);

  const defined = new Map();
  const used = new Map();
  const classDefs = new Map();
  const faces = [];
  const rootVars = new Map();

  for (const c of ctx.css) {
    const p = c.parsed;
    for (const [cls, line] of selectorClasses(p.rules)) if (!classDefs.has(cls)) classDefs.set(cls, { file: c.rel, line });
    for (const r of p.rules) for (const d of r.decls) {
      if (d.prop.startsWith('--')) { defined.set(d.prop, c.rel); if (/^:root|^html$/.test(r.selector.trim())) rootVars.set(d.prop, d.value); }
      for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!used.has(m[1])) used.set(m[1], { file: c.rel, line: d.line, fallback: !!m[2] });
    }
    for (const a of p.atProperties) defined.set(a.name, c.rel);
    for (const k of p.keyframes) for (const m of (k.body || '').matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!used.has(m[1])) used.set(m[1], { file: c.rel, line: k.line, fallback: !!m[2] });
    for (const ff of p.fontFaces) {
      const fam = (ff.decls.find((d) => d.prop === 'font-family')?.value || '').replace(/["']/g, '').trim();
      const ur = ff.decls.find((d) => d.prop === 'unicode-range')?.value || '';
      faces.push({ family: fam, unicodeRange: ur, line: ff.line, file: c.rel });
    }
    for (const i of p.imports) F.add('warn', 'CSS-002', c.rel, `@import is render-blocking and serial: ${i.value.slice(0, 60)}`, 'Use <link> tags or inline into one file.', i.line);
  }

  // undefined custom properties
  for (const [name, u] of used) {
    if (!defined.has(name) && !u.fallback && !ctx.jsText.includes(name)) F.add('error', 'CSS-001', u.file, `var(${name}) is used but never defined (the declaration is silently ignored).`, '', u.line);
  }
  const unusedVars = [...defined.keys()].filter((k) => !used.has(k) && !ctx.jsText.includes(k) && !ctx.pages.some((p) => p.src.includes(k)));
  if (unusedVars.length) F.add('info', 'CSS-003', '', `${unusedVars.length} custom properties are defined but never used: ${unusedVars.slice(0, 12).join(', ')}${unusedVars.length > 12 ? ' ...' : ''} (leftovers from a removed feature?)`);

  // dead selectors
  const dead = [...classDefs].filter(([c]) => !htmlClasses.has(c) && !jsTokens.has(c));
  if (dead.length) F.add('info', 'CSS-004', dead[0][1].file, `${dead.length} CSS classes match nothing in any page or script: ${dead.slice(0, 25).map(([c]) => '.' + c).join(' ')}${dead.length > 25 ? ' ...' : ''}. Delete them (dead CSS is render-blocking weight). If JS builds class names dynamically, double-check first.`);
  // classes in HTML without a rule are usually harmless structural hooks; only near-misses of real classes are likely typos
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  for (const c of htmlClasses) {
    if (!c || c.length < 5 || classDefs.has(c) || jsTokens.has(c)) continue;
    const near = [...classDefs.keys()].find((k) => Math.abs(k.length - c.length) <= 2 && lev(k, c) <= 2
      && !k.startsWith(c) && !c.startsWith(k) && k + 's' !== c && c + 's' !== k);   // plurals / BEM parents are structural wrappers, not typos
    if (near) F.add('warn', 'CSS-005', '', `class="${c}" has no CSS rule but ".${near}" does: typo?`);
  }

  // reduced motion
  const keyframes = ctx.css.reduce((n, c) => n + c.parsed.keyframes.length, 0);
  const allSrc = ctx.cssText;
  const hasPRM = /prefers-reduced-motion/.test(allSrc);
  if (keyframes && !hasPRM) F.add('warn', 'CSS-010', '', 'Animations exist but there is no prefers-reduced-motion handling (accessibility: vestibular disorders; also battery).');
  if (keyframes && hasPRM) {
    const hasReduceOverride = /prefers-reduced-motion:\s*reduce/.test(allSrc);
    for (const c of ctx.css) for (const r of c.parsed.rules) for (const d of r.decls) {
      if (!/^(animation|animation-name)$/.test(d.prop) || /^(none|initial|unset)\b/.test(d.value)) continue;
      const ok = r.chain.some((x) => /prefers-reduced-motion:\s*no-preference/.test(x)) || (hasReduceOverride && r.chain.some((x) => /prefers-reduced-motion:\s*reduce/.test(x)));
      if (!ok && !hasReduceOverride) F.add('warn', 'CSS-011', c.rel, `Animation on "${r.selector.slice(0, 40)}" runs even when the visitor asked for reduced motion.`, 'Wrap animations in @media (prefers-reduced-motion: no-preference).', d.line);
    }
  }
  for (const c of ctx.css) for (const r of c.parsed.rules) for (const d of r.decls) {
    if (d.prop === 'scroll-behavior' && /smooth/.test(d.value) && !r.chain.some((x) => /no-preference/.test(x))) F.add('warn', 'CSS-012', c.rel, 'scroll-behavior: smooth outside a no-preference media query.', '', d.line);
  }
  // SMIL (<animate>, <animateMotion>) ignores CSS media queries: it must be hidden by default and enabled under no-preference
  for (const pg of ctx.pages) {
    const smil = pg.all.filter((e) => /^(animate|animatemotion|animatetransform|set)$/.test(e.name));
    const parents = new Set(smil.map((e) => e.parent).filter((p) => p && p.type === 'el'));
    for (const par of parents) {
      const cls = (par.attrs.class || '').split(/\s+/)[0];
      const hiddenByDefault = cls && ctx.css.some((c) => c.parsed.rules.some((r) => r.chain.length === 0 && r.selector.includes('.' + cls) && r.decls.some((d) => d.prop === 'display' && /none/.test(d.value))));
      if (!hiddenByDefault) { F.add('warn', 'CSS-013', pg.rel, `SMIL animation inside <${par.name}${cls ? ' class="' + cls + '"' : ''}> ignores prefers-reduced-motion. Hide it by default (display:none) and reveal it inside @media (prefers-reduced-motion: no-preference).`); break; }
    }
  }

  // fonts
  const body = ctx.css.flatMap((c) => c.parsed.rules).find((r) => /^body$/.test(r.selector.trim()) && r.decls.some((d) => d.prop === 'font-family'));
  let famDecl = body?.decls.find((d) => d.prop === 'font-family')?.value || '';
  const vm = famDecl.match(/var\(\s*(--[\w-]+)/);
  if (vm && rootVars.has(vm[1])) famDecl = rootVars.get(vm[1]);
  const first = (famDecl.split(',')[0] || '').replace(/["']/g, '').trim();
  if (first && !GENERIC.has(first.toLowerCase())) {
    const mine = faces.filter((f) => f.family.toLowerCase() === first.toLowerCase());
    if (!mine.length) F.add('warn', 'CSS-020', '', `The main font "${first}" has no @font-face in the CSS: visitors without it installed see a system font (and your design is not what you tested).`, 'Self-host the font (woff2) and declare it.');
    else if ((ctx.home?.lang || '') === 'el') {
      const greek = mine.some((f) => !f.unicodeRange || /U\+0?37|U\+03[0-9a-f]{2}|0370|03FF/i.test(f.unicodeRange));
      if (!greek) F.add('error', 'CSS-021', mine[0].file, `Font "${first}" has no face covering Greek (unicode-range lacks U+0370-03FF): Greek text will fall back to another font.`, 'Subset greek + latin (scripts/font_greek_check.mjs).', mine[0].line);
    }
  }
  if (faces.some((f) => !ctx.css.some((c) => /font-display\s*:\s*(swap|optional|fallback)/.test(c.src)))) F.add('info', 'CSS-022', '', '@font-face without font-display: swap.');

  // contrast pairs declared in the facts
  const pairs = ctx.facts?.design?.contrast_pairs;
  if (Array.isArray(pairs)) {
    for (const [fg, bg, min] of pairs) {
      const a = parseHex(rootVars.get(fg) || fg);
      const b = parseHex(rootVars.get(bg) || bg);
      if (!a || !b) { F.add('warn', 'CSS-030', '', `Contrast pair ${fg} / ${bg}: cannot resolve a hex colour (declare both in :root as #rrggbb).`); continue; }
      const ratio = contrast(a, b);
      const need = min || 4.5;
      if (ratio < need) F.add('error', 'CSS-031', '', `Contrast ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (< ${need}:1 WCAG AA).`, 'Darken the text or lighten the background.');
    }
  } else {
    F.add('info', 'CSS-032', '', 'No design.contrast_pairs in site-facts.json: declare the text/background token pairs (e.g. ["--color-text","--color-paper"]) so contrast is verified.');
  }
  const imp = ctx.css.reduce((n, c) => n + (c.src.match(/!important/g) || []).length, 0);
  if (imp > 8) F.add('info', 'CSS-040', '', `${imp} uses of !important (specificity fights; the original project needed only 2).`);
}
