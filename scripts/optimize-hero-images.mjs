// Regenerate after changing a hero source: node scripts/optimize-hero-images.mjs
// Uses the sharp image processor installed with Next.js. Originals stay untouched.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { access, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public/optimized/hero');
await mkdir(output, { recursive: true });
const manifest = {};
for (const name of ['hero-bg', 'home-models', 'women', 'MenSection', 'newIn', 'shoes', 'accessories', 'sales']) {
  const source = await readFile(join(root, `public/${name}.png`));
  const { width, height } = await sharp(source).metadata();
  const revision = createHash('sha256').update(source).update('avif60-webp85-v1').digest('hex').slice(0, 12);
  const widths = [...new Set([360, 640, 800, 960, 1280, 1440, width].filter(value => value <= width))].sort((a,b) => a-b);
  const sources = { avif: [], webp: [] };
  for (const size of widths) {
    for (const format of ['avif', 'webp']) {
      const filename = `${name}.${revision}.${size}.${format}`;
      const path = join(output, filename);
      // The filename hashes the source and encoder settings, so existing variants
      // can be reused when adding responsive widths.
      if (!await access(path).then(() => true, () => false)) {
        await sharp(source).resize({ width: size, withoutEnlargement: true })[format]({ quality: format === 'avif' ? 60 : 85 }).toFile(path);
      }
      sources[format].push(`/optimized/hero/${filename} ${size}w`);
    }
  }
  manifest[name] = { width, height, avif: sources.avif.join(', '), webp: sources.webp.join(', '), src: `/optimized/hero/${name}.${revision}.${width}.webp` };
  console.log(`Prepared ${name}: ${widths.join(', ')}px AVIF/WebP`);
}
await writeFile(join(root, 'lib/hero-image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
