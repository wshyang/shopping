import { describe, it, expect } from 'vitest';
import { isBlocked } from '../../src/fetching/risk-detect.js';

describe('isBlocked', () => {
  it('flags 403', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1', status: 403, body: 'ok' })).toBe(true);
  });

  it('flags 429', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1', status: 429, body: 'ok' })).toBe(true);
  });

  it('flags body with 人机验证', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1', status: 200, body: '人机验证 required' })).toBe(true);
  });

  it('flags body with captcha', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1', status: 200, body: 'please solve captcha' })).toBe(true);
  });

  it('flags redirect to captcha URL', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/captcha.html', status: 200, body: 'ok' })).toBe(true);
  });

  it('does not flag normal 200 with review', () => {
    expect(isBlocked({ url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1', status: 200, body: '商品评价(999)' })).toBe(false);
  });
});
