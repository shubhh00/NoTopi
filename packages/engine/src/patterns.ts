import { findPhrase, normalizeText } from './normalize';

export interface Pattern {
  id: string;
  name: string;
  summary: string;
  points: number;
  phrases: { strong: string[]; weak: string[] };
  min_weak: number;
  news_query: string;
  advice: { verdict: string; steps: string[]; helplines: string[] };
  sources: string[];
}

export interface PatternMatch {
  pattern: Pattern;
  /** Phrases found, in the original wording from the pattern file. */
  strong: string[];
  weak: string[];
}

export class PatternError extends Error {}

function stringList(v: unknown, field: string, id: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x.trim())) {
    throw new PatternError(`${id}: "${field}" must be a list of non-empty strings`);
  }
  return v as string[];
}

function str(v: unknown, field: string, id: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new PatternError(`${id}: "${field}" is required`);
  return v;
}

/** Checks one parsed pattern file and returns it typed. Throws PatternError with a readable message. */
export function validatePattern(raw: unknown, expectedId?: string): Pattern {
  if (!raw || typeof raw !== 'object') throw new PatternError(`${expectedId ?? '?'}: not an object`);
  const o = raw as Record<string, unknown>;
  const id = str(o.id, 'id', expectedId ?? '?');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new PatternError(`${id}: id must be kebab-case`);
  if (expectedId && id !== expectedId) throw new PatternError(`${expectedId}: id "${id}" must match the file name`);

  const points = o.points;
  if (typeof points !== 'number' || points < 10 || points > 40) {
    throw new PatternError(`${id}: "points" must be a number from 10 to 40`);
  }

  const phrases = (o.phrases ?? {}) as Record<string, unknown>;
  const strong = stringList(phrases.strong ?? [], 'phrases.strong', id);
  const weak = stringList(phrases.weak ?? [], 'phrases.weak', id);
  if (strong.length === 0) throw new PatternError(`${id}: needs at least one strong phrase`);

  const minWeak = o.min_weak;
  if (typeof minWeak !== 'number' || !Number.isInteger(minWeak) || minWeak < 2) {
    throw new PatternError(`${id}: "min_weak" must be a whole number of at least 2`);
  }
  if (minWeak > weak.length) throw new PatternError(`${id}: "min_weak" is larger than the weak phrase list`);

  const advice = (o.advice ?? {}) as Record<string, unknown>;
  const sources = stringList(o.sources, 'sources', id);
  if (sources.length === 0 || sources.some((s) => !/^https:\/\//.test(s))) {
    throw new PatternError(`${id}: "sources" needs at least one https link`);
  }

  return {
    id,
    name: str(o.name, 'name', id),
    summary: str(o.summary, 'summary', id),
    points,
    phrases: { strong, weak },
    min_weak: minWeak,
    news_query: str(o.news_query, 'news_query', id),
    advice: {
      verdict: str(advice.verdict, 'advice.verdict', id),
      steps: stringList(advice.steps, 'advice.steps', id),
      helplines: stringList(advice.helplines ?? [], 'advice.helplines', id),
    },
    sources,
  };
}

/** Matches when any strong phrase appears, or at least `min_weak` weak phrases do. */
export function matchPattern(text: string, pattern: Pattern): PatternMatch | null {
  const norm = normalizeText(text);
  const found = (list: string[]) => list.filter((p) => findPhrase(norm, normalizeText(p)) !== -1);
  const strong = found(pattern.phrases.strong);
  const weak = found(pattern.phrases.weak);
  if (strong.length > 0 || weak.length >= pattern.min_weak) return { pattern, strong, weak };
  return null;
}

/** All matching patterns, best first: more strong phrases, then more weak ones. */
export function matchPatterns(text: string, patterns: Pattern[]): PatternMatch[] {
  return patterns
    .map((p) => matchPattern(text, p))
    .filter((m): m is PatternMatch => m !== null)
    .sort((a, b) => b.strong.length - a.strong.length || b.weak.length - a.weak.length);
}
