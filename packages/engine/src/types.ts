export type InputKind = 'phone' | 'url' | 'app' | 'text';

export interface CheckInput {
  kind: InputKind;
  /** Exactly what the user pasted or shared. */
  raw: string;
  /** Normalised form: +91XXXXXXXXXX, a URL with scheme, a Play package id, or the trimmed text. */
  value: string;
  /** Brand the number or link claims to belong to ("Swiggy customer care"), if known. */
  brandHint?: string;
}

export type EvidenceSource = 'search' | 'official' | 'news' | 'play' | 'play-reviews' | 'maps' | 'lens';

export interface EvidenceItem {
  source: EvidenceSource;
  title: string;
  snippet: string;
  link: string;
  /** Hostname of the page, e.g. "reddit.com". */
  site: string;
  date?: string;
}

export interface AppListing {
  packageId: string;
  title: string;
  developer: string;
  installs?: number;
  rating?: number;
  /** ISO date the app was first released. */
  released?: string;
  developerEmail?: string;
  developerWebsite?: string;
}

export interface BusinessListing {
  name: string;
  rating?: number;
  reviews?: number;
}

export interface Evidence {
  /** Sources that were actually queried, so "no results" can be told apart from "didn't look". */
  searched: EvidenceSource[];
  items: EvidenceItem[];
  app?: AppListing | null;
  business?: BusinessListing | null;
  /** Official numbers found for `CheckInput.brandHint`, normalised like `CheckInput.value`. */
  officialNumbers?: string[];
}

export interface Receipt {
  quote: string;
  /** Character range in `quote` to highlight. */
  highlight?: [number, number];
  link?: string;
  site?: string;
  date?: string;
}

export interface Signal {
  id: string;
  label: string;
  /** Positive raises risk, negative lowers it. */
  points: number;
  receipts: Receipt[];
}

export type VerdictLevel = 'scam' | 'suspicious' | 'clean' | 'unknown';
