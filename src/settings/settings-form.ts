import type { Settings } from './settings';
import { appendChildren, createElement } from '../ui/dom';

type NumberField = ReturnType<typeof numberField>;
type SettingsFormElements = {
  form: HTMLFormElement;
  maximum: NumberField;
  concurrency: ReturnType<typeof selectField>;
  minimumDelay: NumberField;
  maximumDelay: NumberField;
  ttl: NumberField;
  autoStart: ReturnType<typeof checkboxField>;
  status: HTMLParagraphElement;
};

export function mountSettingsForm(
  container: HTMLElement,
  settings: Settings,
  onSave: (settings: Settings) => Promise<void>,
): void {
  const title = createElement('h1', { text: '拼多多评价助手' });
  const description = createElement('p', {
    text: '设置会同步到你的 Chromium 浏览器。请求始终由你在搜索页主动开始。',
  });
  const elements = createSettingsForm(settings);
  appendChildren(container, [title, description, elements.form]);
  wireSettingsForm(elements, onSave);
}

function createSettingsForm(settings: Settings): SettingsFormElements {
  const form = createElement('form');
  const fields = createSettingsFields(settings);
  const warning = createElement('p', {
    className: 'warning',
    text: '自动请求可能触发平台风控。遇到验证时助手会立即暂停。',
  });
  const save = createElement('button', {
    text: '保存设置',
    testId: 'settings-form__save-button',
  });
  save.type = 'submit';
  const status = createElement('p', {
    className: 'status',
    testId: 'settings-form__status',
  });
  appendChildren(form, [...getFieldLabels(fields), warning, save, status]);
  return { form, ...fields, status };
}

function createSettingsFields(settings: Settings) {
  return {
    maximum: numberField({
      text: '每次最多商品',
      testId: 'settings-form__max-items-input',
      value: settings.maxItems,
      min: 1,
      max: 300,
    }),
    concurrency: selectField(settings.concurrency),
    minimumDelay: numberField({
      text: '最短间隔（毫秒）',
      testId: 'settings-form__minimum-delay-input',
      value: settings.delayMs.min,
      min: 100,
      max: 30_000,
    }),
    maximumDelay: numberField({
      text: '最长间隔（毫秒）',
      testId: 'settings-form__maximum-delay-input',
      value: settings.delayMs.max,
      min: 100,
      max: 60_000,
    }),
    ttl: numberField({
      text: '缓存时长（小时）',
      testId: 'settings-form__cache-ttl-input',
      value: settings.cacheTtlHours,
      min: 1,
      max: 720,
    }),
    autoStart: checkboxField(settings.autoStart),
  };
}

function getFieldLabels(fields: ReturnType<typeof createSettingsFields>): HTMLLabelElement[] {
  return [
    fields.maximum.label,
    fields.concurrency.label,
    fields.minimumDelay.label,
    fields.maximumDelay.label,
    fields.ttl.label,
    fields.autoStart.label,
  ];
}

function wireSettingsForm(
  elements: SettingsFormElements,
  onSave: (settings: Settings) => Promise<void>,
): void {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = readForm(elements);
    elements.status.textContent = '保存中…';
    void onSave(value)
      .then(() => {
        elements.status.textContent = '已保存';
      })
      .catch(() => {
        elements.status.textContent = '保存失败，请重试';
      });
  });
}

type NumberFieldOptions = {
  text: string;
  testId: string;
  value: number;
  min: number;
  max: number;
};

function numberField(options: NumberFieldOptions) {
  const label = createElement('label', { text: options.text });
  const input = createElement('input', { testId: options.testId });
  input.type = 'number';
  input.value = String(options.value);
  input.min = String(options.min);
  input.max = String(options.max);
  input.required = true;
  label.append(input);
  return { label, input };
}

function selectField(value: 1 | 2) {
  const label = createElement('label', { text: '并发请求数' });
  const select = createElement('select', { testId: 'settings-form__concurrency-select' });
  const one = createElement('option', { text: '1（推荐）' });
  one.value = '1';
  const two = createElement('option', { text: '2' });
  two.value = '2';
  select.append(one, two);
  select.value = String(value);
  label.append(select);
  return { label, select };
}

function checkboxField(checked: boolean) {
  const label = createElement('label', { className: 'checkbox' });
  const input = createElement('input', { testId: 'settings-form__auto-start-checkbox' });
  input.type = 'checkbox';
  input.checked = checked;
  label.append(input, '打开搜索页后自动开始');
  return { label, input };
}

function readForm(fields: SettingsFormElements): Settings {
  return {
    maxItems: fields.maximum.input.valueAsNumber,
    concurrency: fields.concurrency.select.value === '2' ? 2 : 1,
    delayMs: {
      min: fields.minimumDelay.input.valueAsNumber,
      max: fields.maximumDelay.input.valueAsNumber,
    },
    cacheTtlHours: fields.ttl.input.valueAsNumber,
    autoStart: fields.autoStart.input.checked,
  };
}
