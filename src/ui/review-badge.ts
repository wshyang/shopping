import type { GoodsRecord } from '../domain/goods-record';
import { createElement } from './dom';

export type ReviewBadge = { render(record: GoodsRecord): void; remove(): void };

export function mountReviewBadge(card: HTMLElement, record: GoodsRecord): ReviewBadge {
  const host = createElement('span', { className: 'shopper-badge-host' });
  const shadow = host.attachShadow({ mode: 'open' });
  const style = createElement('style');
  style.textContent = BADGE_STYLES;
  const badge = createElement('span', { testId: 'review-badge__count' });
  shadow.append(style, badge);
  card.append(host);

  function render(next: GoodsRecord): void {
    badge.textContent = getBadgeText(next);
    badge.className = getBadgeClass(next);
    badge.title = next.errorMessage ?? getBadgeTitle(next);
  }

  render(record);
  return { render, remove: () => host.remove() };
}

function getBadgeText(record: GoodsRecord): string {
  if (record.status === 'blocked') return '评价 ⛔';
  if (record.status === 'pending') return '评价 …';
  if (record.status === 'skipped_cap') return '评价 —';
  if (record.status !== 'ok' || record.reviewCount === null) return '评价 ?';
  return `评价 ${record.reviewCount.toLocaleString('zh-CN')}`;
}

function getBadgeTitle(record: GoodsRecord): string {
  if (record.status === 'pending') return '等待收集评价数';
  if (record.status === 'skipped_cap') return '超出本次收集上限';
  if (record.source === 'cache') return '来自本地缓存';
  return '商品评价数';
}

function getBadgeClass(record: GoodsRecord): string {
  if (record.status !== 'ok' || record.reviewCount === null) return `badge badge--${record.status}`;
  if (record.reviewCount < 100) return 'badge badge--low';
  if (record.reviewCount < 1_000) return 'badge badge--medium';
  if (record.reviewCount < 10_000) return 'badge badge--high';
  return 'badge badge--very-high';
}

const BADGE_STYLES = `
  :host { display: inline-block; margin: 4px 0; font: 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .badge { display:inline-flex; padding:2px 7px; border-radius:999px; color:#5f6470; background:#f0f2f5; }
  .badge--low { color:#246b48; background:#e5f5ec; }
  .badge--medium { color:#186491; background:#e5f3fa; }
  .badge--high { color:#874d00; background:#fff1d6; }
  .badge--very-high { color:#a61d24; background:#ffebe9; font-weight:700; }
  .badge--blocked { color:#a61d24; background:#ffebe9; }
  .badge--error,.badge--not_found,.badge--skipped_cap { color:#6f747c; background:#f1f1f1; }
`;
