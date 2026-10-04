import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDb, matchPattern } from '../src/index';
import { NON_PATTERN_FILES, PATTERN_DIR, realDb } from './helpers';

describe('pattern database', () => {
  it('every file is valid and its id matches the file name', () => {
    const db = realDb(); // throws with a readable message if any file is wrong
    const files = readdirSync(PATTERN_DIR).filter((f) => f.endsWith('.yaml') && !NON_PATTERN_FILES.includes(f));
    expect(db.patterns).toHaveLength(files.length);
  });

  it('the built file the app bundles is up to date and loads', () => {
    // The app crashes on start if patterns/dist/in.json is stale, so catch that here instead.
    const dist = JSON.parse(readFileSync(join(PATTERN_DIR, '..', 'dist', 'in.json'), 'utf8'));
    const fromDist = loadDb(dist);
    const fromYaml = realDb();
    expect(fromDist.patterns.map((p) => p.id).sort()).toEqual(fromYaml.patterns.map((p) => p.id).sort());
    expect(fromDist.anatomy).toEqual(fromYaml.anatomy);
    expect(fromDist.official).toEqual(fromYaml.official);
  });

  it('no strong phrase matches an ordinary message', () => {
    const ordinary = [
      'Hey, are we still meeting for lunch tomorrow at 1?',
      'Your Swiggy order is on the way. Track it in the app.',
      'Happy birthday! Have a great year ahead.',
      'Meeting moved to 4 pm, please join the Google Meet link in the invite.',
      'Your electricity bill of Rs 1,240 has been generated. Pay by 15 Oct on the official app.',
      'Dear sir, please contact the officer regarding your documents tomorrow.',
      'Sir, I have shared the documents on WhatsApp. Please check the app.',
    ];
    for (const p of realDb().patterns) {
      for (const msg of ordinary) {
        expect(matchPattern(msg, p), `${p.id} matched: "${msg}"`).toBeNull();
      }
    }
  });
});
