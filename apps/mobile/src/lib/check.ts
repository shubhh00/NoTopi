import {
  assess, classify, evidenceFromSerp, mergeEvidence, searchPlan,
  type Evidence, type SerpQuery, type Verdict,
} from '@notopi/engine';
import { db } from './db';
import { runQuery } from './serpapi';
import type { Settings } from './settings';

/**
 * How the web was used for a check:
 * - searched: at least one search came back
 * - not-needed: the message was a clear scam from its wording, so no credits were spent
 * - no-key: no SerpApi key or server set, so only offline rules ran
 * - failed: searches were planned but none came back (server down, network, quota)
 */
export type SearchStatus = 'searched' | 'not-needed' | 'no-key' | 'failed';

export interface CheckResult {
  verdict: Verdict;
  search: SearchStatus;
  /** The first error message when searches failed, to show the user. */
  searchError?: string;
}

/** Plain-English line for the loading screen, e.g. "Searching the web for reports". */
export function describeQuery(q: SerpQuery): string {
  switch (q.purpose) {
    case 'web': return 'Searching the web for reports';
    case 'official': return 'Checking police and government warnings';
    case 'official-number': return 'Finding the official number';
    case 'app': return 'Reading the Play Store listing';
    case 'app-reviews': return 'Reading Play Store reviews';
  }
}

export function planFor(raw: string): SerpQuery[] {
  return searchPlan(classify(raw), db);
}

/**
 * The whole check: work out the input type, run the planned searches in parallel,
 * turn the results into evidence and score it with the engine.
 */
export async function runCheck(raw: string, settings: Settings, onQueryDone?: (q: SerpQuery) => void): Promise<CheckResult> {
  const input = classify(raw);
  const queries = searchPlan(input, db);
  const offline = (search: SearchStatus, searchError?: string): CheckResult => ({
    verdict: assess(input, { searched: [], items: [] }, db),
    search,
    searchError,
  });

  if (queries.length === 0) return offline('not-needed');
  if (!settings.serpApiKey && !settings.serverUrl) return offline('no-key');

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const json = await runQuery(q, settings);
      onQueryDone?.(q);
      return evidenceFromSerp(q, json as Record<string, unknown>);
    }),
  );
  const parts: Evidence[] = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  if (parts.length === 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;
    return offline('failed', firstError instanceof Error ? firstError.message : undefined);
  }

  return { verdict: assess(input, mergeEvidence(parts), db), search: 'searched' };
}
