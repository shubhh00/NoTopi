import type { SerpQuery } from '@notopi/engine';
import { getDeviceId, type Settings } from './settings';

const TIMEOUT_MS = 20_000;

/** Runs one planned search, either straight against SerpApi or through the NoTopi server. */
export async function runQuery(query: SerpQuery, settings: Settings): Promise<unknown> {
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
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
