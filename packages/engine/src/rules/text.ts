import { findPhrase, highlightRange, normalizeText } from '../normalize';
import type { PatternMatch } from '../patterns';
import type { Evidence, Receipt, Signal } from '../types';
import { MAX_RECEIPTS, SCAM_WORDS, itemsMentioning, receiptFor } from './common';

const PRESSURE_WORDS = [
  'urgent', 'immediately', 'today itself', 'within 24 hours', 'last warning', 'final notice',
  'do not ignore', 'act now', 'turant', 'abhi', 'तुरंत', 'आज ही',
];

/** Quotes the part of the user's own message around `phrase`, with the phrase highlighted. */
export function quoteFromMessage(message: string, phrase: string): Receipt {
  const range = highlightRange(message, phrase);
  if (!range) return { quote: message.slice(0, 160) };
  const start = Math.max(0, range[0] - 70);
  const end = Math.min(message.length, range[1] + 70);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < message.length ? '…' : '';
  return {
    quote: prefix + message.slice(start, end) + suffix,
    highlight: [range[0] - start + prefix.length, range[1] - start + prefix.length],
  };
}

/**
 * Strong phrases are wording only scammers use, so one is close to decisive on its own and
 * each extra one adds confidence. Weak-only matches (common words that happen to co-occur)
 * stay in "suspicious" territory.
 */
export function scriptPoints(match: PatternMatch): number {
  const { pattern, strong, weak } = match;
  if (strong.length > 0) return pattern.points + 30 + 10 * (strong.length - 1);
  return 30 + 5 * (weak.length - pattern.min_weak);
}

export function textSignals(message: string, matches: PatternMatch[], ev: Evidence): Signal[] {
  const signals: Signal[] = [];
  const [best, second] = matches;

  if (best) {
    const phrases = best.strong.length > 0 ? best.strong : best.weak;
    signals.push({
      id: `text.pattern.${best.pattern.id}`,
      label: `Matches the "${best.pattern.name}" scam script`,
      points: scriptPoints(best),
      receipts: phrases.slice(0, MAX_RECEIPTS).map((p) => ({ ...quoteFromMessage(message, p), site: 'Your message' })),
    });
  }
  if (second) {
    signals.push({
      id: `text.pattern.${second.pattern.id}`,
      label: `Also looks like the "${second.pattern.name}" scam`,
      points: 10,
      receipts: [],
    });
  }

  const norm = normalizeText(message);
  const pressure = PRESSURE_WORDS.filter((w) => findPhrase(norm, normalizeText(w)) !== -1);
  if (pressure.length >= 2) {
    signals.push({
      id: 'text.pressure',
      label: 'Pushes you to act fast',
      points: 5,
      receipts: [{ ...quoteFromMessage(message, pressure[0]!), site: 'Your message' }],
    });
  }

  const reported = itemsMentioning(ev.items.filter((i) => i.source === 'search'), SCAM_WORDS);
  if (reported.length > 0) {
    signals.push({
      id: 'text.reported-online',
      label: 'People have reported this same message online',
      points: 20,
      receipts: reported.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }

  return signals;
}
