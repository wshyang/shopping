import { describe, expect, it } from 'vitest';
import { detectRiskControl } from '../../../src/fetching/risk-detect';

describe('detectRiskControl', () => {
  it.each([403, 429])('blocks status %s', (status) => {
    expect(
      detectRiskControl({
        status,
        url: 'https://mobile.pinduoduo.com/goods.html',
        redirected: false,
        body: '',
      }),
    ).toBe(true);
  });

  it.each(['/login.html', '/verify.html', '/captcha/index.html'])(
    'blocks challenge URLs',
    (path) => {
      expect(
        detectRiskControl({
          status: 200,
          url: `https://mobile.pinduoduo.com${path}`,
          redirected: true,
          body: '',
        }),
      ).toBe(true);
    },
  );

  it.each(['访问过于频繁，请稍后再试', '请完成安全验证', '请输入验证码'])(
    'blocks explicit body markers',
    (body) => {
      expect(
        detectRiskControl({
          status: 200,
          url: 'https://mobile.pinduoduo.com/goods.html',
          redirected: false,
          body,
        }),
      ).toBe(true);
    },
  );

  it('does not block ordinary product copy that mentions logging in', () => {
    expect(
      detectRiskControl({
        status: 200,
        url: 'https://mobile.pinduoduo.com/goods.html',
        redirected: false,
        body: '登录后可收藏本商品',
      }),
    ).toBe(false);
  });
});
