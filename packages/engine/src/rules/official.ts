import { localDigits } from '../classify';
import { hostnameOf } from '../normalize';
import { isOfficial, officialLabel, type OfficialSources } from '../official';
import type { PatternMatch } from '../patterns';
import type { CheckInput, Evidence, EvidenceItem, Signal } from '../types';
import {
  ACTION_WORDS, MAX_RECEIPTS, SCAM_WORDS,
  itemText, itemsMentioning, mentionsNumber, receiptFor,
} from './common';

const WARNING_WORDS = [...SCAM_WORDS, ...ACTION_WORDS, 'alert', 'warning', 'beware', 'do not', 'fake'];

function receipts(hits: Array<[EvidenceItem, string]>) {
  return hits.slice(0, MAX_RECEIPTS).map(([i, w]) => ({ ...receiptFor(i, w), site: officialLabel(i) }));
}

/**
 * Police, cyber cell and government warnings. Wherever they came from (the dedicated
 * gov-site search, or a police post on X that turned up in ordinary results), they outweigh
 * any number of forum posts.
 */
export function officialSignals(
  input: CheckInput,
  ev: Evidence,
  sources: OfficialSources,
  pattern?: PatternMatch,
): Signal[] {
  const official = ev.items.filter((i) => isOfficial(i, sources));
  if (official.length === 0) return [];

  // An official page that mentions the entity together with warning words.
  const named = (mentions: (i: EvidenceItem) => boolean): Signal[] => {
    const hits = itemsMentioning(official.filter(mentions), WARNING_WORDS);
    return hits.length === 0
      ? []
      : [{ id: 'official.named', label: 'Named in a police or government warning', points: 35, receipts: receipts(hits) }];
  };

  switch (input.kind) {
    case 'phone': {
      const digits = localDigits(input.value);
      return named((i) => mentionsNumber(itemText(i), digits));
    }
    case 'url': {
      const host = hostnameOf(input.value);
      return named((i) => itemText(i).toLowerCase().includes(host));
    }
    case 'app': {
      const names = [input.value, ev.app?.title].filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());
      return named((i) => names.some((n) => itemText(i).toLowerCase().includes(n)));
    }
    case 'text': {
      if (!pattern) return [];
      const p = pattern.pattern;
      const hits = itemsMentioning(official, [...p.phrases.strong, ...p.phrases.weak, p.name]);
      if (hits.length === 0) return [];
      return [{
        id: 'official.warned',
        label: `Police and government have warned about the "${p.name}" scam`,
        points: 15,
        receipts: receipts(hits),
      }];
    }
  }
}
