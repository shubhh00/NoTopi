import { extractEntities, localDigits } from './classify';
import { hostnameOf } from './normalize';
import { siteNameOf } from './rules/url';
import type { CheckInput } from './types';

export type SerpEngine = 'google' | 'google_play_product';

/** Why a query is run. The mapper uses it to decide which evidence source the results become. */
export type QueryPurpose = 'web' | 'official' | 'official-number' | 'app' | 'app-reviews';

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

function web(q: string, num = 10): SerpQuery {
  return { engine: 'google', purpose: 'web', params: { ...INDIA, q, num: String(num) } };
}

function phoneVariants(phone: string): string[] {
  const d = localDigits(phone);
  if (phone.startsWith('1800')) return [phone];
  return [`${d.slice(0, 5)} ${d.slice(5)}`, d, `+91${d}`];
}

function anyPhone(phone: string): string {
  return phoneVariants(phone).map((v) => `"${v}"`).join(' OR ');
}

/**
 * The SerpApi searches to run for an input. Pure: the app (with the user's key) or the
 * server (hosted mode) runs them and maps the results back with `evidenceFromSerp`.
 *
 * Searches cost credits (the free SerpApi plan has 250 a month), so each check uses about
 * two: one web search that does several jobs, and one search of police and government sites.
 */
export function planQueries(input: CheckInput): SerpQuery[] {
  switch (input.kind) {
    case 'phone': {
      // A plain search for the number finds complaint pages *and* the business it belongs to
      // (Google shows a listing panel), so no separate Maps or "scam" search is needed.
      const queries = [web(anyPhone(input.value), 20), officialQuery(`(${anyPhone(input.value)})`)];
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
      // Victims write "Bling Queen", not "blingqueen.in": search the site's name in the same query.
      const name = siteNameOf(host);
      const subject = name ? `("${host}" OR "${name}")` : `"${host}"`;
      return [web(`${subject} scam OR fraud OR fake OR phishing`, 20), officialQuery(`"${host}"`)];
    }
    case 'name':
      return [web(`"${input.value}" scam OR fraud OR fake OR reviews`, 20), officialQuery(`"${input.value}"`)];
    case 'app':
      return [
        { engine: 'google_play_product', purpose: 'app', params: { ...INDIA, store: 'apps', product_id: input.value } },
        {
          engine: 'google_play_product',
          purpose: 'app-reviews',
          params: { ...INDIA, store: 'apps', product_id: input.value, all_reviews: 'true', sort_by: '2' },
        },
        officialQuery(`"${input.value}"`),
      ];
    case 'text': {
      // The number a message asks you to call is the best lead: it may already be reported.
      const phone = extractEntities(input.value).phones[0];
      if (phone) return [web(`${anyPhone(phone)} scam OR fraud OR spam`, 20), officialQuery(`(${anyPhone(phone)})`)];
      // Otherwise an exact sentence from the message finds people who received the same one.
      const words = input.value.replace(/\s+/g, ' ').split(' ').filter(Boolean);
      return words.length >= 6 ? [web(`"${words.slice(0, 12).join(' ')}"`)] : [];
    }
  }
}
