import { describe, expect, it } from 'vitest';
import { assess, classify, decide, type Evidence } from '../src/index';
import { realDb, web } from './helpers';

const db = realDb();
const none: Evidence = { searched: [], items: [] };

describe('messages', () => {
  it('flags a digital arrest script and offers its advice', () => {
    const input = classify(
      'This is CBI officer. A FedEx parcel with drugs is registered on your Aadhaar. ' +
        'You are under digital arrest, stay on video call and do not tell anyone.',
    );
    const v = assess(input, none, db);
    expect(v.pattern?.pattern.id).toBe('digital-arrest');
    expect(v.signals[0]?.receipts[0]?.site).toBe('Your message');
    expect(v.level).not.toBe('clean');
  });

  it('adds points for a lookalike link inside the message', () => {
    const v = assess(classify('Your KYC has expired. Update at sbi-kyc-update.xyz today or account will be blocked today'), none, db);
    expect(v.signals.map((s) => s.id)).toContain('text.url.brand-lookalike');
    expect(v.level).toBe('scam');
  });

  // Real-world wording of each scam, checked with no web evidence at all.
  it.each([
    ['electricity-cutoff', 'Dear consumer, your electricity will be disconnected tonight at 9.30 pm because previous month bill was not updated. Contact electricity officer 9876543210 immediately.'],
    ['apk-file', 'Your e-challan is pending. Download RTO Challan.apk to pay now or vehicle will be seized.'],
    ['fake-challan', 'Your vehicle challan is pending. Pay your challan today at echallan-parivahan.top or your licence will be suspended and a court case filed.'],
    ['task-job', 'Part time job! Like YouTube videos and earn 5000 daily. Join our Telegram, complete tasks to withdraw.'],
    ['lottery-prize', 'Congratulations! You have won 25 lakh in KBC lottery. Pay processing fee to claim on WhatsApp.'],
    ['upi-collect', 'I am army officer buying your sofa on OLX. I sent you collect request, enter PIN to receive the advance.'],
    ['investment-tips', 'Join our VIP stock group for guaranteed returns of 300% profit. IPO allotment guaranteed.'],
    // Received from sender AD-GOALCO-S in 2026, shared by a user.
    ['voter-sir', 'Dear INDIAN VOTER During SIR investigation Your Name and Your Father Name Documents are not Matched As per Rules Govt. Of India For more info. Now Contact our ECI Officer 9395197425 Reg. Goyal & Co'],
  ])('a strong %s message is a scam even offline', (id, message) => {
    const v = assess(classify(message), none, db);
    expect(v.pattern?.pattern.id).toBe(id);
    expect(v.level).toBe('scam');
  });

  it('checks the phone number a message asks you to call', () => {
    const ev: Evidence = {
      searched: ['search', 'official'],
      items: [web('9395197425 fraud', 'Got SMS from 93951 97425 posing as ECI officer, total scam', 'https://www.reddit.com/r/mumbai/x')],
    };
    const v = assess(classify('Please contact our officer on 9395197425 regarding your documents.'), ev, db);
    expect(v.signals.map((s) => s.id)).toContain('text.phone.web-reports');
    expect(v.signals.find((s) => s.id === 'text.phone.web-reports')?.label).toMatch(/^Number in message:/);
  });

  it("doesn't match 'app' inside 'whatsapp'", () => {
    const v = assess(classify('Hi, saw your message on WhatsApp. Lunch tomorrow?'), none, db);
    expect(v.pattern).toBeUndefined();
    expect(v.level).toBe('unknown');
  });
});

describe('links', () => {
  it('treats an official domain as clean', () => {
    expect(assess(classify('https://www.onlinesbi.sbi/'), none, db).level).toBe('clean');
  });

  it('flags a brand lookalike on a risky TLD', () => {
    const v = assess(classify('hdfc-netbanking-verify.top'), none, db);
    expect(v.signals.map((s) => s.id)).toEqual(expect.arrayContaining(['url.brand-lookalike', 'url.risky-tld']));
    expect(v.level).toBe('suspicious');
  });

  it("doesn't treat 'public' as LIC", () => {
    const v = assess(classify('publicnotice.org'), none, db);
    expect(v.signals.map((s) => s.id)).not.toContain('url.brand-lookalike');
  });

  // Real results for echallanparivahan.in (Oct 2026): e-challan alerts, not app-file ones.
  it('names a fake e-challan site from reports, not the app-file scam', () => {
    const reports: Evidence = {
      searched: ['search', 'official'],
      items: [
        web(
          'E-challan Scam: ई-चालान घोटाले से रहें सावधान',
          'Traffic e challan scam alert Know original and fake Parivahan links e-challan Scam ... echallanparivahan.in/.',
          'https://www.amarujala.com/technology/e-challan-scam',
        ),
        web(
          'Possible Fake e-Challan Scam Alert',
          'Scammers are misusing the eChallan – Digital Traffic/Transport Enforcement Solution name (MoRTH, Govt. of India) to cheat people.',
          'https://www.facebook.com/post/1',
        ),
      ],
    };
    const v = assess(classify('echallanparivahan.in'), reports, db);
    expect(v.pattern?.pattern.id).toBe('fake-challan');
    expect(v.signals.map((s) => s.id)).toContain('url.brand-lookalike');

    // A scam no pattern describes is still flagged, but isn't given the name of a pattern it only
    // shares common words with ("download", "app", "file" are also app-file words).
    const withoutIt = { ...db, patterns: db.patterns.filter((p) => p.id !== 'fake-challan') };
    const looselyWorded: Evidence = {
      searched: ['search', 'official'],
      items: [
        ...reports.items,
        web(
          'Fake traffic fine website alert',
          'Scam warning: the site asks you to download a receipt file, or open it in the app, after you pay.',
          'https://example-news.in/fake-fine-site',
        ),
      ],
    };
    const unnamed = assess(classify('echallanparivahan.in'), looselyWorded, withoutIt);
    expect(unnamed.pattern).toBeUndefined();
    expect(unnamed.level).not.toBe('unknown');
  });
});

