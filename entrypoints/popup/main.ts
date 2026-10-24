import { createSettingsStore } from '../../src/settings/settings.js';
import type { Settings } from '../../src/domain/goods-record.js';
import { DEFAULT_SETTINGS } from '../../src/domain/goods-record.js';

function buildForm(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = getFormHtml();
  return container;
}

function getFormHtml(): string {
  return `
    <style>
      body { font-family: system-ui, sans-serif; width: 320px; padding: 16px; margin: 0; }
      h1 { font-size: 14px; margin: 0 0 12px; }
      label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
      input, select { width: 100px; padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; }
      button { margin-top: 12px; padding: 6px 16px; background: #ff5722; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
      .hint { font-size: 11px; color: #888; margin-top: 8px; }
    </style>
    <h1>shopper 设置</h1>
    <label>最多采集 <input data-testid="popup__max-items-input" type="number" min="1" max="300" /></label>
    <label>并发 <select data-testid="popup__concurrency-select"><option value="1">1</option><option value="2">2</option></select></label>
    <label>延迟下限 (ms) <input data-testid="popup__delay-min-input" type="number" min="100" max="5000" /></label>
    <label>延迟上限 (ms) <input data-testid="popup__delay-max-input" type="number" min="100" max="5000" /></label>
    <label>缓存 (小时) <input data-testid="popup__cache-ttl-input" type="number" min="1" max="720" /></label>
    <label>自动开始 <input data-testid="popup__auto-start-input" type="checkbox" /></label>
    <button data-testid="popup__save-button">保存</button>
    <div class="hint">保存后刷新 PDD 搜索页生效</div>
  `;
}

function fillForm(container: HTMLElement, settings: Settings): void {
  setInputValue(container, 'popup__max-items-input', String(settings.maxItems));
  setSelectValue(container, 'popup__concurrency-select', String(settings.concurrency));
  setInputValue(container, 'popup__delay-min-input', String(settings.delayMs.min));
  setInputValue(container, 'popup__delay-max-input', String(settings.delayMs.max));
  setInputValue(container, 'popup__cache-ttl-input', String(settings.cacheTtlHours));
  setCheckboxValue(container, 'popup__auto-start-input', settings.autoStart);
}

function setInputValue(container: HTMLElement, testId: string, value: string): void {
  const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
  if (input !== null) input.value = value;
}

function setSelectValue(container: HTMLElement, testId: string, value: string): void {
  const select = container.querySelector(`[data-testid="${testId}"]`) as HTMLSelectElement | null;
  if (select !== null) select.value = value;
}

function setCheckboxValue(container: HTMLElement, testId: string, checked: boolean): void {
  const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
  if (input !== null) input.checked = checked;
}

function readForm(container: HTMLElement): Settings {
  return {
    maxItems: readNumber(container, 'popup__max-items-input', DEFAULT_SETTINGS.maxItems),
    concurrency: readSelectConcurrency(container),
    delayMs: {
      min: readNumber(container, 'popup__delay-min-input', DEFAULT_SETTINGS.delayMs.min),
      max: readNumber(container, 'popup__delay-max-input', DEFAULT_SETTINGS.delayMs.max),
    },
    cacheTtlHours: readNumber(container, 'popup__cache-ttl-input', DEFAULT_SETTINGS.cacheTtlHours),
    autoStart: readCheckbox(container, 'popup__auto-start-input'),
  };
}

function readNumber(container: HTMLElement, testId: string, fallback: number): number {
  const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
  if (input === null) return fallback;
  const parsed = parseInt(input.value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readSelectConcurrency(container: HTMLElement): 1 | 2 {
  const select = container.querySelector('[data-testid="popup__concurrency-select"]') as HTMLSelectElement | null;
  if (select === null) return 1;
  return select.value === '2' ? 2 : 1;
}

function readCheckbox(container: HTMLElement, testId: string): boolean {
  const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | null;
  return input !== null ? input.checked : false;
}

async function initializePopup(): Promise<void> {
  const store = createSettingsStore();
  const settings = await store.load();
  const app = document.getElementById('app');
  if (app === null) return;
  const form = buildForm();
  fillForm(form, settings);
  app.appendChild(form);
  const saveButton = form.querySelector('[data-testid="popup__save-button"]') as HTMLButtonElement | null;
  saveButton?.addEventListener('click', async () => {
    const nextSettings = readForm(form);
    await store.save(nextSettings);
    saveButton.textContent = '已保存';
    window.setTimeout(() => { saveButton.textContent = '保存'; }, 1500);
  });
}

void initializePopup();
