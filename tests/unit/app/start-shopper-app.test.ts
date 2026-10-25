import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startShopperApp } from '../../../src/app/start-shopper-app';
import { DEFAULT_SETTINGS } from '../../../src/settings/settings';
import { createMemoryStorage } from '../support/memory-storage';

describe('shopper application composition', () => {
  beforeEach(() => {
    document.documentElement.replaceChildren(
      document.createElement('head'),
      document.createElement('body'),
    );
  });

  it('discovers a card, mounts isolated UI, and collects on user start', async () => {
    document.body.innerHTML = `<article><a href="/goods.html?goods_id=42" title="洗衣粉"></a><span>¥19.9</span><span>热销3.5万+件</span></article>`;
    const fetchReviewCount = vi.fn(async () => ({
      outcome: {
        status: 'ok' as const,
        reviewCount: 321,
        errorMessage: null,
        fetchedAt: '2026-10-24T00:00:00.000Z',
        source: 'network' as const,
      },
      shouldRetry: false,
    }));
    const settings = { ...DEFAULT_SETTINGS, delayMs: { min: 100, max: 100 } };
    const stop = await startShopperApp({
      localStorage: createMemoryStorage(),
      syncStorage: createMemoryStorage({ settings }),
      fetcher: { fetchReviewCount },
    });

    const panel = document.querySelector<HTMLElement>('#shopper-review-panel')?.shadowRoot;
    const badge = document.querySelector<HTMLElement>('.shopper-badge-host')?.shadowRoot;
    expect(panel).not.toBeNull();
    expect(badge?.textContent).toContain('评价 …');
    panel?.querySelector<HTMLButtonElement>('[data-testid="review-panel__start-button"]')?.click();

    await vi.waitFor(() => expect(badge?.textContent).toContain('评价 321'));
    expect(fetchReviewCount).toHaveBeenCalledWith('42');
    expect(
      panel?.querySelector('[data-testid="review-panel__status-summary"]')?.textContent,
    ).toContain('成功 1');
    stop();
    expect(document.querySelector('#shopper-review-panel')).toBeNull();
  });

  it('shows a visible layout error when no product link can be found', async () => {
    document.body.textContent = 'unknown page';
    const stop = await startShopperApp({
      localStorage: createMemoryStorage(),
      syncStorage: createMemoryStorage(),
      fetcher: { fetchReviewCount: vi.fn() },
    });
    const text =
      document.querySelector<HTMLElement>('#shopper-review-panel')?.shadowRoot?.textContent;
    expect(text).toContain('无法读取当前页面布局');
    stop();
  });
});
