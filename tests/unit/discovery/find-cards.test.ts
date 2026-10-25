import { describe, expect, it } from 'vitest';
import { findCards } from '../../../src/discovery/find-cards';

describe('findCards', () => {
  it('discovers and deduplicates goods links without relying on CSS classes', () => {
    document.body.innerHTML = `
      <ul>
        <li><a href="/goods.html?goods_id=42"><img alt="清香洗衣粉" /></a><a href="/goods.html?goods_id=42">详情</a><span>¥19.9</span><span>热销3.5万+件</span></li>
        <li role="listitem"><a href="https://mobile.pinduoduo.com/goods.html?foo=x&goods_id=88" aria-label="浓缩洗衣液"></a><span>￥8</span><span>本店已拼8318</span></li>
      </ul>`;

    const cards = findCards(document);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      goodsId: '42',
      title: '清香洗衣粉',
      priceText: '¥19.9',
      position: 1,
      salesLabel: { count: 35_000 },
    });
    expect(cards[1]).toMatchObject({
      goodsId: '88',
      title: '浓缩洗衣液',
      priceText: '￥8',
      position: 2,
      salesLabel: { kind: 'shop_group' },
    });
    expect(cards[0]?.url).toBe('https://mobile.pinduoduo.com/goods.html?goods_id=42');
  });

  it('ignores invalid, off-origin, and non-goods links', () => {
    document.body.innerHTML = `
      <a href="https://evil.example/goods.html?goods_id=1">wrong origin</a>
      <a href="/search_result.html?goods_id=2">wrong page</a>
      <a href="/goods.html?goods_id=">missing id</a>`;
    expect(findCards(document)).toEqual([]);
  });

  it('uses visible fallback copy while keeping unknown values explicit', () => {
    document.body.innerHTML = `<div><a href="/goods.html?goods_id=9" title="商品九">打开</a></div>`;
    expect(findCards(document)[0]).toMatchObject({
      title: '商品九',
      priceText: '',
      salesLabel: null,
    });
  });
});
