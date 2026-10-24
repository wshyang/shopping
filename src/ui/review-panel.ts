import type { PanelViewModel } from './use-review-panel.js';
import type { SortKey } from '../domain/sort-filter.js';

export type PanelCallbacks = {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSortChange: (key: SortKey) => void;
  onMinReviewsChange: (value: number | null) => void;
  onMaxItemsChange: (value: number) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onRowClick: (goodsId: string) => void;
};

function createShadowHost(): HTMLElement {
  const host = document.createElement('div');
  host.id = 'shopper-panel-host';
  host.style.position = 'fixed';
  host.style.bottom = '16px';
  host.style.right = '16px';
  host.style.zIndex = '2147483647';
  return host;
}

function getShadowRoot(host: HTMLElement): ShadowRoot {
  const existing = host.shadowRoot;
  if (existing !== null) return existing;
  return host.attachShadow({ mode: 'open' });
}

function buildStyles(): string {
  return `
    :host { font-family: system-ui, sans-serif; font-size: 13px; }
    .panel { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; width: 380px; max-height: 70vh; overflow-y: auto; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .title { font-weight: 700; font-size: 14px; }
    .controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .controls button { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; background: #f5f5f5; }
    .controls button:disabled { opacity: 0.4; cursor: not-allowed; }
    .inputs { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .inputs label { font-size: 12px; }
    .inputs input, .inputs select { padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; width: 80px; }
    .blocked { background: #fff3cd; border: 1px solid #ffc107; padding: 6px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px; }
    .rows { border-top: 1px solid #eee; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
    .row:hover { background: #fafafa; }
    .status-summary { font-size: 11px; color: #666; margin-top: 8px; }
    .export { display: flex; gap: 6px; margin-top: 8px; }
    .export button { flex: 1; }
    .badge-count { font-weight: 600; }
  `;
}

function renderControls(viewModel: PanelViewModel, callbacks: PanelCallbacks): string {
  const isRunning = viewModel.state === 'running';
  const isPaused = viewModel.state === 'paused';
  const isIdle = viewModel.state === 'idle';
  const isDone = viewModel.state === 'done';

  return `
    <div class="controls">
      <button data-testid="review-panel__start-button" ${!isIdle && !isDone ? 'disabled' : ''}>开始</button>
      <button data-testid="review-panel__pause-button" ${!isRunning ? 'disabled' : ''}>暂停</button>
      <button data-testid="review-panel__resume-button" ${!isPaused ? 'disabled' : ''}>继续</button>
      <button data-testid="review-panel__reset-button">重置</button>
    </div>
  `;
}

function renderInputs(viewModel: PanelViewModel): string {
  return `
    <div class="inputs">
      <label>最多 <input data-testid="review-panel__max-items-input" type="number" value="${viewModel.maxItems}" min="1" max="300" /></label>
      <label>最低评价 <input data-testid="review-panel__min-reviews-input" type="number" value="${viewModel.minReviews ?? ''}" placeholder="不限" /></label>
      <select data-testid="review-panel__sort-select">
        <option value="reviews_desc" ${viewModel.sortKey === 'reviews_desc' ? 'selected' : ''}>评价数 ↓</option>
        <option value="sales_desc" ${viewModel.sortKey === 'sales_desc' ? 'selected' : ''}>销量 ↓</option>
        <option value="position_asc" ${viewModel.sortKey === 'position_asc' ? 'selected' : ''}>排名 ↑</option>
        <option value="ratio_desc" ${viewModel.sortKey === 'ratio_desc' ? 'selected' : ''}>评价/销量 ↓</option>
      </select>
    </div>
  `;
}

function renderRows(viewModel: PanelViewModel): string {
  if (viewModel.rows.length === 0) {
    return '<div class="rows"><div style="padding:8px;color:#999;">暂无数据</div></div>';
  }
  const rowsHtml = viewModel.rows.map(renderSingleRow).join('');
  return `<div class="rows">${rowsHtml}</div>`;
}

function renderSingleRow(record: {
  goodsId: string;
  title: string;
  priceText: string;
  reviewCount: number | null;
  status: string;
}): string {
  const reviewText = formatReviewCount(record);
  const titleShort = escapeHtml(record.title.slice(0, 30));
  return `
    <div data-testid="review-panel__row" data-goods-id="${escapeHtml(record.goodsId)}">
      <span>${titleShort}</span>
      <span>${escapeHtml(record.priceText)}</span>
      <span>${reviewText}</span>
      <span>${escapeHtml(record.status)}</span>
    </div>
  `;
}

