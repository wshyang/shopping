import type { SortKey } from '../domain/sort-filter';
import type { ReviewPanelViewModel, StatusCounts } from './use-review-panel';
import { appendChildren, createElement } from './dom';

export type ReviewPanelHandlers = {
  onStart(): void;
  onPause(): void;
  onResume(): void;
  onReset(): void;
  onMaximumItems(value: number): void;
  onMinimumReviews(value: number): void;
  onSort(value: SortKey): void;
  onSelectRecord(goodsId: string): void;
  onExportCsv(): void;
  onExportJson(): void;
};

export type ReviewPanel = { render(view: ReviewPanelViewModel): void; remove(): void };

type PanelElements = ReturnType<typeof createPanelElements>;

export function mountReviewPanel(handlers: ReviewPanelHandlers): ReviewPanel {
  const host = createElement('aside');
  host.id = 'shopper-review-panel';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = createElement('style');
  style.textContent = PANEL_STYLES;
  const elements = createPanelElements();
  shadow.append(style, elements.panel);
  document.documentElement.append(host);
  wirePanel(elements, handlers);

  return {
    render: (view) => renderPanel(elements, view, handlers),
    remove: () => host.remove(),
  };
}

function createPanelElements() {
  const panel = createElement('section', { className: 'panel' });
  const title = createElement('strong', { text: '评价助手' });
  const collapse = createElement('button', {
    text: '−',
    testId: 'review-panel__collapse-button',
    title: '收起或展开',
  });
  const header = createElement('header');
  appendChildren(header, [title, collapse]);
  const controls = createElement('div', { className: 'controls' });
  const start = makeButton('开始', 'review-panel__start-button');
  const pause = makeButton('暂停', 'review-panel__pause-button');
  const resume = makeButton('继续', 'review-panel__resume-button');
  const reset = makeButton('重置', 'review-panel__reset-button');
  appendChildren(controls, [start, pause, resume, reset]);
  const fields = createFields();
  const message = createElement('p', { className: 'message' });
  const list = createElement('div', { className: 'list' });
  const summary = createElement('div', {
    className: 'summary',
    testId: 'review-panel__status-summary',
  });
  const csv = makeButton('导出 CSV', 'review-panel__export-csv-button');
  const json = makeButton('导出 JSON', 'review-panel__export-json-button');
  const footer = createElement('footer');
  appendChildren(footer, [summary, csv, json]);
  const body = createElement('div', { className: 'body' });
  appendChildren(body, [controls, fields.container, message, list, footer]);
  appendChildren(panel, [header, body]);
  return {
    panel,
    body,
    collapse,
    start,
    pause,
    resume,
    reset,
    message,
    list,
    summary,
    csv,
    json,
    ...fields,
  };
}

function createFields() {
  const container = createElement('div', { className: 'fields' });
  const maximum = makeNumberInput({
    text: '上限',
    testId: 'review-panel__max-items-input',
    min: 1,
    max: 300,
  });
  const minimum = makeNumberInput({
    text: '最低评价',
    testId: 'review-panel__min-reviews-input',
    min: 0,
    max: 1_000_000_000,
  });
  const sort = createElement('select', { testId: 'review-panel__sort-select', title: '排序方式' });
  const options: Array<[SortKey, string]> = [
    ['position_asc', '原始顺序'],
    ['reviews_desc', '评价数 ↓'],
    ['sales_desc', '销量 ↓'],
    ['feedback_ratio_desc', '评价/销量 ↓'],
  ];
  options.forEach(([value, text]) => {
    const option = createElement('option', { text });
    option.value = value;
    sort.append(option);
  });
  const sortLabel = createElement('label', { text: '排序' });
  sortLabel.append(sort);
  appendChildren(container, [maximum.label, minimum.label, sortLabel]);
  return { container, maximum: maximum.input, minimum: minimum.input, sort };
}

type NumberInputOptions = { text: string; testId: string; min: number; max: number };

function makeNumberInput(options: NumberInputOptions) {
  const label = createElement('label', { text: options.text });
  const input = createElement('input', { testId: options.testId });
  input.type = 'number';
  input.min = String(options.min);
  input.max = String(options.max);
  input.inputMode = 'numeric';
  label.append(input);
  return { label, input };
}

function makeButton(text: string, testId: string): HTMLButtonElement {
  const button = createElement('button', { text, testId });
  button.type = 'button';
  return button;
}

function wirePanel(elements: PanelElements, handlers: ReviewPanelHandlers): void {
  elements.start.addEventListener('click', () => handlers.onStart());
  elements.pause.addEventListener('click', () => handlers.onPause());
  elements.resume.addEventListener('click', () => handlers.onResume());
  elements.reset.addEventListener('click', () => handlers.onReset());
  elements.csv.addEventListener('click', () => handlers.onExportCsv());
  elements.json.addEventListener('click', () => handlers.onExportJson());
  elements.maximum.addEventListener('change', () =>
    handlers.onMaximumItems(elements.maximum.valueAsNumber),
  );
  elements.minimum.addEventListener('input', () =>
    handlers.onMinimumReviews(elements.minimum.valueAsNumber),
  );
  elements.sort.addEventListener('change', () => handlers.onSort(elements.sort.value as SortKey));
  elements.collapse.addEventListener('click', () => togglePanel(elements));
}

