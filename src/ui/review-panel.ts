import type { PanelModel } from "./use-review-panel";
import type { ViewSettings } from "../domain/sort-filter";
type Actions = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  cap: (cap: number) => void;
  view: (view: Partial<ViewSettings>) => void;
  select: (id: string) => void;
  export: (format: "csv" | "json") => void;
};
function button(
  label: string,
  role: string,
  action: () => void,
): HTMLButtonElement {
  const node = document.createElement("button");
  node.textContent = label;
  node.dataset.testid = `review-panel__${role}`;
  node.addEventListener("click", action);
  return node;
}
function input(
  label: string,
  role: string,
  value: number,
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = String(value);
  input.dataset.testid = `review-panel__${role}`;
  wrapper.append(input);
  return { label: wrapper, input };
}
function createControls(actions: Actions, cap: number) {
  const controls = document.createElement("div");
  const start = button("开始", "start-button", actions.start),
    pause = button("暂停", "pause-button", actions.pause),
    resume = button("继续", "resume-button", actions.resume),
    reset = button("重置", "reset-button", actions.reset);
  const max = input("最多商品 ", "max-items-input", cap);
  max.input.min = "1";
  max.input.max = "300";
  max.input.onchange = () => actions.cap(Number(max.input.value));
  const min = input("最少评价 ", "min-reviews-input", 0);
  min.input.onchange = () =>
    actions.view({ minReviews: Math.max(0, Number(min.input.value) || 0) });
  const sort = document.createElement("select");
  sort.dataset.testid = "review-panel__sort-select";
  sort.setAttribute("aria-label", "排序");
  for (const [value, label] of [
    ["reviews", "评价 ↓"],
    ["sales", "销量 ↓（不含店铺）"],
    ["position", "原始排名 ↑"],
    ["ratio", "评价/销量 ↓"],
  ]) {
    const option = document.createElement("option");
    option.value = value!;
    option.textContent = label!;
    sort.append(option);
  }
  sort.onchange = () =>
    actions.view({ sort: sort.value as ViewSettings["sort"] });
  controls.append(start, pause, resume, reset, max.label, min.label, sort);
  return { controls, start, pause, resume, reset, max };
}
function createPanelElements(actions: Actions, cap: number) {
  const host = document.createElement("aside");
  host.dataset.shopperRoot = "panel";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent =
    ":host{all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;font:13px system-ui;color:#19352e}details{width:min(380px,calc(100vw - 24px));background:#fff;border:1px solid #a5c9ba;border-radius:12px;box-shadow:0 6px 30px #0003;padding:12px}summary{cursor:pointer;font-weight:bold}button,input,select{font:inherit;margin:4px 3px;padding:5px;max-width:180px}input{width:65px}label{display:inline-block}.rows{max-height:35vh;overflow:auto}.row{display:block;width:98%;text-align:left;white-space:normal;border:0;border-bottom:1px solid #ddd;background:#f5faf7}p{line-height:1.5}";
  const details = document.createElement("details");
  details.open = true;
  const summary = document.createElement("summary");
  summary.textContent = "商品评价助手";
  summary.dataset.testid = "review-panel__toggle";
  const controls = createControls(actions, cap);
  const status = document.createElement("p");
  status.dataset.testid = "review-panel__status-summary";
  status.setAttribute("aria-live", "polite");
  const rows = document.createElement("div");
  rows.className = "rows";
  const csv = button("导出 CSV", "export-csv-button", () =>
    actions.export("csv"),
  );
  const json = button("导出 JSON", "export-json-button", () =>
    actions.export("json"),
  );
  const warning = document.createElement("p");
  warning.textContent = "仅供个人使用。自动读取可能触发平台限制，请谨慎操作。";
  details.append(summary, controls.controls, status, rows, csv, json, warning);
  root.append(style, details);
  document.body.append(host);
  return { host, controls, status, rows, csv, json };
}
export function createPanel(actions: Actions, cap: number) {
  const { host, controls, status, rows, csv, json } = createPanelElements(
    actions,
    cap,
  );
  return {
    remove: () => host.remove(),
    render(model: PanelModel) {
      controls.start.disabled =
        model.state === "running" || model.state === "paused";
      controls.pause.disabled = model.state !== "running";
      controls.resume.disabled = model.state !== "paused";
      controls.max.input.disabled = model.state === "running";
      csv.disabled = json.disabled = !model.canExport;
      status.textContent = !model.total
        ? "无法读取此页面的商品布局，拼多多可能已更新页面。"
        : model.isBlocked
          ? "拼多多要求验证。请在商品页完成验证后手动继续。"
          : `${{ idle: "待开始", running: "读取中", paused: "已暂停", done: "已完成" }[model.state]} ${model.completed}/${model.total} · 成功 ${model.counts.ok} · 未找到 ${model.counts.not_found} · 错误 ${model.counts.error} · 超出上限 ${model.counts.skipped_cap}`;
      rows.replaceChildren(
        ...model.rows.map((row) => {
          const node = button(
            `${row.position}. ${row.title.slice(0, 55)} · ${row.priceText} · ${row.salesLabel?.raw ?? "销量未知"}${row.salesLabel?.kind === "shop_group" ? "（店铺）" : ""} · 评价 ${row.reviewCount ?? "?"} · ${{ pending: "等待", ok: "成功", not_found: "未找到", blocked: "需验证", error: "错误", skipped_cap: "超出上限" }[row.status]}`,
            "row",
            () => actions.select(row.goodsId),
          );
          node.className = "row";
          node.title = row.errorMessage ?? row.title;
          return node;
        }),
      );
    },
  };
}
