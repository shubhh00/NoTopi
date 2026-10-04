import { describe, expect, it } from 'vitest';
import { assess, classify, planQueries, type Evidence } from '../src/index';
import { realDb, web } from './helpers';

const db = realDb();

// Shaped like real reports: a Reddit post and a consumer complaint about an online shop.
const reports: Evidence = {
  searched: ['search'],
  items: [
    web('Scammed by a fake jewellery website - Bling Queen', 'Ordered two items after seeing their ad. Turns out the site is a scam, they never deliver.', 'https://www.reddit.com/r/x/comments/1'),
    web('BlingQueen reviews', 'Fraud website. Paid ₹1,930 and got nothing. Beware of blingqueen.', 'https://www.consumercomplaints.in/x'),
  ],
};

describe('business and website names', () => {
  it.each([['blingqueen'], ['Bling Queen'], ['Bling Queen Jewellery']])('treats "%s" as a name', (raw) => {
    expect(classify(raw).kind).toBe('name');
  });

  it('still treats sentences as messages', () => {
    expect(classify('Hey are we meeting tomorrow?').kind).toBe('text');
    expect(classify('Your KYC has expired. Update now').kind).toBe('text');
  });

  it('searches the web for the name', () => {
    const qs = planQueries(classify('Bling Queen')).map((q) => q.params.q);
    expect(qs).toContain('"Bling Queen" scam OR fraud OR fake OR reviews');
  });

  it.each([['blingqueen'], ['Bling Queen'], ['BLING QUEEN']])('finds reports however "%s" is written', (raw) => {
    const v = assess(classify(raw), reports, db);
    expect(v.signals.map((s) => s.id)).toEqual(expect.arrayContaining(['name.web-reports', 'name.complaint-sites']));
    expect(v.level).toBe('suspicious');
  });

  // "Is Amazon a scam?" threads exist for every big brand, so forum reports alone stop at
  // "suspicious". An official warning is what makes a name a confirmed scam.
  it('stays suspicious on forum reports alone, however many', () => {
    const more: Evidence = {
      ...reports,
      items: [...reports.items, web('Bling Queen fake', 'Another bling queen scam, beware', 'https://www.reddit.com/r/y/comments/2')],
    };
    expect(assess(classify('Bling Queen'), more, db).level).toBe('suspicious');
  });

  it('is a scam once police or government name it', () => {
    const withAdvisory: Evidence = {
      searched: ['search', 'official'],
      items: [
        ...reports.items,
        web('Fake shopping sites', 'Cyber cell warns citizens about fraud website Bling Queen taking payments without delivery.', 'https://cyberpolice.example.gov.in/a', 'official'),
      ],
    };
    expect(assess(classify('Bling Queen'), withAdvisory, db).level).toBe('scam');
  });

  it("ignores results that don't mention the name", () => {
    const other: Evidence = { searched: ['search'], items: [web('Jewellery scams', 'Beware of fake jewellery websites.', 'https://www.reddit.com/r/x')] };
    expect(assess(classify('Bling Queen'), other, db).level).toBe('unknown');
  });

  it("a link's reports count when people write the shop's name instead of its domain", () => {
    const v = assess(classify('blingqueen.in'), reports, db);
    expect(v.signals.map((s) => s.id)).toContain('url.web-reports');
    expect(planQueries(classify('blingqueen.in')).map((q) => q.params.q)).toContain('("blingqueen.in" OR "blingqueen") scam OR fraud OR fake OR phishing');
  });
});
