// Bakes the raster icons Next cannot serve straight from SVG.
//
//   app/icon.svg      -> served as-is (not built here)
//   app/icon.png      <- app/icon.svg (rounded, browser tab)
//   app/favicon.ico   <- app/icon.svg (rounded, 16 + 32)
//   app/apple-icon.png<- assets/icons/apple-icon.svg (square, iOS masks it)
//
// Run after editing either source SVG: npm run gen-icons
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = (p) => resolve(root, p);

// High density first, then downscale — rasterising straight at 16px turns the
// 0.14-wide grid strokes into mud.
const render = (svg, size) =>
  sharp(svg, { density: 512 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/**
 * Wraps PNGs in an ICO container. The format also allows BMP payloads, but PNG
 * ones are smaller and every browser since IE11 reads them.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const dirSize = 16 * images.length;
  let offset = header.length + dirSize;

  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    // 0 means 256 in this field; nothing here is that large, but be explicit.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size, 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const roundedSvg = await readFile(at("app/icon.svg"));
const squareSvg = await readFile(at("assets/icons/apple-icon.svg"));

const appleIcon = await render(squareSvg, 180); // what iOS asks for
const iconPng = await render(roundedSvg, 192); // link-tag fallback where SVG is unsupported
const ico = buildIco([
  { size: 16, data: await render(roundedSvg, 16) },
  { size: 32, data: await render(roundedSvg, 32) },
]);

await writeFile(at("app/apple-icon.png"), appleIcon);
await writeFile(at("app/icon.png"), iconPng);
await writeFile(at("app/favicon.ico"), ico);

console.log(`apple-icon.png 180  ${appleIcon.length} B`);
console.log(`icon.png      192  ${iconPng.length} B`);
console.log(`favicon.ico   16+32 ${ico.length} B`);
