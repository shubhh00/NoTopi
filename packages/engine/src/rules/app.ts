import type { Evidence, Signal } from '../types';
import { HARASSMENT_WORDS, MAX_RECEIPTS, itemsMentioning, receiptFor } from './common';

const FREE_MAIL = /@(?:gmail|yahoo|outlook|hotmail|rediffmail|proton(?:mail)?)\.[a-z.]+$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

function monthsSince(iso: string, now: Date): number | undefined {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : (now.getTime() - t) / (30 * DAY_MS);
}

export function appSignals(ev: Evidence, now: Date): Signal[] {
  const signals: Signal[] = [];
  const app = ev.app;

  if (!app) {
    if (ev.searched.includes('play')) {
      signals.push({ id: 'app.not-on-play', label: 'Not on the Play Store', points: 25, receipts: [] });
    }
    return signals;
  }

  const ageMonths = app.released ? monthsSince(app.released, now) : undefined;
  if (ageMonths !== undefined && ageMonths < 6 && (app.installs ?? 0) < 100_000) {
    signals.push({
      id: 'app.new',
      label: `New app, ${Math.max(1, Math.round(ageMonths))} month${Math.round(ageMonths) === 1 ? '' : 's'} old`,
      points: 15,
      receipts: [],
    });
  }

  if (app.developerEmail && FREE_MAIL.test(app.developerEmail)) {
    signals.push({
      id: 'app.free-email',
      label: `Developer uses a personal email (${app.developerEmail})`,
      points: 10,
      receipts: [],
    });
  }

  if (!app.developerWebsite) {
    signals.push({ id: 'app.no-website', label: 'Developer has no website', points: 5, receipts: [] });
  }

  const complaints = itemsMentioning(ev.items.filter((i) => i.source === 'play-reviews'), HARASSMENT_WORDS);
  if (complaints.length > 0) {
    signals.push({
      id: 'app.review-harassment',
      label: `${complaints.length} review${complaints.length === 1 ? '' : 's'} describe threats or harassment`,
      points: Math.min(30, complaints.length * 10),
      receipts: complaints.slice(0, MAX_RECEIPTS).map(([i, w]) => receiptFor(i, w)),
    });
  }


  if ((app.installs ?? 0) >= 10_000_000 && ageMonths !== undefined && ageMonths > 24) {
    signals.push({
      id: 'app.established',
      label: `Established app by ${app.developer}, ${formatInstalls(app.installs!)} installs`,
      points: -20,
      receipts: [],
    });
  }

  return signals;
}

function formatInstalls(n: number): string {
  if (n >= 10_000_000) return `${Math.floor(n / 10_000_000)} crore+`;
  if (n >= 100_000) return `${Math.floor(n / 100_000)} lakh+`;
  return `${n}+`;
}