describe('phone numbers', () => {
  const input = classify('98765 43210');

  it('is unknown with no evidence', () => {
    expect(assess(input, { searched: ['search'], items: [] }, db).level).toBe('unknown');
  });

  it('becomes a scam with web reports, and names the scam from them', () => {
    const ev: Evidence = {
      searched: ['search'],
      items: [
        web('98765 43210 - fraud call', 'Got a call from 98765 43210 claiming to be CBI, said a parcel with drugs in my name. Scam.', 'https://www.reddit.com/r/india/x'),
        web('Who called me 9876543210', 'Fraud caller pretending to be customs officer.', 'https://www.tellows.in/num/9876543210'),
        web('+91 98765-43210', 'Scammer, threatening digital arrest.', 'https://shouldianswer.com/x'),
      ],
    };
    const v = assess(input, ev, db);
    expect(v.level).toBe('scam');
    expect(v.pattern?.pattern.id).toBe('digital-arrest');
    const top = v.signals.find((s) => s.id === 'phone.web-reports')!;
    const r = top.receipts[0]!;
    expect(r.quote.slice(r.highlight![0], r.highlight![1]).toLowerCase()).toBe('scam');
  });

  it('ignores results that are about a different number', () => {
    const ev: Evidence = {
      searched: ['search'],
      items: [web('Scam alert', 'Beware of fraud calls from 91234 56789.', 'https://reddit.com/x')],
    };
    expect(assess(input, ev, db).signals).toHaveLength(0);
  });

  it('flags a number that is not the brand official one', () => {
    const v = assess({ ...input, brandHint: 'Swiggy' }, { searched: ['search'], items: [], officialNumbers: ['+918047001234'] }, db);
    expect(v.signals[0]?.id).toBe('phone.not-official');
  });
});

describe('apps', () => {
  const input = classify('com.cash.now');
  const now = new Date('2026-10-04');

  it('flags a new loan app with harassment reviews', () => {
    const ev: Evidence = {
      searched: ['play', 'play-reviews'],
      app: { packageId: 'com.cash.now', title: 'CashNow Loan', developer: 'Fast Fin', installs: 50_000, released: '2026-08-01', developerEmail: 'fastfin.help@gmail.com' },
      items: [
        { source: 'play-reviews', title: 'R', snippet: 'They harass my family and send morphed photos', link: '', site: 'Play Store' },
        { source: 'play-reviews', title: 'R', snippet: 'Recovery agents use gali and threats', link: '', site: 'Play Store' },
        { source: 'play-reviews', title: 'R', snippet: 'They accessed my contacts and called everyone', link: '', site: 'Play Store' },
      ],
    };
    const v = assess(input, ev, db, now);
    expect(v.signals.map((s) => s.id)).toEqual(
      expect.arrayContaining(['app.new', 'app.free-email', 'app.no-website', 'app.review-harassment']),
    );
    expect(v.level).toBe('scam');
  });

  it('flags an app that is not on the Play Store', () => {
    expect(assess(input, { searched: ['play'], items: [], app: null }, db, now).signals[0]?.id).toBe('app.not-on-play');
  });
});

describe('decide', () => {
  it('needs positive proof to say clean', () => {
    expect(decide([]).level).toBe('unknown');
    expect(decide([{ id: 'x', label: '', points: -20, receipts: [] }]).level).toBe('clean');
    expect(decide([{ id: 'x', label: '', points: 45, receipts: [] }]).level).toBe('suspicious');
    expect(decide([{ id: 'x', label: '', points: 95, receipts: [] }])).toEqual({ level: 'scam', score: 95 });
  });
});
