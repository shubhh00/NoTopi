import Storage from 'expo-sqlite/kv-store';
import { getDeviceId, type Settings } from './settings';

export interface NewsArticle {
  title: string;
  source: string;
  link: string;
  date: string;
}

export interface TrendingScam {
  name: string;
  howItWorks: string;
  whatToDo: string;
  sources: NewsArticle[];
}

export interface TrendingReport {
  updatedAt: string;
  scams: TrendingScam[];
  headlines: NewsArticle[];
}

const KEY = 'trending';
const FRESH_MS = 3 * 60 * 60 * 1000;

/** The last report this phone saw, shown when the server can't be reached. */
export async function cachedTrending(): Promise<TrendingReport | null> {
  try {
    const hit = await Storage.getItem(KEY);
    return hit ? (JSON.parse(hit).report as TrendingReport) : null;
  } catch {
    return null;
  }
}

/**
 * This week's scams in the news, from the NoTopi server (it builds the report once a day for
 * everyone). Needs a server; with only a SerpApi key there's nothing to show.
 */
export async function fetchTrending(settings: Settings, force = false): Promise<TrendingReport | null> {
  if (!settings.serverUrl) return null;
  try {
    const hit = force ? null : await Storage.getItem(KEY);
    if (hit) {
      const { at, report } = JSON.parse(hit) as { at: number; report: TrendingReport };
      if (Date.now() - at < FRESH_MS) return report;
    }
    const res = await fetch(`${settings.serverUrl}/v1/trending`, { headers: { 'X-Device-Id': await getDeviceId() } });
    if (res.status !== 200) return await cachedTrending();
    const report = (await res.json()) as TrendingReport;
    await Storage.setItem(KEY, JSON.stringify({ at: Date.now(), report }));
    return report;
  } catch {
    // Offline or server down: show the last report rather than nothing.
    return cachedTrending();
  }
}

/** "Updated 3h ago" from the server's report time. */
export function updatedLabel(report: TrendingReport, now = Date.now()): string {
  const hours = Math.floor((now - Date.parse(report.updatedAt)) / 3_600_000);
  if (Number.isNaN(hours)) return '';
  if (hours < 1) return 'Updated just now';
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}
