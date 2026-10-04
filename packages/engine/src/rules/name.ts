import { compactName } from '../classify';
import type { Evidence, EvidenceItem, Signal } from '../types';
import {
  COMPLAINT_SITES, MAX_RECEIPTS, SCAM_WORDS,
  isSite, itemText, itemsMentioning, receiptFor,
} from './common';

/** True if the result talks about `name`, however it's spaced or capitalised. */
export function mentionsName(item: EvidenceItem, name: string): boolean {
  const target = compactName(name);
  return target.length >= 4 && compactName(itemText(item)).includes(target);
}

/**
 * Web reports about a shop, company or website by name: "Scammed by a fake jewellery
 * website - Bling Queen". Shared by name checks and link checks (a link's name, e.g.
 * "blingqueen" from blingqueen.in, is how people usually write about it).
 */
export function nameReportSignals(name: string, ev: Evidence, idPrefix = 'name'): Signal[] {
  const about = ev.items.filter((i) => i.source !== 'official' && mentionsName(i, name));
  const reports = itemsMentioning(about, SCAM_WORDS);
  if (reports.length === 0) return [];

  const signals: Signal[] = [{
    id: `${idPrefix}.web-reports`,
    label: reports.length === 1 ? `A web result calls ${name} a scam` : `${reports.length} web results call ${name} a scam`,
    points: Math.min(40, reports.length * 10),
    receipts: reports.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
  }];

  const complaints = reports.filter(([i]) => isSite(i.site, COMPLAINT_SITES));
  if (complaints.length > 0) {
    signals.push({
      id: `${idPrefix}.complaint-sites`,
      label: `People report it on ${[...new Set(complaints.map(([i]) => i.site))].join(', ')}`,
      points: 15,
      receipts: complaints.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }
  return signals;
}
