import { describe, expect, it } from 'vitest';
import { classify, extractEntities } from '../src/index';

describe('classify', () => {
  it.each([
    ['+91 98765 43210', 'phone', '+919876543210'],
    ['098765-43210', 'phone', '+919876543210'],
    ['9876543210', 'phone', '+919876543210'],
    ['1800 208 1234', 'phone', '18002081234'],
    ['sbi-kyc-update.in', 'url', 'https://sbi-kyc-update.in'],
    ['in.linkedin.com', 'url', 'https://in.linkedin.com'],
    ['https://bit.ly/3xYz', 'url', 'https://bit.ly/3xYz'],
    ['com.phonepe.app', 'app', 'com.phonepe.app'],
    ['in.amazon.mShop.android.shopping', 'app', 'in.amazon.mShop.android.shopping'],
    ['https://play.google.com/store/apps/details?id=com.cash.now&hl=en', 'app', 'com.cash.now'],
    ['Your electricity will be disconnected tonight', 'text', 'Your electricity will be disconnected tonight'],
  ])('%s → %s', (raw, kind, value) => {
    expect(classify(raw)).toMatchObject({ kind, value });
  });
});

describe('extractEntities', () => {
  it('finds links and numbers inside a message', () => {
    const msg = 'Dear customer, update KYC at sbi-kyc.xyz/login or call 98765 43210 now. Rs.500 fee.';
    expect(extractEntities(msg)).toEqual({
      urls: ['https://sbi-kyc.xyz/login'],
      phones: ['+919876543210'],
    });
  });
});
