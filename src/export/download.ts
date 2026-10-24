/**
 * Triggers a file download via Blob + <a download>.
 * This is the only DOM side effect in the export layer.
 */

export type DownloadOptions = {
  content: string;
  filename: string;
  mimeType: string;
};

function createBlobUrl(content: string, mimeType: string): string {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
}

function createDownloadLink(url: string, filename: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  return anchor;
}

function triggerClick(anchor: HTMLAnchorElement): void {
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function download(options: DownloadOptions): void {
  const url = createBlobUrl(options.content, options.mimeType);
  const anchor = createDownloadLink(url, options.filename);
  triggerClick(anchor);
  URL.revokeObjectURL(url);
}

export function downloadCsv(content: string, filename: string): void {
  download({ content, filename, mimeType: 'text/csv;charset=utf-8' });
}

export function downloadJson(content: string, filename: string): void {
  download({ content, filename, mimeType: 'application/json;charset=utf-8' });
}
