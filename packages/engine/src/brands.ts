import { PatternError } from './patterns';

export interface Brand {
  name: string;
  keywords: string[];
  domains: string[];
}

export interface BrandDb {
  brands: Brand[];
  risky_tlds: string[];
  shorteners: string[];
}

function list(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    throw new PatternError(`brands: "${field}" must be a list of strings`);
  }
  return (v as string[]).map((s) => s.toLowerCase());
}

export function validateBrands(raw: unknown): BrandDb {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.brands)) throw new PatternError('brands: "brands" must be a list');
  return {
    brands: o.brands.map((b, i) => {
      const r = (b ?? {}) as Record<string, unknown>;
      if (typeof r.name !== 'string') throw new PatternError(`brands[${i}]: "name" is required`);
      return { name: r.name, keywords: list(r.keywords, `${r.name}.keywords`), domains: list(r.domains, `${r.name}.domains`) };
    }),
    risky_tlds: list(o.risky_tlds ?? [], 'risky_tlds'),
    shorteners: list(o.shorteners ?? [], 'shorteners'),
  };
}

export function isOnDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function officialBrandOf(host: string, db: BrandDb): Brand | undefined {
  return db.brands.find((b) => b.domains.some((d) => isOnDomain(host, d)));
}

/**
 * A brand whose name appears in `host` while `host` isn't one of that brand's domains,
 * e.g. "sbi-kyc-update.in" → SBI. Short keywords must be a whole label part to avoid
 * "lic" matching "public".
 */
export function impersonatedBrand(host: string, db: BrandDb): Brand | undefined {
  if (officialBrandOf(host, db)) return undefined;
  const labels = host.split('.');
  const parts = host.split(/[.-]/);
  return db.brands.find((b) =>
    b.keywords.some((k) =>
      k.length >= 5 ? labels.some((l) => l.includes(k)) : parts.includes(k),
    ),
  );
}
