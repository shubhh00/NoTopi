// Converts patterns/<region>/*.yaml into patterns/dist/<region>.json, the file the app bundles
// and downloads from GitHub. With --check, fails if the JSON is out of date instead of writing it.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'patterns');
const check = process.argv.includes('--check');
let stale = false;

for (const region of readdirSync(root, { withFileTypes: true })) {
  if (!region.isDirectory() || region.name === 'dist') continue;
  const dir = join(root, region.name);
  const patterns = [];
  let brands = null;
  let official = null;
  let anatomy = null;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()) {
    const data = parse(readFileSync(join(dir, file), 'utf8'));
    if (file === 'brands.yaml') brands = data;
    else if (file === 'official-sources.yaml') official = data;
    else if (file === 'anatomy.yaml') anatomy = data;
    else patterns.push({ ...data, _file: basename(file, '.yaml') });
  }

  const json = JSON.stringify({ region: region.name, patterns, brands, official, anatomy }, null, 2) + '\n';
  const out = join(root, 'dist', `${region.name}.json`);

  if (check) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== json) {
      console.error(`patterns/dist/${region.name}.json is out of date. Run: npm run patterns:build`);
      stale = true;
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, json);
    console.log(`wrote patterns/dist/${region.name}.json (${patterns.length} patterns)`);
  }
}

if (stale) process.exit(1);
