import { findCards } from './find-cards';
import type { CardRef } from './find-cards';

export type CardWatcher = { stop(): void; scan(): void };

type WatchOptions = {
  debounceMs?: number;
  observerFactory?: (callback: MutationCallback) => MutationObserver;
};

export function watchCards(
  documentRoot: Document,
  onCards: (cards: readonly CardRef[]) => void,
  options: WatchOptions = {},
): CardWatcher {
  const seen = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scan(): void {
    const newCards = findCards(documentRoot).filter((card) => !seen.has(card.goodsId));
    newCards.forEach((card) => seen.add(card.goodsId));
    if (newCards.length > 0) onCards(newCards);
  }

  function scheduleScan(): void {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(scan, options.debounceMs ?? 150);
  }

  const createObserver = options.observerFactory ?? ((callback) => new MutationObserver(callback));
  const observer = createObserver(scheduleScan);
  observer.observe(documentRoot.body ?? documentRoot.documentElement, {
    childList: true,
    subtree: true,
  });
  scan();

  return {
    scan,
    stop() {
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
    },
  };
}
