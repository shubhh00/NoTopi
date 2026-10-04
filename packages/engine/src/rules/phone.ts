import { localDigits } from '../classify';
import type { CheckInput, Evidence, Signal } from '../types';
import {
  ACTION_WORDS, COMPLAINT_SITES, MAX_RECEIPTS, SCAM_WORDS,
  isSite, itemText, itemsMentioning, mentionsNumber, receiptFor,
} from './common';

export function phoneSignals(input: CheckInput, ev: Evidence): Signal[] {
  const signals: Signal[] = [];
  const digits = localDigits(input.value);
  const aboutNumber = ev.items.filter((i) => mentionsNumber(itemText(i), digits));

  const webReports = itemsMentioning(aboutNumber.filter((i) => i.source === 'search'), SCAM_WORDS);
  if (webReports.length > 0) {
    const n = webReports.length;
    signals.push({
      id: 'phone.web-reports',
      label: n === 1 ? 'A web result calls this number a scam' : `${n} web results call this number a scam`,
      points: Math.min(40, n * 10),
      receipts: webReports.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }

  const complaints = webReports.filter(([i]) => isSite(i.site, COMPLAINT_SITES));
  if (complaints.length > 0) {
    signals.push({
      id: 'phone.complaint-sites',
      label: `Reported on complaint sites (${[...new Set(complaints.map(([i]) => i.site))].join(', ')})`,
      points: 15,
      receipts: complaints.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }

  const news = itemsMentioning(aboutNumber.filter((i) => i.source === 'news'), [...ACTION_WORDS, ...SCAM_WORDS]);
  if (news.length > 0) {
    signals.push({
      id: 'phone.news',
      label: 'Named in a news report about fraud',
      points: 20,
      receipts: news.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }

  if (ev.business) {
    signals.push({
      id: 'phone.business-listing',
      label: `Listed on Google Maps as "${ev.business.name}"`,
      points: -20,
      receipts: [],
    });
  }

  if (ev.officialNumbers && ev.officialNumbers.length > 0 && input.brandHint) {
    const official = ev.officialNumbers.some((n) => localDigits(n) === digits);
    signals.push(
      official
        ? { id: 'phone.official', label: `This is ${input.brandHint}'s official number`, points: -40, receipts: [] }
        : {
            id: 'phone.not-official',
            label: `Not ${input.brandHint}'s official number (${ev.officialNumbers.join(', ')})`,
            points: 40,
            receipts: [],
          },
    );
  }

  return signals;
}
