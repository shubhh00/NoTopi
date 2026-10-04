import { describe, expect, it } from 'vitest';
import { assess, classify, type Evidence } from '../src/index';
import { realDb, web } from './helpers';

const db = realDb();

describe('police and government sources', () => {
  it('a state police advisory naming the number is the strongest signal', () => {
    const ev: Evidence = {
      searched: ['official'],
      items: [
        web(
          'Cyber fraud alert',
          'Citizens are warned not to respond to calls from 98765 43210 posing as customs officers. Report fraud on 1930.',
          'https://mumbaipolice.gov.in/advisories/123',
          'official',
        ),
      ],
    };
    const v = assess(classify('98765 43210'), ev, db);
    expect(v.signals[0]).toMatchObject({ id: 'official.named', points: 35 });
    expect(v.signals[0]?.receipts[0]?.site).toBe('mumbaipolice.gov.in');
  });

  it('counts a known police account on X, wherever the result came from', () => {
    const ev: Evidence = {
      searched: ['search'],
      items: [web('Mumbai Police on X', 'Beware! Fraudsters calling from 9876543210 claim your parcel has drugs.', 'https://x.com/MumbaiPolice/status/1', 'search')],
    };
    const v = assess(classify('9876543210'), ev, db);
    const official = v.signals.find((s) => s.id === 'official.named');
    expect(official?.receipts[0]?.site).toBe('@MumbaiPolice on X');
  });

  it("ignores a gov page that mentions the number without any warning", () => {
    const ev: Evidence = {
      searched: ['official'],
      items: [web('District office contacts', 'Collector office reception: 98765 43210', 'https://district.nic.in/contact', 'official')],
    };
    expect(assess(classify('98765 43210'), ev, db).signals.map((s) => s.id)).not.toContain('official.named');
  });

  it("doesn't trust a random X account", () => {
    const ev: Evidence = {
      searched: ['search'],
      items: [web('Someone on X', 'Fraud call from 98765 43210, beware', 'https://x.com/randomperson/status/1', 'search')],
    };
    expect(assess(classify('98765 43210'), ev, db).signals.map((s) => s.id)).not.toContain('official.named');
  });

  it('attaches police advisories about the scam type to a message', () => {
    const ev: Evidence = {
      searched: ['official'],
      items: [
        web('Advisory on digital arrest', 'There is no concept of digital arrest in law. CBI or police never call on video.', 'https://cybercrime.gov.in/advisory', 'official'),
      ],
    };
    const v = assess(classify('This is CBI. You are under digital arrest, stay on video call.'), ev, db);
    expect(v.signals.map((s) => s.id)).toContain('official.warned');
  });
});