function togglePanel(elements: PanelElements): void {
  const isCollapsed = elements.body.hidden;
  elements.body.hidden = !isCollapsed;
  elements.collapse.textContent = isCollapsed ? '−' : '+';
  elements.collapse.setAttribute('aria-expanded', String(isCollapsed));
}

function renderPanel(
  elements: PanelElements,
  view: ReviewPanelViewModel,
  handlers: ReviewPanelHandlers,
): void {
  setInputUnlessFocused(elements.maximum, view.maxItems);
  setInputUnlessFocused(elements.minimum, view.minimumReviews);
  elements.sort.value = view.sort;
  elements.start.disabled = view.phase === 'running' || view.phase === 'paused';
  elements.maximum.disabled = view.phase === 'running' || view.phase === 'paused';
  elements.pause.disabled = view.phase !== 'running';
  elements.resume.disabled = view.phase !== 'paused';
  elements.reset.disabled = view.phase === 'idle';
  elements.csv.disabled = !view.canExport;
  elements.json.disabled = !view.canExport;
  elements.message.textContent = view.layoutError ?? view.pauseReason ?? '';
  elements.summary.textContent = getStatusSummary(view.progress, view.statusCounts);
  renderRows(elements.list, view, (goodsId) => handlers.onSelectRecord(goodsId));
}

function setInputUnlessFocused(input: HTMLInputElement, value: number): void {
  const root = input.getRootNode();
  if (root instanceof ShadowRoot && root.activeElement === input) return;
  input.value = String(value);
}

function renderRows(
  list: HTMLElement,
  view: ReviewPanelViewModel,
  onSelect: (goodsId: string) => void,
): void {
  const fragment = document.createDocumentFragment();
  view.records.forEach((record) => {
    const button = createElement('button', {
      className: 'row',
      testId: 'review-panel__row',
      title: record.errorMessage ?? '定位到商品',
    });
    button.type = 'button';
    button.addEventListener('click', () => onSelect(record.goodsId));
    const rank = createElement('span', { className: 'rank', text: `#${record.position}` });
    const title = createElement('span', { className: 'title', text: record.title });
    const detail = createElement('span', { className: 'detail', text: formatRowDetail(record) });
    appendChildren(button, [rank, title, detail]);
    fragment.append(button);
  });
  list.replaceChildren(fragment);
}

function formatRowDetail(record: ReviewPanelViewModel['records'][number]): string {
  const reviews =
    record.reviewCount === null
      ? statusLabel(record.status)
      : record.reviewCount.toLocaleString('zh-CN');
  return `${record.priceText || '价格未知'} · ${record.salesLabel?.raw ?? '销量未知'} · 评价 ${reviews}`;
}

function statusLabel(status: ReviewPanelViewModel['records'][number]['status']): string {
  const labels = {
    pending: '…',
    ok: '0',
    not_found: '?',
    blocked: '⛔',
    error: '?',
    skipped_cap: '—',
  };
  return labels[status];
}

function getStatusSummary(
  progress: ReviewPanelViewModel['progress'],
  counts: StatusCounts,
): string {
  return `${progress.completed}/${progress.total} · 成功 ${counts.ok} · 未找到 ${counts.not_found} · 错误 ${counts.error} · 跳过 ${counts.skipped_cap}`;
}

const PANEL_STYLES = `
  :host { all:initial; position:fixed; right:12px; bottom:12px; z-index:2147483647; color:#24262b; font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  * { box-sizing:border-box; }
  .panel { width:min(370px,calc(100vw - 24px)); max-height:min(650px,calc(100vh - 24px)); overflow:hidden; border:1px solid #e2e4e8; border-radius:14px; background:#fff; box-shadow:0 12px 40px rgba(0,0,0,.2); }
  header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; color:white; background:#d9363e; }
  header button { min-width:28px; color:white; border-color:rgba(255,255,255,.5); background:transparent; }
  .body { padding:10px; }
  button,input,select { min-height:32px; border:1px solid #d8dadd; border-radius:7px; background:white; font:inherit; }
  button { padding:5px 9px; cursor:pointer; }
  button:disabled { cursor:not-allowed; opacity:.45; }
  .controls { display:flex; gap:6px; }
  .fields { display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:7px; margin-top:8px; }
  label { color:#666; font-size:11px; }
  label input,label select { display:block; width:100%; margin-top:3px; color:#222; }
  .message { min-height:0; margin:7px 0; color:#a61d24; }
  .message:empty { display:none; }
  .list { max-height:340px; overflow:auto; border-block:1px solid #eee; }
  .row { display:grid; width:100%; grid-template-columns:35px 1fr; gap:2px 5px; padding:7px 3px; border:0; border-radius:0; border-bottom:1px solid #f1f1f1; text-align:left; }
  .row:hover { background:#fff5f5; }
  .rank { grid-row:1/3; color:#8a8f98; }
  .title { overflow:hidden; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
  .detail { overflow:hidden; color:#6b7078; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
  footer { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:6px; padding-top:8px; }
  .summary { color:#666; font-size:11px; }
`;
