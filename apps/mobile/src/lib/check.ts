import {
  assess, classify, evidenceFromSerp, mergeEvidence, planQueries, preMatch,
  type Evidence, type SerpQuery, type Verdict,
} from '@notopi/engine';
import { db } from './db';
import { runQuery } from './serpapi';
import type { Settings } from './settings';

export interface CheckResult {
  verdict: Verdict;
  /** True when no searches ran (no key, or all failed), so only offline rules were used. */
  offline: boolean;
  failedQueries: number;
}

/** Plain-English line for the loading screen, e.g. "Searching Google News". */
export function describeQuery(q: SerpQuery): string {
  switch (q.purpose) {
    case 'web': return 'Searching the web for reports';
    case 'official': return 'Checking police and government warnings';
    case 'news': return 'Checking news and police advisories';
    case 'business': return 'Looking for a business listing on Maps';
    case 'official-number': return 'Finding the official number';
    case 'app': return 'Reading the Play Store listing';
    case 'app-reviews': return 'Reading Play Store reviews';
  }
}

export function planFor(raw: string): SerpQuery[] {
  const input = classify(raw);
  return planQueries(input, preMatch(input, db));
}

/**
 * The whole check: work out the input type, run the planned searches in parallel,
 * turn the results into evidence and score it with the engine.
 */
export async function runCheck(raw: string, settings: Settings, onQueryDone?: (q: SerpQuery) => void): Promise<CheckResult> {
  const input = classify(raw);
  const queries = planQueries(input, preMatch(input, db));
  const canSearch = Boolean(settings.serpApiKey || settings.serverUrl);

  const parts: Evidence[] = [];
  let failed = 0;
  if (canSearch) {
    const results = await Promise.allSettled(
      queries.map(async (q) => {
        const json = await runQuery(q, settings);
        onQueryDone?.(q);
        return evidenceFromSerp(q, json as Record<string, unknown>);
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') parts.push(r.value);
      else failed++;
    }
  }

  const evidence = mergeEvidence(parts);
  return {
    verdict: assess(input, evidence, db),
    offline: parts.length === 0,
    failedQueries: failed,
  };
}
