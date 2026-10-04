import { describe, expect, it } from 'vitest';
import { classify, searchPlan } from '../src/index';
import { realDb } from './helpers';

// The free SerpApi plan has 250 searches a month. These keep each check cheap.
const db = realDb();

describe('search budget', () => {
  it.each([
    ['a phone number', '98765 43210', 2],
    ['a link', 'blingqueen.in', 2],
    ['a shop name', 'Bling Queen', 2],
    ['an app', 'com.cash.now', 3],
    ['a message with a number in it', 'Hello, please call me back on 98765 43210 about the parcel', 2],
    ['a message without a number', 'Hello, your parcel could not be delivered today, reply to reschedule', 1],
  ])('%s uses at most %i searches', (_, raw, max) => {
    expect(searchPlan(classify(raw), db).length).toBeLessThanOrEqual(max);
  });

  it("spends nothing on a message that's already a scam from its wording", () => {
    const sir =
      'Dear INDIAN VOTER During SIR investigation Your Name and Your Father Name Documents are not Matched ' +
      'As per Rules Govt. Of India For more info. Now Contact our ECI Officer 9395197425 Reg. Goyal & Co';
    expect(searchPlan(classify(sir), db)).toEqual([]);
  });
});
