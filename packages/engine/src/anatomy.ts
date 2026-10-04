import { PatternError } from './patterns';

export type AuthorityKind = 'government' | 'bank' | 'brand';

export interface Anatomy {
  authorities: Record<AuthorityKind, string[]>;
  hooks: { threat: string[]; reward: string[] };
  asks: string[];
  off_channel: string[];
}

function list(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== 'string' || !x.trim())) {
    throw new PatternError(`anatomy: "${field}" must be a non-empty list of strings`);
  }
  return v as string[];
}

export function validateAnatomy(raw: unknown): Anatomy {
  const o = (raw ?? {}) as Record<string, any>;
  return {
    authorities: {
      government: list(o.authorities?.government, 'authorities.government'),
      bank: list(o.authorities?.bank, 'authorities.bank'),
      brand: list(o.authorities?.brand, 'authorities.brand'),
    },
    hooks: { threat: list(o.hooks?.threat, 'hooks.threat'), reward: list(o.hooks?.reward, 'hooks.reward') },
    asks: list(o.asks, 'asks'),
    off_channel: list(o.off_channel, 'off_channel'),
  };
}
