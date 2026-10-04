import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { loadDb, type Db, type EvidenceItem } from '../src/index';

export const PATTERN_DIR = join(__dirname, '..', '..', '..', 'patterns', 'in');

/** Files in the pattern folder that hold other data, not scam patterns. */
export const NON_PATTERN_FILES = ['brands.yaml', 'official-sources.yaml', 'anatomy.yaml'];

/** Loads the real pattern files from the repo, the same way the build script does. */
export function realDb(): Db {
  const read = (f: string) => parse(readFileSync(join(PATTERN_DIR, f), 'utf8'));
  const patterns = readdirSync(PATTERN_DIR)
    .filter((f) => f.endsWith('.yaml') && !NON_PATTERN_FILES.includes(f))
    .map((f) => ({ ...read(f), _file: f.replace('.yaml', '') }));
  return loadDb({
    patterns,
    brands: read('brands.yaml'),
    official: read('official-sources.yaml'),
    anatomy: read('anatomy.yaml'),
  });
}

export function web(title: string, snippet: string, link: string, source: EvidenceItem['source'] = 'search'): EvidenceItem {
  return { source, title, snippet, link, site: new URL(link).hostname.replace(/^www\./, '') };
}
