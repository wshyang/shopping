export function exportFilename(searchKey: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const keyword =
    searchKey.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 60) || "search";
  return `pdd-${keyword}-${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}${part("second")}`;
}
export function download(content: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([content], {
      type: filename.endsWith(".csv")
        ? "text/csv;charset=utf-8"
        : "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
