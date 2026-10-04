import { impersonatedBrand, isOnDomain, officialBrandOf, type BrandDb } from '../brands';
import { hostnameOf } from '../normalize';
import type { Evidence, EvidenceItem, Signal } from '../types';
import { COMPLAINT_SITES, MAX_RECEIPTS, SCAM_WORDS, isSite, itemText, itemsMentioning, receiptFor } from './common';
import { mentionsName } from './name';

const SECOND_LEVEL = new Set(['co', 'org', 'net', 'gov', 'ac', 'edu', 'firm', 'gen', 'ind']);

/** The name part of a domain: "shop.blingqueen.co.in" → "blingqueen". Undefined if too short to search for. */
export function siteNameOf(host: string): string | undefined {
  const labels = host.split('.');
  labels.pop(); // top-level domain
  if (labels.length > 1 && SECOND_LEVEL.has(labels[labels.length - 1]!)) labels.pop();
  const name = labels.pop();
  return name && name.length >= 4 ? name : undefined;
}

/** Signals that need no searching: what the link itself gives away. */
export function urlShapeSignals(url: string, db: BrandDb): Signal[] {
  const host = hostnameOf(url);
  if (!host) return [];
  const signals: Signal[] = [];
  const quote = url;

  const official = officialBrandOf(host, db);
  if (official) {
    signals.push({ id: 'url.official', label: `An official ${official.name} website`, points: -30, receipts: [] });
    return signals;
  }

  const brand = impersonatedBrand(host, db);
  if (brand) {
    const start = quote.toLowerCase().indexOf(host);
    signals.push({
      id: 'url.brand-lookalike',
      label: `Uses the name ${brand.name} but isn't on ${brand.domains[0]}`,
      points: 30,
      receipts: [{ quote, highlight: start === -1 ? undefined : [start, start + host.length] }],
    });
  }

  if (/\.apk(?:$|[?#])/i.test(url)) {
    signals.push({ id: 'url.apk', label: 'Downloads an app file (.apk) directly', points: 35, receipts: [{ quote }] });
  }

  const tld = host.split('.').pop() ?? '';
  if (db.risky_tlds.includes(tld)) {
    signals.push({ id: 'url.risky-tld', label: `Uses ".${tld}", common in phishing links`, points: 10, receipts: [] });
  }

  if (db.shorteners.some((s) => isOnDomain(host, s))) {
    signals.push({ id: 'url.shortener', label: 'A short link that hides where it really goes', points: 10, receipts: [] });
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    signals.push({ id: 'url.ip-host', label: 'Points to a raw IP address instead of a website name', points: 15, receipts: [] });
  }

  if (host.split('.').some((l) => l.startsWith('xn--'))) {
    signals.push({ id: 'url.punycode', label: 'Uses look-alike characters in the address', points: 15, receipts: [] });
  }

  return signals;
}

export function urlEvidenceSignals(url: string, ev: Evidence): Signal[] {
  const host = hostnameOf(url);
  if (!host || !ev.searched.includes('search')) return [];
  const signals: Signal[] = [];
  // People write "Bling Queen" more often than "blingqueen.in", so match the site's name too.
  const name = siteNameOf(host);
  const ownSite = (i: EvidenceItem) => i.site === host || i.site.endsWith(`.${host}`);
  const aboutHost = ev.items.filter(
    (i) => !ownSite(i) && i.source !== 'official'
      && (itemText(i).toLowerCase().includes(host) || (name !== undefined && mentionsName(i, name))),
  );

  const reports = itemsMentioning(aboutHost, SCAM_WORDS);
  if (reports.length > 0) {
    signals.push({
      id: 'url.web-reports',
      label: reports.length === 1 ? 'Reported as a scam online' : `Reported as a scam in ${reports.length} places`,
      points: Math.min(40, reports.length * 10),
      receipts: reports.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
    const complaints = reports.filter(([i]) => isSite(i.site, COMPLAINT_SITES));
    if (complaints.length > 0) {
      signals.push({
        id: 'url.complaint-sites',
        label: `People report it on ${[...new Set(complaints.map(([i]) => i.site))].join(', ')}`,
        points: 15,
        receipts: complaints.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
      });
    }
  }

  return signals;
}
