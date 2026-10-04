import type { BrandDb } from './brands';
import { extractEntities } from './classify';
import { matchPatterns, type Pattern, type PatternMatch } from './patterns';
import type { Anatomy } from './anatomy';
import type { OfficialSources } from './official';
import { anatomySignals } from './rules/anatomy';
import { appSignals } from './rules/app';
import { officialSignals } from './rules/official';
import { MAX_RECEIPTS, SCAM_WORDS, itemText, itemsMentioning, receiptFor } from './rules/common';
import { phoneSignals } from './rules/phone';
import { textSignals } from './rules/text';
import { urlEvidenceSignals, urlShapeSignals } from './rules/url';
import type { CheckInput, Evidence, Signal, VerdictLevel } from './types';

export * from './types';
export { classify, extractEntities, normalizePhone } from './classify';
export { matchPattern, matchPatterns, validatePattern, PatternError, type Pattern, type PatternMatch } from './patterns';
export { validateBrands, type BrandDb } from './brands';
export { planQueries, type SerpQuery, type SerpEngine, type QueryPurpose } from './plan';
export { evidenceFromSerp, mergeEvidence } from './serp';
export { loadDb } from './db';
export { isOfficial, type OfficialSources } from './official';

export interface Db {
  patterns: Pattern[];
  brands: BrandDb;
  official: OfficialSources;
  anatomy: Anatomy;
}

export interface Verdict {
  level: VerdictLevel;
  /** 0–100. */
  score: number;
  /** Strongest first. */
  signals: Signal[];
  /** The scam this most looks like, if any. Drives the advice shown. */
  pattern?: PatternMatch;
  input: CheckInput;
}

export const SCAM_AT = 60;
export const SUSPICIOUS_AT = 30;

export function decide(signals: Signal[]): { level: VerdictLevel; score: number } {
  const total = signals.reduce((sum, s) => sum + s.points, 0);
  const score = Math.max(0, Math.min(100, total));
  if (score >= SCAM_AT) return { level: 'scam', score };
  if (score >= SUSPICIOUS_AT) return { level: 'suspicious', score };
  // "Clean" needs positive proof (an official domain, a business listing). No red flags alone isn't enough.
  return { level: signals.some((s) => s.points < 0) ? 'clean' : 'unknown', score };
}

/** Patterns that web reports about a number, link or app describe ("…caller said my parcel had drugs…"). */
function patternFromReports(ev: Evidence, patterns: Pattern[]): PatternMatch | undefined {
  const reports = itemsMentioning(ev.items, SCAM_WORDS).map(([i]) => i);
  if (reports.length === 0) return undefined;
  return matchPatterns(reports.map(itemText).join('\n'), patterns)[0];
}

/** Matches for a message before any searching, so `planQueries` can look up news for the right scam. */
export function preMatch(input: CheckInput, db: Db): PatternMatch[] {
  return input.kind === 'text' ? matchPatterns(input.value, db.patterns) : [];
}

export function assess(input: CheckInput, evidence: Evidence, db: Db, now: Date = new Date()): Verdict {
  let signals: Signal[] = [];
  let pattern: PatternMatch | undefined;

  switch (input.kind) {
    case 'phone':
      signals = phoneSignals(input, evidence);
      break;
    case 'url':
      signals = [...urlShapeSignals(input.value, db.brands), ...urlEvidenceSignals(input.value, evidence)];
      break;
    case 'app':
      signals = appSignals(input, evidence, now);
      break;
    case 'text': {
      const matches = matchPatterns(input.value, db.patterns);
      pattern = matches[0];
      // The script match names known scams; the anatomy catches ones nobody has written up yet.
      signals = [...textSignals(input.value, matches, evidence), ...anatomySignals(input.value, db.anatomy)];
      const entities = extractEntities(input.value);
      const lower = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
      // Links inside the message are checked too: "sbi-kyc.xyz" is a red flag even without searching.
      for (const url of entities.urls) {
        for (const s of urlShapeSignals(url, db.brands)) {
          if (s.points > 0) signals.push({ ...s, id: `text.${s.id}`, label: `Link in message: ${lower(s.label)}` });
        }
      }
      // So is the number it asks you to call, against the web reports and police warnings found for it.
      const phone = entities.phones[0];
      if (phone) {
        const phoneInput: CheckInput = { kind: 'phone', raw: phone, value: phone };
        for (const s of [...phoneSignals(phoneInput, evidence), ...officialSignals(phoneInput, evidence, db.official)]) {
          if (s.points > 0) signals.push({ ...s, id: `text.${s.id}`, label: `Number in message: ${lower(s.label)}` });
        }
      }
      break;
    }
  }

  if (!pattern && input.kind !== 'text') {
    pattern = patternFromReports(evidence, db.patterns);
    if (pattern) {
      const reports = itemsMentioning(evidence.items, pattern.strong.length ? pattern.strong : pattern.weak);
      signals.push({
        id: `reports.pattern.${pattern.pattern.id}`,
        label: `Reports describe the "${pattern.pattern.name}" scam`,
        points: 15,
        receipts: reports.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
      });
    }
  }

  signals.push(...officialSignals(input, evidence, db.official, pattern));

  signals.sort((a, b) => b.points - a.points);
  return { ...decide(signals), signals, pattern, input };
}
