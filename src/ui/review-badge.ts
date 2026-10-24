import type { GoodsRecord } from '../domain/goods-record.js';

type BadgeState = {
  goodsId: string;
  status: GoodsRecord['status'];
  reviewCount: number | null;
  errorMessage: string | null;
};

function getBadgeText(state: BadgeState): string {
  if (state.status === 'pending') return '评价 …';
  if (state.status === 'blocked') return '⛔';
  if (state.status === 'ok' && state.reviewCount !== null) return `评价 ${formatCount(state.reviewCount)}`;
  if (state.status === 'not_found' || state.status === 'error') return '评价 ?';
  if (state.status === 'skipped_cap') return '已跳过';
  return '评价 ?';
}

function formatCount(count: number): string {
  return count.toLocaleString('zh-CN');
}

function getBadgeColorBucket(state: BadgeState): string {
  if (state.reviewCount === null) return 'badge-unknown';
  if (state.reviewCount < 100) return 'badge-low';
  if (state.reviewCount < 1000) return 'badge-medium';
  if (state.reviewCount < 10_000) return 'badge-high';
  return 'badge-very-high';
}

function buildBadgeStyles(): string {
  return `
    .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 600; line-height: 1.6; }
    .badge-pending { background: #e0e0e0; color: #666; }
    .badge-low { background: #ffebee; color: #c62828; }
    .badge-medium { background: #fff3e0; color: #e65100; }
    .badge-high { background: #e8f5e9; color: #2e7d32; }
    .badge-very-high { background: #e3f2fd; color: #1565c0; }
    .badge-unknown { background: #f5f5f5; color: #999; }
    .badge-blocked { background: #ffccbc; color: #bf360c; }
  `;
}

function buildBadgeContent(state: BadgeState): string {
  const text = getBadgeText(state);
  const bucket = getBucketClass(state);
  const tooltip = buildTooltip(state);
  return `<span data-testid="review-badge__count" class="badge ${bucket}" title="${escapeAttr(tooltip)}">${escapeHtml(text)}</span>`;
}

function getBucketClass(state: BadgeState): string {
  if (state.status === 'blocked') return 'badge-blocked';
  if (state.status === 'pending') return 'badge-pending';
  return getBadgeColorBucket(state);
}

function buildTooltip(state: BadgeState): string {
  if (state.errorMessage !== null) return state.errorMessage;
  if (state.reviewCount !== null) return `评价数: ${state.reviewCount}`;
  return '';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function createReviewBadge(cardElement: Element, initialState: BadgeState): {
  update: (state: BadgeState) => void;
  remove: () => void;
} {
  const host = createBadgeHost();
  cardElement.appendChild(host);
  renderBadge(host, initialState);

  return {
    update: (state) => renderBadge(host, state),
    remove: () => host.remove(),
  };
}

function createBadgeHost(): HTMLElement {
  const host = document.createElement('span');
  host.className = 'shopper-badge-host';
  host.style.display = 'inline-block';
  host.style.marginLeft = '4px';
  return host;
}

function renderBadge(host: HTMLElement, state: BadgeState): void {
  let shadow = host.shadowRoot;
  if (shadow === null) shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${buildBadgeStyles()}</style>${buildBadgeContent(state)}`;
}

export function formatBadgeForTest(record: GoodsRecord): string {
  const state: BadgeState = {
    goodsId: record.goodsId,
    status: record.status,
    reviewCount: record.reviewCount,
    errorMessage: record.errorMessage,
  };
  return getBadgeText(state);
}
