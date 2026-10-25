export type ElementOptions = {
  className?: string;
  text?: string;
  testId?: string;
  title?: string;
};

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.testId) element.dataset.testid = options.testId;
  if (options.title) element.title = options.title;
  return element;
}

export function appendChildren(parent: ParentNode, children: readonly Node[]): void {
  parent.append(...children);
}
