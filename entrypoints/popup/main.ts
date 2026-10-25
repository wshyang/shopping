import {
  loadSettings,
  saveSettings,
  validateSettings,
} from "../../src/settings/settings";
async function main() {
  const settings = await loadSettings();
  const form = document.querySelector<HTMLFormElement>("#settings")!;
  const values = [
    ["maxItems", "最多商品", settings.maxItems, 1, 300],
    ["concurrency", "并发请求", settings.concurrency, 1, 2],
    ["min", "最小间隔（毫秒）", settings.delayMs.min, 800, 60000],
    ["max", "最大间隔（毫秒）", settings.delayMs.max, 800, 60000],
    ["cacheTtlHours", "缓存有效期（小时）", settings.cacheTtlHours, 1, 168],
  ] as const;
  const inputs = new Map<string, HTMLInputElement>();
  for (const [key, title, value, min, max] of values) {
    const label = document.createElement("label");
    label.textContent = title;
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.required = true;
    input.dataset.testid = `settings__${key}-input`;
    inputs.set(key, input);
    label.append(input);
    form.append(label, document.createElement("br"));
  }
  const button = document.createElement("button");
  button.textContent = "保存";
  button.dataset.testid = "settings__save-button";
  form.append(button);
  const number = (key: string) => Number(inputs.get(key)!.value);
  form.onsubmit = async (event) => {
    event.preventDefault();
    const message = document.querySelector("#message")!;
    try {
      await saveSettings(
        validateSettings({
          maxItems: number("maxItems"),
          concurrency: number("concurrency"),
          delayMs: { min: number("min"), max: number("max") },
          cacheTtlHours: number("cacheTtlHours"),
        }),
      );
      message.textContent = "已保存，请刷新搜索页以应用设置。";
    } catch {
      message.textContent = "保存失败，请重试。";
    }
  };
  document.body.style.cssText = "font:14px system-ui;width:320px;padding:12px";
}
void main();
