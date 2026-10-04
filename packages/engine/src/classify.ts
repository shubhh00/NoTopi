import type { CheckInput } from './types';

const MOBILE = /^(?:\+?91|0)?([6-9]\d{9})$/;
const TOLL_FREE = /^(1800\d{6,7})$/;
const LANDLINE = /^(?:\+?91|0)(\d{10})$/;
const URL_LIKE = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;
const PLAY_LINK = /play\.google\.com\/store\/apps\/details\?(?:[^#\s]*&)?id=([\w.]+)/i;
const PACKAGE_ID = /^(?:com|in|org|net|io|app|co|me)\.[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i;

const COMMON_TLD = /^(?:com|in|org|net|co|io|app|gov|edu|me)$/i;

/**
 * "com.phonepe.app" and "in.amazon.mShop.android.shopping" are package ids, but "in.linkedin.com"
 * is a website. Domains never start with "com."/"org."/"net.", so only the other prefixes are ambiguous.
 */
function isPackageId(s: string): boolean {
  if (!PACKAGE_ID.test(s)) return false;
  const labels = s.split('.');
  if (/^(?:com|org|net)$/i.test(labels[0]!)) return true;
  return !(labels.length <= 4 && COMMON_TLD.test(labels[labels.length - 1]!));
}

/** "+91 98765-43210" → "+919876543210"; "1800 208 1234" → "18002081234". Null if not a phone number. */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, '');
  const mobile = MOBILE.exec(compact);
  if (mobile) return `+91${mobile[1]}`;
  const tollFree = TOLL_FREE.exec(compact);
  if (tollFree) return tollFree[1]!;
  const landline = LANDLINE.exec(compact);
  if (landline) return `+91${landline[1]}`;
  return null;
}

/** The last 10 digits, which is how Indian numbers are usually written online. */
export function localDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/** Works out what the user gave us. Anything that isn't a number, link or app id is treated as message text. */
export function classify(raw: string): CheckInput {
  const trimmed = raw.trim();

  const play = PLAY_LINK.exec(trimmed);
  if (play) return { kind: 'app', raw, value: play[1]! };
  if (isPackageId(trimmed)) return { kind: 'app', raw, value: trimmed };

  const phone = normalizePhone(trimmed);
  if (phone) return { kind: 'phone', raw, value: phone };

  if (!/\s/.test(trimmed) && URL_LIKE.test(trimmed)) {
    const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return { kind: 'url', raw, value };
  }

  // A few words with no sentence in them is a shop, company or website name: "Bling Queen".
  const words = trimmed.split(/\s+/);
  if (words.length <= MAX_NAME_WORDS && trimmed.length <= 40 && !/[.?!:]\s|[?!]$/.test(trimmed)) {
    return { kind: 'name', raw, value: trimmed };
  }

  return { kind: 'text', raw, value: trimmed };
}

const MAX_NAME_WORDS = 4;

/** Lowercase with spaces and punctuation removed, so "Bling Queen" matches "blingqueen" and "BlingQueen". */
export function compactName(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

const URL_IN_TEXT = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)>\]]*)?/gi;
const PHONE_IN_TEXT = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b|\b1800[\s-]?\d{3}[\s-]?\d{3,4}\b/g;

/** Links and phone numbers found inside a message, so they can be checked too. */
export function extractEntities(text: string): { urls: string[]; phones: string[] } {
  const urls = new Set<string>();
  for (const m of text.match(URL_IN_TEXT) ?? []) {
    // Skip things like "e.g" or "Rs.500" that look like domains but aren't.
    if (/^[\d.]+$/.test(m) || !/\.[a-z]{2,}/i.test(m)) continue;
    urls.add(/^https?:\/\//i.test(m) ? m : `https://${m}`);
  }
  const phones = new Set<string>();
  for (const m of text.match(PHONE_IN_TEXT) ?? []) {
    const p = normalizePhone(m);
    if (p) phones.add(p);
  }
  return { urls: [...urls], phones: [...phones] };
}
