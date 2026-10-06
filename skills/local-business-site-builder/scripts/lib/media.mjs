// Read pixel dimensions from PNG / JPEG / WebP / GIF / ICO headers without any library.
import fs from 'node:fs';

export function imageInfo(file) {
  let buf;
  try { buf = fs.readFileSync(file); } catch { return null; }
  return imageInfoFromBuffer(buf);
}

export function imageInfoFromBuffer(buf) {
  if (!buf || buf.length < 12) return null;
  // PNG
  if (buf.readUInt32BE(0) === 0x89504e47) return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') return { type: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { type: 'jpeg', width: 0, height: 0 };
  }
  // WebP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') return { type: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { type: 'webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (fmt === 'VP8X') return { type: 'webp', width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1, height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1 };
    return { type: 'webp', width: 0, height: 0 };
  }
  // ICO: header + entries
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const count = buf.readUInt16LE(4);
    const sizes = [];
    for (let k = 0; k < count && 6 + k * 16 + 16 <= buf.length; k++) {
      const w = buf[6 + k * 16] || 256;
      const h = buf[7 + k * 16] || 256;
      sizes.push(`${w}x${h}`);
    }
    return { type: 'ico', width: 0, height: 0, sizes };
  }
  // SVG (text)
  const head = buf.toString('utf8', 0, Math.min(buf.length, 400));
  if (/<svg[\s>]/i.test(head)) return { type: 'svg', width: 0, height: 0 };
  return null;
}
