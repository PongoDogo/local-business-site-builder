// FILE-xxx: what is (and is not) inside the deploy folder.
import path from 'node:path';
import { imageInfo } from '../lib/media.mjs';

const JUNK = [
  /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/i, /(^|\/)desktop\.ini$/i,
  /\.(bak|old|orig|save|swp|tmp|log|sql|psd|ai|sketch|fig|zip|tar|gz|7z|rar|map)$/i,
  /(^|\/)\.(git|svn|idea|vscode)(\/|$)/, /(^|\/)node_modules(\/|$)/, /(^|\/)\.env/i, /~$/,
];
const INTERNAL = [
  /\.(md|markdown|ts|tsx|sh|ps1|cjs)$/i, /(^|\/)package(-lock)?\.json$/i, /(^|\/)site-facts\.json$/i, /(^|\/)DESIGN\.md$/i,
  /(^|\/)\.htaccess\.off$/i,
];
const OK_TXT = new Set(['robots.txt', 'llms.txt', 'humans.txt', 'security.txt', 'ads.txt', '.well-known/security.txt']);

export function run(ctx) {
  const { F, files, fileSet } = ctx;

  for (const f of files) {
    if (JUNK.some((re) => re.test(f.rel))) {
      F.add('error', 'FILE-001', f.rel, 'Junk or private file inside the deploy folder: it would be uploaded and may be publicly downloadable.', 'Delete it (or move it outside the deploy folder).');
    } else if (INTERNAL.some((re) => re.test(f.rel))) {
      F.add('warn', 'FILE-002', f.rel, 'Internal/handoff/source file inside the deploy folder (docs, facts, scripts must live OUTSIDE the folder that is uploaded).', 'Move to docs/ next to the deploy folder.');
    } else if (/\.txt$/i.test(f.rel) && !OK_TXT.has(f.rel) && !/(^|\/)(OFL|LICENSE|LICENCE|COPYING)[^/]*\.txt$/i.test(f.rel)) {
      F.add('warn', 'FILE-003', f.rel, 'Unexpected .txt file in the deploy folder.', 'Remove it unless it is meant to be public.');
    }
    if (/[^\x21-\x7e]/.test(f.rel.replace(/\.vcf$/, '.vcf')) || /\s/.test(f.rel)) {
      F.add('warn', 'FILE-004', f.rel, 'File name has spaces or non-ASCII characters (URL-encoding and upload tools break on these).', 'Use lowercase ASCII letters, digits and hyphens.');
    }
    if (f.size === 0 && !/\.(gitkeep)$/.test(f.rel)) F.add('warn', 'FILE-005', f.rel, 'Empty (0 byte) file.', 'Delete or fill it.');
  }

  const gr = ctx.country === 'GR';
  const REQUIRED = [
    ['index.html', 'error'], ['404.html', 'error'], ['robots.txt', 'error'], ['sitemap.xml', 'error'],
    ['privacy.html', gr ? 'error' : 'warn'], ['favicon.ico', 'warn'], ['apple-touch-icon.png', 'warn'],
    ['site.webmanifest', 'warn'], ['llms.txt', 'info'],
  ];
  for (const [rel, level] of REQUIRED) {
    if (!fileSet.has(rel)) F.add(level, 'FILE-010', rel, `Missing ${rel}.`, 'Run scripts/scaffold.mjs or create it (see references/05-seo-schema-geo.md).');
  }

  // encoding
  const textual = [...ctx.pages.map((p) => ({ rel: p.rel, src: p.src, bom: p.bom })), ...ctx.css.map((c) => ({ rel: c.rel, src: c.src, bom: c.bom })), ...ctx.js.map((j) => ({ rel: j.rel, src: j.src, bom: j.bom }))];
  for (const t of textual) {
    const moji = (t.src.match(/(?:Î[\u0080-¿]|Ï[\u0080-¿]|Ã[\u0080-¿]|Â[ -¿]){2,}/g) || []).length;
    if (moji) F.add('error', 'ENC-001', t.rel, `Text looks double-encoded (mojibake, ${moji} spots such as "Î±Ï..."). The file was saved/decoded with the wrong charset.`, 'Re-save as UTF-8 and re-enter the Greek text.');
    if (t.src.includes('�')) F.add('error', 'ENC-002', t.rel, 'Contains U+FFFD replacement characters (lost text).', 'Restore the original text.');
  }
  for (const [name, t] of [['robots.txt', ctx.txt.robots], ['sitemap.xml', ctx.txt.sitemap], [ctx.htaccess?.rel, ctx.htaccess]]) {
    if (t?.bom) F.add(name?.includes('htaccess') ? 'error' : 'warn', 'ENC-003', name, 'File starts with a UTF-8 BOM' + (name?.includes('htaccess') ? ' (this can cause a 500 error on Apache/LiteSpeed).' : ' (some parsers reject it).'), 'Save as UTF-8 without BOM.');
  }

  // weights
  const sum = { html: 0, css: 0, js: 0, img: 0, font: 0 };
  for (const f of files) {
    const ext = path.extname(f.rel).toLowerCase();
    if (ext === '.html') sum.html += f.size;
    else if (ext === '.css') sum.css += f.size;
    else if (ext === '.js' || ext === '.mjs') sum.js += f.size;
    else if (['.woff2', '.woff', '.ttf', '.otf'].includes(ext)) sum.font += f.size;
    else if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico'].includes(ext)) {
      sum.img += f.size;
      const limit = /og-image|icon-512|maskable/.test(f.rel) ? 400e3 : 250e3;
      if (f.size > limit && ext !== '.svg') F.add('warn', 'PERF-001', f.rel, `Image is ${(f.size / 1024).toFixed(0)} KB (> ${(limit / 1024).toFixed(0)} KB).`, 'Resize to the displayed size and convert to WebP (scripts/images.mjs).');
      if (['.png', '.jpg', '.jpeg'].includes(ext) && f.size > 120e3 && !/og-image|icon|apple-touch/.test(f.rel)) F.add('info', 'PERF-002', f.rel, `${ext} photo of ${(f.size / 1024).toFixed(0)} KB: WebP is usually 30-60% smaller.`);
    }
  }
  for (const c of ctx.css) {
    if (c.size > 100e3) F.add('warn', 'PERF-003', c.rel, `CSS is ${(c.size / 1024).toFixed(0)} KB and render-blocking. Remove dead rules / minify.`, 'Run the dead-selector list from this audit and delete unused CSS.');
  }
  for (const j of ctx.js) if (j.size > 80e3) F.add('warn', 'PERF-004', j.rel, `JS is ${(j.size / 1024).toFixed(0)} KB (a local-business site rarely needs this much).`);
  if (sum.font > 160e3) F.add('warn', 'PERF-005', '', `Fonts total ${(sum.font / 1024).toFixed(0)} KB: subset (greek+latin only) and keep one variable font.`);
  F.add('info', 'PERF-000', '', `Weights: html ${(sum.html / 1024).toFixed(0)} KB · css ${(sum.css / 1024).toFixed(0)} KB · js ${(sum.js / 1024).toFixed(0)} KB · images ${(sum.img / 1024).toFixed(0)} KB · fonts ${(sum.font / 1024).toFixed(0)} KB`);
  return { imageInfo };
}
