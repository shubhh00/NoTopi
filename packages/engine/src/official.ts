import { PatternError } from './patterns';
import type { EvidenceItem } from './types';

export interface OfficialSources {
  domains: string[];
  /** Lowercased X (Twitter) handles of police and government accounts. */
  x_handles: string[];
}

export function validateOfficial(raw: unknown): OfficialSources {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = (v: unknown, field: string) => {
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
      throw new PatternError(`official-sources: "${field}" must be a list of strings`);
    }
    return (v as string[]).map((s) => s.toLowerCase());
  };
  return { domains: list(o.domains, 'domains'), x_handles: list(o.x_handles ?? [], 'x_handles') };
}

/** The X handle in a post link, e.g. "https://x.com/MumbaiPolice/status/123" → "mumbaipolice". */
function xHandle(link: string): string | undefined {
  const m = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i.exec(link);
  return m?.[1]?.toLowerCase();
}

/** True for a government site or a post by a known police account. */
export function isOfficial(item: EvidenceItem, sources: OfficialSources): boolean {
  if (sources.domains.some((d) => item.site === d || item.site.endsWith(`.${d}`))) return true;
  const handle = xHandle(item.link);
  return handle !== undefined && sources.x_handles.includes(handle);
}

/** Readable name for a receipt: "mumbaipolice.gov.in" stays as is, an X post becomes "@MumbaiPolice on X". */
export function officialLabel(item: EvidenceItem): string {
  const m = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i.exec(item.link);
  return m ? `@${m[1]} on X` : item.site;
}
