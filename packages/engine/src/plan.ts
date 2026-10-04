import { extractEntities, localDigits } from './classify';
import { hostnameOf } from './normalize';
import type { PatternMatch } from './patterns';
import type { CheckInput } from './types';

export type SerpEngine = 'google' | 'google_news' | 'google_maps' | 'google_play_product';

/** Why a query is run. The mapper uses it to decide which evidence source the results become. */
export type QueryPurpose = 'web' | 'official' | 'news' | 'business' | 'official-number' | 'app' | 'app-reviews';

export interface SerpQuery {
  engine: SerpEngine;
  purpose: QueryPurpose;
  params: Record<string, string>;
}

const INDIA = { gl: 'in', hl: 'en' };

/** Police, cyber cell and government sites. Their advisories are the strongest evidence there is. */
const ON_GOV_SITES = '(site:gov.in OR site:nic.in)';

function officialQuery(terms: string): SerpQuery {
  return { engine: 'google', purpose: 'official', params: { ...INDIA, q: `${terms} ${ON_GOV_SITES}` } };
}

function phoneVariants(phone: string): string[] {
  const d = localDigits(phone);
  if (phone.startsWith('1800')) return [phone];
  return [`${d.slice(0, 5)} ${d.slice(5)}`, d, `+91${d}`];
}

/**
 * The SerpApi searches to run for an input. Pure: the app (with the user's key) or the
 * server (hosted mode) runs them and maps the results back with `evidenceFromSerp`.
 */
export function planQueries(input: CheckInput, matches: PatternMatch[] = []): SerpQuery[] {
  switch (input.kind) {
    case 'phone': {
      const any = phoneVariants(input.value).map((v) => `"${v}"`).join(' OR ');
      const queries: SerpQuery[] = [
        { engine: 'google', purpose: 'web', params: { ...INDIA, q: any, num: '20' } },
        { engine: 'google', purpose: 'web', params: { ...INDIA, q: `${any} scam OR fraud OR spam` } },
        officialQuery(`(${any})`),
        { engine: 'google_news', purpose: 'news', params: { ...INDIA, q: `"${localDigits(input.value)}"` } },
        { engine: 'google_maps', purpose: 'business', params: { ...INDIA, q: input.value, type: 'search' } },
      ];
      if (input.brandHint) {
        queries.push({
          engine: 'google',
          purpose: 'official-number',
          params: { ...INDIA, q: `${input.brandHint} official customer care number` },
        });
      }
      return queries;
    }
    case 'url': {
      const host = hostnameOf(input.value);
      return [
        { engine: 'google', purpose: 'web', params: { ...INDIA, q: `"${host}"` } },
        { engine: 'google', purpose: 'web', params: { ...INDIA, q: `"${host}" scam OR fraud OR phishing` } },
        officialQuery(`"${host}"`),
      ];
    }
    case 'app':
      return [
        { engine: 'google_play_product', purpose: 'app', params: { ...INDIA, store: 'apps', product_id: input.value } },
        {
          engine: 'google_play_product',
          purpose: 'app-reviews',
          params: { ...INDIA, store: 'apps', product_id: input.value, all_reviews: 'true', sort_by: '2' },
        },
        { engine: 'google_news', purpose: 'news', params: { ...INDIA, q: `"${input.value}" OR loan app RBI police` } },
        officialQuery(`"${input.value}"`),
      ];
    case 'text': {
      const words = input.value.replace(/\s+/g, ' ').split(' ').filter(Boolean);
      const queries: SerpQuery[] = [];
      if (words.length >= 6) {
        // An exact sentence from a scam message usually finds people who received the same one.
        queries.push({ engine: 'google', purpose: 'web', params: { ...INDIA, q: `"${words.slice(0, 12).join(' ')}"` } });
      }
      const best = matches[0];
      if (best) {
        queries.push({ engine: 'google_news', purpose: 'news', params: { ...INDIA, q: best.pattern.news_query } });
        // Police advisories about this kind of scam, shown as receipts.
        queries.push(officialQuery(`${best.pattern.name} fraud advisory`));
      }
      // The number a message asks you to call is often the best lead: it may already be reported.
      const phone = extractEntities(input.value).phones[0];
      if (phone) {
        const any = phoneVariants(phone).map((v) => `"${v}"`).join(' OR ');
        queries.push({ engine: 'google', purpose: 'web', params: { ...INDIA, q: `${any} scam OR fraud OR spam` } });
        queries.push(officialQuery(`(${any})`));
      }
      return queries;
    }
  }
}
