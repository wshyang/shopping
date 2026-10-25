/**
 * Detects PDD risk-control / captcha / block signals.
 * Defensive defaults until recon (R7) narrows markers.
 */

const BLOCK_REDIRECT_PATTERNS: string[] = [
  'login',
  'captcha',
  'verify',
  'risk',
  'anti_spider',
  'antispider',
  'challenge',
  'sec-check',
];

const BLOCK_STATUS_CODES: number[] = [403, 429];

const BLOCK_BODY_MARKERS: string[] = [
  '风控',
  '人机验证',
  '验证',
  '频繁',
  'captcha',
  'risk control',
  'blocked',
  'access denied',
];

function isBlockedRedirect(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCK_REDIRECT_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isBlockedStatus(status: number): boolean {
  return BLOCK_STATUS_CODES.includes(status);
}

function hasBlockedBodyMarker(body: string): boolean {
  const lower = body.toLowerCase();
  return BLOCK_BODY_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

export type RiskCheckInput = {
  url: string;
  status: number;
  body: string;
  redirectedUrl?: string;
};

export function isBlocked(input: RiskCheckInput): boolean {
  if (isBlockedStatus(input.status)) return true;
  if (input.redirectedUrl !== undefined && isBlockedRedirect(input.redirectedUrl)) return true;
  if (isBlockedRedirect(input.url)) return true;
  if (hasBlockedBodyMarker(input.body)) return true;
  return false;
}

export function isBlockedResponse(response: Response, body: string): boolean {
  return isBlocked({
    url: response.url,
    status: response.status,
    body,
    redirectedUrl: response.redirected ? response.url : undefined,
  });
}
