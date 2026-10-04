import type { SerpQuery } from '@notopi/engine';
import Storage from 'expo-sqlite/kv-store';
import { getDeviceId, type Settings } from './settings';

const TIMEOUT_MS = 20_000;

// Searches cost credits (250 a month on the free SerpApi plan), so results are kept on the
// phone for a day: checking the same thing again, or a message that shares its number with an
// earlier check, costs nothing.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 60;
const CACHE_INDEX = 'serp-cache-index';

function cacheKey(query: SerpQuery): string {
  const params = Object.keys(query.params).sort().map((k) => `${k}=${query.params[k]}`).join('&');
  return `serp:${query.engine}?${params}`;
}

async function readCache(key: string): Promise<unknown | undefined> {
  try {
    const hit = await Storage.getItem(key);
    if (!hit) return undefined;
    const { at, body } = JSON.parse(hit) as { at: number; body: unknown };
    return Date.now() - at < CACHE_TTL_MS ? body : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(key: string, body: unknown): Promise<void> {
  try {
    await Storage.setItem(key, JSON.stringify({ at: Date.now(), body }));
    // Keep the newest entries only, so the cache can't grow without limit.
    const index: string[] = JSON.parse((await Storage.getItem(CACHE_INDEX)) ?? '[]');
    const next = [key, ...index.filter((k) => k !== key)];
    for (const old of next.slice(CACHE_MAX)) await Storage.removeItem(old);
    await Storage.setItem(CACHE_INDEX, JSON.stringify(next.slice(0, CACHE_MAX)));
  } catch {
    // A cache failure shouldn't fail the check.
  }
}

/** Runs one planned search, from the cache if possible, else via SerpApi or the NoTopi server. */
export async function runQuery(query: SerpQuery, settings: Settings): Promise<unknown> {
  const key = cacheKey(query);
  const cached = await readCache(key);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    if (settings.serverUrl) {
      res = await fetch(`${settings.serverUrl}/v1/serp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': await getDeviceId() },
        body: JSON.stringify({ engine: query.engine, params: query.params }),
        signal: controller.signal,
      });
    } else if (settings.serpApiKey) {
      const params = new URLSearchParams({ ...query.params, engine: query.engine, api_key: settings.serpApiKey });
      res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: controller.signal });
    } else {
      throw new Error('No SerpApi key or server set');
    }
    if (res.status === 429) throw new Error('Too many checks in a minute. Try again shortly.');
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const body = await res.json();
    // SerpApi reports some failures (bad key, no credits left) as JSON with an "error" field.
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      throw new Error(body.error);
    }
    await writeCache(key, body);
    return body;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Search timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
