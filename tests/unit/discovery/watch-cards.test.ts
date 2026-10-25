import { describe, expect, it, vi } from 'vitest';
import type { CardRef } from '../../../src/discovery/find-cards';
import { watchCards } from '../../../src/discovery/watch-cards';

describe('watchCards', () => {
  it('emits only newly discovered goods across scans', () => {
    document.body.innerHTML = '<article><a href="/goods.html?goods_id=1"></a></article>';
    const emissions: Array<readonly CardRef[]> = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const watcher = watchCards(document, (cards) => emissions.push(cards), {
      debounceMs: 0,
      observerFactory: () => ({ observe, disconnect }) as unknown as MutationObserver,
    });
    expect(emissions[0]).toHaveLength(1);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<article><a href="/goods.html?goods_id=2"></a></article>',
    );
    watcher.scan();
    expect(emissions[1]?.map(({ goodsId }) => goodsId)).toEqual(['2']);
    watcher.scan();
    expect(emissions).toHaveLength(2);
    watcher.stop();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
