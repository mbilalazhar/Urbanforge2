// Run when changing testimonial portraits, never as part of the production build.
// Requires curl and the sharp image processor installed with Next.js.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const run = promisify(execFile);
const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('testimonial-image-sources.json', import.meta.url), 'utf8'));
const directory = new URL('public/optimized/testimonials/', root);
await mkdir(directory, { recursive: true });
const entries = await Promise.all(sources.map(async ({ name, url }) => {
  const source = new URL(url);
  source.searchParams.set('w', '320');
  const { stdout } = await run('curl', ['-fLsS', '--retry', '2', '--connect-timeout', '10', '--max-time', '30', source.href], { encoding: 'buffer', maxBuffer: 5 * 1024 * 1024 });
  const image = await sharp(stdout).resize({ width: 320, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  const hash = createHash('sha256').update(image).digest('hex').slice(0, 12);
  const filename = `${source.pathname.slice(1)}.${hash}.webp`;
  await writeFile(new URL(filename, directory), image);
  console.log(`Prepared ${name}: ${image.length} bytes`);
  return [name, `/optimized/testimonials/${filename}`];
}));
// Publish references only once every original portrait has been downloaded.
await writeFile(new URL('lib/testimonial-image-manifest.json', root), JSON.stringify(Object.fromEntries(entries), null, 2) + '\n');
