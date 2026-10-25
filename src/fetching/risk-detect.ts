export function isBlocked(response: {
  status: number;
  url: string;
  body: string;
}): boolean {
  if ([401, 403, 429].includes(response.status)) return true;
  try {
    const url = new URL(response.url);
    if (
      url.hostname !== "mobile.pinduoduo.com" ||
      /(?:login|verify|captcha|challenge)/i.test(url.pathname)
    )
      return true;
  } catch {
    return true;
  }
  // Conservative visible challenge markers; not claimed to be confirmed PDD signatures.
  const text = response.body.replace(/<script\b[^>]*>[^]*?<\/script>/gi, "");
  return /请完成验证|安全验证|访问过于频繁|验证码验证|拖动滑块/.test(text);
}
