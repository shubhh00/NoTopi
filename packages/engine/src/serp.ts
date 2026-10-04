import { normalizePhone } from './classify';
import { hostnameOf } from './normalize';
import type { SerpQuery } from './plan';
import type { AppListing, Evidence, EvidenceItem, EvidenceSource } from './types';

// SerpApi responses are large and loosely typed; read only the fields we use, defensively.
type Json = Record<string, any>;

const SOURCE_FOR: Record<SerpQuery['purpose'], EvidenceSource> = {
  web: 'search',
  official: 'official',
  news: 'news',
  business: 'maps',
  'official-number': 'search',
  app: 'play',
  'app-reviews': 'play-reviews',
};

function item(source: EvidenceSource, r: Json): EvidenceItem | null {
  const link: string = r.link ?? '';
  const title: string = r.title ?? '';
  const snippet: string = r.snippet ?? r.description ?? '';
  if (!title && !snippet) return null;
  return {
    source,
    title,
    snippet,
    link,
    site: r.source?.name && !link ? String(r.source.name) : hostnameOf(link),
    date: r.date ?? r.iso_date,
  };
}

function parseInstalls(s: unknown): number | undefined {
  if (typeof s !== 'string') return undefined;
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Turns one SerpApi response into evidence. Merge several with `mergeEvidence`. */
export function evidenceFromSerp(query: SerpQuery, json: Json): Evidence {
  const source = SOURCE_FOR[query.purpose];
  const ev: Evidence = { searched: [source], items: [] };

  switch (query.purpose) {
    case 'web':
    case 'official':
      ev.items = (json.organic_results ?? []).map((r: Json) => item(source, r)).filter(Boolean);
      break;

    case 'news': {
      // Google News nests related coverage under `stories`; flatten it.
      const flat: Json[] = (json.news_results ?? []).flatMap((r: Json) => (r.stories ? r.stories : [r]));
      ev.items = flat.map((r) => item(source, r)).filter(Boolean) as EvidenceItem[];
      break;
    }

    case 'business': {
      const place: Json | undefined = json.place_results ?? json.local_results?.[0];
      if (place?.title) ev.business = { name: place.title, rating: place.rating, reviews: place.reviews };
      break;
    }

    case 'official-number': {
      const numbers = new Set<string>();
      const kg = json.knowledge_graph;
      for (const raw of [kg?.phone, kg?.customer_service, json.answer_box?.answer]) {
        const p = typeof raw === 'string' ? normalizePhone(raw) : null;
        if (p) numbers.add(p);
      }
      ev.officialNumbers = [...numbers];
      ev.items = (json.organic_results ?? []).map((r: Json) => item(source, r)).filter(Boolean);
      break;
    }

    case 'app': {
      const info: Json | undefined = json.product_info;
      if (!info?.title) {
        ev.app = null;
        break;
      }
      const about: Json = json.about_this_app ?? {};
      const contact: Json = json.developer_contact ?? json.app_support ?? {};
      const app: AppListing = {
        packageId: query.params.product_id ?? '',
        title: info.title,
        developer: info.authors?.[0]?.name ?? info.author ?? '',
        installs: parseInstalls(info.downloads ?? about.info?.downloads),
        rating: typeof info.rating === 'number' ? info.rating : undefined,
        released: about.info?.released_on ?? about.released_on,
        developerEmail: contact.email,
        developerWebsite: contact.website,
      };
      ev.app = app;
      break;
    }

    case 'app-reviews':
      ev.items = (json.reviews ?? [])
        .map((r: Json) =>
          r.snippet
            ? { source, title: r.title ?? 'Play Store review', snippet: r.snippet, link: '', site: 'Play Store', date: r.date }
            : null,
        )
        .filter(Boolean);
      break;
  }

  return ev;
}

export function mergeEvidence(parts: Evidence[]): Evidence {
  const seen = new Set<string>();
  const merged: Evidence = { searched: [], items: [] };
  for (const p of parts) {
    for (const s of p.searched) if (!merged.searched.includes(s)) merged.searched.push(s);
    for (const i of p.items) {
      const key = `${i.source}|${i.link || i.snippet}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.items.push(i);
    }
    if (p.app !== undefined && merged.app == null) merged.app = p.app;
    if (p.business !== undefined && merged.business == null) merged.business = p.business;
    if (p.officialNumbers) merged.officialNumbers = [...(merged.officialNumbers ?? []), ...p.officialNumbers];
  }
  return merged;
}
