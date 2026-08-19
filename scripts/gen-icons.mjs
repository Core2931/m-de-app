// Rasterises assets/icons/apple-icon.svg -> app/apple-icon.png.
//
// Next serves app/icon.svg directly, but the apple-icon convention only accepts
// jpg/jpeg/png, so this one has to be baked. Run after editing the source SVG.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 180; // what iOS asks for on modern devices

const svg = await readFile(resolve(root, "assets/icons/apple-icon.svg"));
const png = await sharp(svg, { density: 384 })
  .resize(SIZE, SIZE)
  .png({ compressionLevel: 9 })
  .toBuffer();

const out = resolve(root, "app/apple-icon.png");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, png);
console.log(`apple-icon.png ${SIZE}x${SIZE} — ${png.length} bytes`);
