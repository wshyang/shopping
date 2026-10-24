import { findCards, type CardRef } from './find-cards.js';

export type CardWatcherHandle = {
  disconnect: () => void;
};

export type CardWatcherOptions = {
  onNewCards: (cards: CardRef[]) => void;
  root?: Element;
};

function getKnownIds(existing: CardRef[]): Set<string> {
  return new Set(existing.map((card) => card.goodsId));
}

function filterNewCards(allCards: CardRef[], knownIds: Set<string>): CardRef[] {
  return allCards.filter((card) => !knownIds.has(card.goodsId));
}

function createObserver(
  onNewCards: (cards: CardRef[]) => void,
  knownIds: Set<string>,
): MutationObserver {
  return new MutationObserver(() => {
    handleMutations(knownIds, onNewCards);
  });
}

function handleMutations(knownIds: Set<string>, onNewCards: (cards: CardRef[]) => void): void {
  const allCards = findCards(document);
  const newCards = filterNewCards(allCards, knownIds);
  if (newCards.length === 0) return;
  updateKnownIds(knownIds, newCards);
  onNewCards(newCards);
}

function updateKnownIds(knownIds: Set<string>, newCards: CardRef[]): void {
  for (const card of newCards) knownIds.add(card.goodsId);
}

/**
 * Watches the document for newly inserted product cards (infinite scroll).
 * Defensive: MutationObserver + caller should also handle scroll events if needed.
 */
export function watchCards(options: CardWatcherOptions): CardWatcherHandle {
  const knownIds = getKnownIds(findCards(document));
  const observer = createObserver(options.onNewCards, knownIds);

  const target = options.root ?? document.body;
  observer.observe(target, { childList: true, subtree: true });

  return {
    disconnect: () => observer.disconnect(),
  };
}