function formatReviewCount(record: { reviewCount: number | null; status: string }): string {
  if (record.status === 'pending') return '…';
  if (record.reviewCount !== null) return String(record.reviewCount);
  return '?';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildPanelHtml(viewModel: PanelViewModel, callbacks: PanelCallbacks): string {
  const blockedHtml = viewModel.blockedMessage !== null
    ? `<div class="blocked">${escapeHtml(viewModel.blockedMessage)}</div>`
    : '';

  return `
    <style>${buildStyles()}</style>
    <div class="panel">
      <div class="header">
        <span class="title">评价数采集</span>
        <span data-testid="review-panel__status-summary" class="status-summary">${viewModel.progress.done}/${viewModel.progress.total}</span>
      </div>
      ${blockedHtml}
      ${renderControls(viewModel, callbacks)}
      ${renderInputs(viewModel)}
      ${renderRows(viewModel)}
      <div class="export">
        <button data-testid="review-panel__export-csv-button" ${!viewModel.canExport ? 'disabled' : ''}>导出 CSV</button>
        <button data-testid="review-panel__export-json-button" ${!viewModel.canExport ? 'disabled' : ''}>导出 JSON</button>
      </div>
    </div>
  `;
}

function attachEventHandlers(root: ShadowRoot, callbacks: PanelCallbacks): void {
  attachButtonHandlers(root, callbacks);
  attachInputHandlers(root, callbacks);
  attachRowHandlers(root, callbacks);
}

function attachButtonHandlers(root: ShadowRoot, callbacks: PanelCallbacks): void {
  const startButton = root.querySelector('[data-testid="review-panel__start-button"]');
  const pauseButton = root.querySelector('[data-testid="review-panel__pause-button"]');
  const resumeButton = root.querySelector('[data-testid="review-panel__resume-button"]');
  const resetButton = root.querySelector('[data-testid="review-panel__reset-button"]');
  const exportCsvButton = root.querySelector('[data-testid="review-panel__export-csv-button"]');
  const exportJsonButton = root.querySelector('[data-testid="review-panel__export-json-button"]');

  startButton?.addEventListener('click', callbacks.onStart);
  pauseButton?.addEventListener('click', callbacks.onPause);
  resumeButton?.addEventListener('click', callbacks.onResume);
  resetButton?.addEventListener('click', callbacks.onReset);
  exportCsvButton?.addEventListener('click', callbacks.onExportCsv);
  exportJsonButton?.addEventListener('click', callbacks.onExportJson);
}

function attachInputHandlers(root: ShadowRoot, callbacks: PanelCallbacks): void {
  const maxItemsInput = root.querySelector('[data-testid="review-panel__max-items-input"]') as HTMLInputElement | null;
  const minReviewsInput = root.querySelector('[data-testid="review-panel__min-reviews-input"]') as HTMLInputElement | null;
  const sortSelect = root.querySelector('[data-testid="review-panel__sort-select"]') as HTMLSelectElement | null;

  maxItemsInput?.addEventListener('change', () => handleMaxItemsChange(maxItemsInput, callbacks));
  minReviewsInput?.addEventListener('change', () => handleMinReviewsChange(minReviewsInput, callbacks));
  sortSelect?.addEventListener('change', () => handleSortChange(sortSelect, callbacks));
}

function handleMaxItemsChange(input: HTMLInputElement, callbacks: PanelCallbacks): void {
  const value = parseInt(input.value, 10);
  if (!Number.isNaN(value)) callbacks.onMaxItemsChange(value);
}

function handleMinReviewsChange(input: HTMLInputElement, callbacks: PanelCallbacks): void {
  const raw = input.value.trim();
  if (raw === '') { callbacks.onMinReviewsChange(null); return; }
  const value = parseInt(raw, 10);
  if (!Number.isNaN(value)) callbacks.onMinReviewsChange(value);
}

function handleSortChange(select: HTMLSelectElement, callbacks: PanelCallbacks): void {
  callbacks.onSortChange(select.value as SortKey);
}

function attachRowHandlers(root: ShadowRoot, callbacks: PanelCallbacks): void {
  const rows = root.querySelectorAll('[data-testid="review-panel__row"]');
  for (const row of rows) {
    row.addEventListener('click', () => {
      const goodsId = (row as HTMLElement).dataset.goodsId;
      if (goodsId !== undefined) callbacks.onRowClick(goodsId);
    });
  }
}

export function createReviewPanel(callbacks: PanelCallbacks): {
  mount: () => HTMLElement;
  render: (viewModel: PanelViewModel) => void;
  unmount: () => void;
} {
  let host: HTMLElement | null = null;

  function mount(): HTMLElement {
    const existing = document.getElementById('shopper-panel-host');
    if (existing !== null) { host = existing; return host; }
    host = createShadowHost();
    document.body.appendChild(host);
    return host;
  }

  function render(viewModel: PanelViewModel): void {
    if (host === null) mount();
    const currentHost = host ?? document.getElementById('shopper-panel-host');
    if (currentHost === null) return;
    host = currentHost as HTMLElement;
    const shadow = getShadowRoot(host);
    shadow.innerHTML = buildPanelHtml(viewModel, callbacks);
    attachEventHandlers(shadow, callbacks);
  }

  function unmount(): void {
    host?.remove();
    host = null;
  }

  return { mount, render, unmount };
}
