import { findPhrase, highlightRange, normalizeText } from '../normalize';
import type { EvidenceItem, Receipt } from '../types';

/** Words people use when they report a scam online. */
export const SCAM_WORDS = [
  'scam', 'scammer', 'scammers', 'fraud', 'fraudster', 'fake', 'cheat', 'cheated', 'cheating',
  'phishing', 'spam', 'harass', 'harassment', 'harassing', 'threat', 'threatening', 'extortion',
  'blackmail', 'digital arrest', 'beware', 'ठगी', 'धोखा', 'फ्रॉड', 'ठग',
];

/** Words that mean an authority has acted on something. */
export const ACTION_WORDS = [
  'police', 'arrested', 'arrest', 'fir', 'cyber cell', 'cyber crime', 'rbi', 'banned', 'blocked by',
  'removed', 'advisory', 'warns', 'busted', 'raid', 'sebi', 'पुलिस', 'गिरफ्तार',
];

/** Words in app reviews that point to abusive recovery. */
export const HARASSMENT_WORDS = [
  'harass', 'harassment', 'harassing', 'threat', 'threatening', 'abuse', 'abusive', 'blackmail',
  'morph', 'morphed', 'contacts', 'contact list', 'family', 'relatives', 'gali', 'galiyan', 'torture',
  'nude', 'viral', 'recovery agent', 'illegal', 'fraud', 'scam',
];

/** Sites where people post complaints about numbers, apps and companies. */
export const COMPLAINT_SITES = [
  'reddit.com', 'consumercomplaints.in', 'complaintboard.in', 'voxya.com', 'mouthshut.com',
  'tellows.com', 'tellows.in', 'shouldianswer.com', 'whocallsme.com', 'callercenter.com',
  'scamadviser.com', 'quora.com', 'trustpilot.com',
];

export function itemText(item: EvidenceItem): string {
  return `${item.title} ${item.snippet}`;
}

/** First word from `words` present in `text`, in the pattern file's spelling. */
export function firstWord(text: string, words: string[]): string | undefined {
  const norm = normalizeText(text);
  return words.find((w) => findPhrase(norm, normalizeText(w)) !== -1);
}

export function isSite(site: string, list: string[]): boolean {
  return list.some((s) => site === s || site.endsWith(`.${s}`));
}

/** A receipt that quotes the evidence snippet and highlights the phrase that triggered the rule. */
export function receiptFor(item: EvidenceItem, phrase?: string): Receipt {
  const quote = item.snippet || item.title;
  return {
    quote,
    highlight: phrase ? highlightRange(quote, phrase) : undefined,
    link: item.link,
    site: item.site,
    date: item.date,
  };
}

/** Evidence items containing any of `words`, each paired with the word found. */
export function itemsMentioning(items: EvidenceItem[], words: string[]): Array<[EvidenceItem, string]> {
  const out: Array<[EvidenceItem, string]> = [];
  for (const item of items) {
    const w = firstWord(itemText(item), words);
    if (w) out.push([item, w]);
  }
  return out;
}

/** Matches the 10 digits with optional spaces or dashes between them, as numbers are written online. */
export function mentionsNumber(text: string, digits10: string): boolean {
  const re = new RegExp(digits10.split('').join('[\\s-]?'));
  return re.test(text.replace(/\+?91[\s-]?(?=[6-9])/g, ''));
}

export const MAX_RECEIPTS = 3;
