// Bake the existing mobile layers into one opaque image, using the same scene
// coordinates and color filter as hero.module.css. No new artwork is generated.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public/optimized/hero');
await mkdir(output, { recursive: true });
const background = await readFile(join(root, 'public/hero-bg.png'));
const model = await readFile(join(root, 'public/home-models.png'));
const scale = 2, width = 960, height = 941;
const modelHeight = height * .86, modelWidth = modelHeight * 1086 / 1448;
const top = height * .92 - modelHeight + modelHeight * 15 / 1448;
const shadow = Buffer.from(`<svg width="${width * scale}" height="${height * scale}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="blur"><feGaussianBlur stdDeviation="24"/></filter></defs><ellipse cx="${width * scale / 2}" cy="${height * .92 * scale}" rx="${modelWidth * .58 * scale / 2}" ry="${modelHeight * .03 * scale / 2}" fill="#080a0b" opacity=".25" filter="url(#blur)"/></svg>`);
const layers = await sharp(background).extract({ left: 356, top: 0, width, height })
  .resize(width * scale, height * scale)
  .composite([
    { input: shadow },
    { input: await sharp(model).resize(Math.round(modelWidth * scale), Math.round(modelHeight * scale)).toBuffer(),
      left: Math.round((width - modelWidth) * scale / 2), top: Math.round(top * scale) },
  ]).png().toBuffer();
// CSS saturate(.73) and brightness(.62), applied in sRGB after compositing.
const graded = await sharp(layers).recomb([
  [.78751, .19305, .01944], [.05751, .92305, .01944], [.05751, .19305, .74944],
]).linear(.62).removeAlpha().png().toBuffer();
const revision = createHash('sha256').update(graded).update('avif50-webp80-v1').digest('hex').slice(0, 12);
const sources = { avif: [], webp: [] };
for (const size of [640, 960, 1280]) {
  for (const format of ['avif', 'webp']) {
    const name = `home-mobile.${revision}.${size}.${format}`;
    await sharp(graded).resize({ width: size })[format]({ quality: format === 'avif' ? 50 : 80 }).toFile(join(output, name));
    sources[format].push(`/optimized/hero/${name} ${size}w`);
  }
}
await writeFile(join(root, 'lib/mobile-hero-manifest.json'), JSON.stringify({
  width, height, src: `/optimized/hero/home-mobile.${revision}.1280.webp`,
  avif: sources.avif.join(', '), webp: sources.webp.join(', '),
}, null, 2) + '\n');
console.log('Prepared the mobile home scene at 640, 960 and 1280px.');
