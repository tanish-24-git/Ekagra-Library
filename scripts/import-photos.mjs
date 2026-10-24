// Import the library's own photos into the gallery.
//
//   1. Put original photos (jpg, png, webp, heic) in photos-inbox/
//   2. npm run photos:import
//   3. Add entries for the new files in src/content/gallery.ts
//
// Photos are rotated upright, resized to at most 2400px wide, saved as JPEG
// in public/images/gallery/, and stripped of EXIF data (including GPS).
// A manifest with each file's size is written to src/content/gallery-photos.json.

import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { extname, basename, join } from "node:path";
import sharp from "sharp";

const INBOX = "photos-inbox";
const OUT = "public/images/gallery";
const MANIFEST = "src/content/gallery-photos.json";

if (!existsSync(INBOX)) {
  mkdirSync(INBOX);
  console.log(`Created ${INBOX}/. Put photos in it and run this again.`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const slugify = (name) =>
  name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";

const files = readdirSync(INBOX).filter((f) => /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(extname(f)));
const manifest = [];
const used = new Set();

for (const file of files) {
  let slug = slugify(basename(file));
  for (let n = 2; used.has(slug); n++) slug = `${slugify(basename(file))}-${n}`;
  used.add(slug);

  const info = await sharp(join(INBOX, file))
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(OUT, `${slug}.jpg`));

  manifest.push({ file, src: `/images/gallery/${slug}.jpg`, width: info.width, height: info.height });
  console.log(`${file} -> ${OUT}/${slug}.jpg (${info.width}x${info.height})`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nImported ${manifest.length} photos. Manifest: ${MANIFEST}`);
