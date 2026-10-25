import { findCards, type CardRef } from "./find-cards";
export function watchCards(
  document: Document,
  receive: (cards: CardRef[]) => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scan = () => receive(findCards(document));
  const observer = new MutationObserver((changes) => {
    if (
      changes.every((change) =>
        (change.target instanceof Element
          ? change.target
          : change.target.parentElement
        )?.closest("[data-shopper-root]"),
      )
    )
      return;
    clearTimeout(timer);
    timer = setTimeout(scan, 250);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  scan();
  return () => {
    clearTimeout(timer);
    observer.disconnect();
  };
}
