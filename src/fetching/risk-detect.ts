export type ResponseEvidence = {
  status: number;
  url: string;
  redirected: boolean;
  body: string;
};

const CHALLENGE_PATH = /\/(?:login|verify|captcha|risk|challenge)(?:[/.?_-]|$)/i;
const BODY_MARKERS = [
  /访问过于频繁/,
  /请完成(?:安全)?验证/,
  /请输入验证码/,
  /异常访问/,
  /账号存在风险/,
];

export function detectRiskControl(evidence: ResponseEvidence): boolean {
  if (evidence.status === 403 || evidence.status === 429) return true;
  if (hasChallengeUrl(evidence.url)) return true;
  return BODY_MARKERS.some((marker) => marker.test(evidence.body));
}

function hasChallengeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://mobile.pinduoduo.com');
    return CHALLENGE_PATH.test(`${parsed.pathname}${parsed.search}`);
  } catch {
    return CHALLENGE_PATH.test(url);
  }
}
