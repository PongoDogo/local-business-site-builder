// package_skill.mjs — zip a skill folder into <out>.skill (a plain ZIP with forward-slash paths, folder as top level).
//   deno run -A tools/package_skill.mjs src/local-business-site-builder dist/local-business-site-builder.skill
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg) { console.error('Usage: package_skill.mjs <skill-folder> <out.skill>'); process.exit(2); }
const root = path.resolve(srcArg);
const top = path.basename(root);
const SKIP = /(^|\/)(\.DS_Store|Thumbs\.db|node_modules|\.git|__pycache__)(\/|$)|\.(bak|log|map)$/;

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    const rel = path.relative(root, f).split(path.sep).join('/');
    if (SKIP.test(rel)) continue;
    if (e.isDirectory()) walk(f); else files.push({ f, rel });
  }
})(root);
files.sort((a, b) => a.rel.localeCompare(b.rel));

const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

const parts = [], central = [];
let offset = 0;
for (const { f, rel } of files) {
  const data = fs.readFileSync(f);
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const useDeflate = comp.length < data.length;
  const body = useDeflate ? comp : data;
  const name = Buffer.from(`${top}/${rel}`, 'utf8');
  const st = fs.statSync(f).mtime;
  const crc = crc32(data);
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDeflate ? 8 : 0, 8);
  lh.writeUInt16LE(dosTime(st), 10); lh.writeUInt16LE(dosDate(st), 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  parts.push(lh, name, body);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDeflate ? 8 : 0, 10);
  ch.writeUInt16LE(dosTime(st), 12); ch.writeUInt16LE(dosDate(st), 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
  central.push(ch, name);
  offset += lh.length + name.length + body.length;
}
const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10); eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
fs.mkdirSync(path.dirname(path.resolve(outArg)), { recursive: true });
fs.writeFileSync(outArg, Buffer.concat([...parts, cd, eocd]));
console.log(`wrote ${outArg}: ${files.length} files, ${(fs.statSync(outArg).size / 1024).toFixed(0)} KB (top folder "${top}/")`);
