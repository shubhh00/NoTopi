import type { Anatomy, AuthorityKind } from '../anatomy';
import { extractEntities } from '../classify';
import { findPhrase, normalizeText } from '../normalize';
import type { Signal } from '../types';
import { quoteFromMessage } from './text';

/** A mobile number as written in the message (not toll-free or landline): what scammers ask you to call. */
const MOBILE_IN_TEXT = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/;

const AUTHORITY_NAME: Record<AuthorityKind, string> = {
  government: 'a government body',
  bank: 'a bank',
  brand: 'a well-known company',
};

function firstTerm(norm: string, terms: string[]): string | undefined {
  return terms.find((t) => findPhrase(norm, normalizeText(t)) !== -1);
}

function mine(message: string, phrase: string) {
  return { ...quoteFromMessage(message, phrase), site: 'Your message' };
}

/**
 * Scores the structure of a message instead of its story. Nearly every scam claims some
 * authority, adds a threat or a prize, pulls you off official channels and asks for money or
 * a credential. These rules catch scams that have no pattern file yet.
 */
export function anatomySignals(message: string, anatomy: Anatomy): Signal[] {
  const norm = normalizeText(message);
  const signals: Signal[] = [];
  let parts = 0;

  // 1. Who it claims to be. Government and bank claims are checked first: they matter most.
  let authority: { kind: AuthorityKind; term: string } | undefined;
  for (const kind of ['government', 'bank', 'brand'] as const) {
    const term = firstTerm(norm, anatomy.authorities[kind]);
    if (term) {
      authority = { kind, term };
      break;
    }
  }
  if (authority) {
    parts++;
    signals.push({
      id: 'anatomy.authority',
      label: `Claims to be from ${AUTHORITY_NAME[authority.kind]}`,
      points: 10,
      receipts: [mine(message, authority.term)],
    });
  }

  // 2. The hook: a threat or a prize.
  const threat = firstTerm(norm, anatomy.hooks.threat);
  const reward = threat ? undefined : firstTerm(norm, anatomy.hooks.reward);
  if (threat || reward) {
    parts++;
    signals.push({
      id: 'anatomy.hook',
      label: threat ? 'Threatens you with losing something' : 'Promises a prize or money',
      points: 10,
      receipts: [mine(message, (threat ?? reward)!)],
    });
  }

  // 3. Off the official channel: a personal mobile number, a link, an app, a chat group.
  const mobile = MOBILE_IN_TEXT.exec(message)?.[0];
  const link = extractEntities(message).urls[0];
  const channel = mobile ?? firstTerm(norm, anatomy.off_channel) ?? (link ? link.replace(/^https?:\/\//, '') : undefined);
  if (channel) {
    parts++;
    signals.push({
      id: 'anatomy.off-channel',
      label: mobile ? 'Asks you to contact a personal mobile number' : 'Moves you to a link, app or chat',
      points: 15,
      receipts: [mine(message, channel)],
    });
  }

  // 4. The ask: money or a credential.
  const ask = firstTerm(norm, anatomy.asks);
  if (ask) {
    parts++;
    signals.push({
      id: 'anatomy.ask',
      label: 'Asks for money, an OTP, a PIN or personal details',
      points: 15,
      receipts: [mine(message, ask)],
    });
  }

  // The strongest structural tell: real government offices and banks use toll-free numbers and
  // official sites, never a private mobile. (Not applied to companies: delivery partners do call.)
  if (authority && authority.kind !== 'brand' && mobile) {
    signals.push({
      id: 'anatomy.authority-mobile',
      label: `Claims to be ${AUTHORITY_NAME[authority.kind]} but gives a personal mobile number`,
      points: 15,
      receipts: [],
    });
  }

  if (parts >= 3) {
    signals.push({
      id: 'anatomy.shape',
      label: `Has ${parts} of the 4 parts of a scam message`,
      points: 10,
      receipts: [],
    });
  }

  return signals;
}
