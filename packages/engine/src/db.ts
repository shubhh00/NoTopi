import { validateAnatomy } from './anatomy';
import { validateBrands } from './brands';
import { validateOfficial } from './official';
import { validatePattern } from './patterns';
import type { Db } from './index';

/** Validates the JSON built by scripts/build-patterns.mjs (bundled, or freshly downloaded from GitHub). */
export function loadDb(json: unknown): Db {
  const o = (json ?? {}) as {
    patterns?: Array<Record<string, unknown>>;
    brands?: unknown;
    official?: unknown;
    anatomy?: unknown;
  };
  if (!Array.isArray(o.patterns)) throw new Error('pattern db: "patterns" missing');
  const patterns = o.patterns.map((p) => validatePattern(p, typeof p._file === 'string' ? p._file : undefined));
  const ids = new Set<string>();
  for (const p of patterns) {
    if (ids.has(p.id)) throw new Error(`pattern db: duplicate id "${p.id}"`);
    ids.add(p.id);
  }
  return {
    patterns,
    brands: validateBrands(o.brands),
    official: validateOfficial(o.official),
    anatomy: validateAnatomy(o.anatomy),
  };
}
