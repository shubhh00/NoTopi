import { describe, expect, it } from 'vitest';
import { assess, classify, type Db, type Evidence } from '../src/index';
import { realDb } from './helpers';

const none: Evidence = { searched: [], items: [] };
const full = realDb();
/** The database as it was before anyone wrote the SIR pattern: a brand-new scam. */
const withoutSir: Db = { ...full, patterns: full.patterns.filter((p) => p.id !== 'voter-sir') };

const SIR_SMS =
  'Dear INDIAN VOTER During SIR investigation Your Name and Your Father Name Documents are not Matched ' +
  'As per Rules Govt. Of India For more info. Now Contact our ECI Officer 9395197425 Reg. Goyal & Co';

const ids = (raw: string, db: Db = full) => assess(classify(raw), none, db).signals.map((s) => s.id);

describe('scam anatomy', () => {
  it('catches a scam with no pattern file from its structure alone', () => {
    const v = assess(classify(SIR_SMS), none, withoutSir);
    expect(v.pattern).toBeUndefined();
    expect(v.signals.map((s) => s.id)).toEqual(
      expect.arrayContaining(['anatomy.authority', 'anatomy.hook', 'anatomy.off-channel', 'anatomy.authority-mobile', 'anatomy.shape']),
    );
    expect(['suspicious', 'scam']).toContain(v.level);
  });

  it('still names it once the pattern exists', () => {
    const v = assess(classify(SIR_SMS), none, full);
    expect(v.pattern?.pattern.id).toBe('voter-sir');
    expect(v.level).toBe('scam');
  });

  it('flags a bank claim that asks you to call a mobile and share an OTP', () => {
    const v = assess(classify('Your SBI account is blocked. Call 98123 45678 and share the OTP to reactivate.'), none, withoutSir);
    expect(v.level).toBe('scam');
  });

  it.each([
    ['delivery partner call', 'Your Amazon order is out for delivery. Delivery partner Ravi: 98123 45678'],
    ['a real OTP message', 'Your OTP for HDFC Bank NetBanking is 482913. Do not share it with anyone.'],
    ['a friend', 'Call me at 98123 45678 when you reach the station'],
    ['a bill reminder', 'Your Airtel bill of Rs 499 is due on 12 Oct. Pay on the Airtel Thanks app.'],
    ['a bank statement', 'Your SBI account statement for September is ready. Call 1800 1234 for help.'],
  ])("doesn't call %s suspicious", (_, message) => {
    expect(['unknown', 'clean']).toContain(assess(classify(message), none, full).level);
  });

  it("doesn't apply the personal-mobile rule to companies", () => {
    expect(ids('Your Amazon order is out for delivery. Delivery partner Ravi: 98123 45678')).not.toContain('anatomy.authority-mobile');
  });

  it('highlights each part in the user’s own message', () => {
    const v = assess(classify(SIR_SMS), none, withoutSir);
    const off = v.signals.find((s) => s.id === 'anatomy.off-channel')!;
    const r = off.receipts[0]!;
    expect(r.site).toBe('Your message');
    expect(r.quote.slice(r.highlight![0], r.highlight![1])).toBe('9395197425');
  });
});
