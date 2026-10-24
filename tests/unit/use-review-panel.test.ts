import { describe, it, expect } from 'vitest';
import { createReviewPanelStore } from '../../src/ui/use-review-panel.js';
import { DEFAULT_SETTINGS, createGoodsRecord, withFetchResult } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

function makeRecord(goodsId: string, reviewCount: number | null, status: 'ok' | 'pending' | 'blocked' | 'not_found' | 'error' = 'ok'): ReturnType<typeof createGoodsRecord> {
  const base = createGoodsRecord({
    goodsId,
    title: `Item ${goodsId}`,
    priceText: '¥10',
    salesLabel: parseSalesLabel('热销1万件'),
    url: `https://mobile.pinduoduo.com/goods.html?goods_id=${goodsId}`,
    position: parseInt(goodsId, 10) || 1,
  });
  if (status === 'pending') return base;
  return withFetchResult(base, { status, reviewCount, errorMessage: null }, new Date().toISOString(), 'network');
}

describe('createReviewPanelStore', () => {
  it('starts idle with empty rows', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    const viewModel = store.getViewModel();
    expect(viewModel.state).toBe('idle');
    expect(viewModel.rows).toHaveLength(0);
    expect(viewModel.canExport).toBe(false);
  });

  it('transitions idle -> running -> done', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    store.setState('running');
    expect(store.getViewModel().state).toBe('running');
    store.setState('done');
    expect(store.getViewModel().state).toBe('done');
  });

  it('canExport when at least one ok', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    store.setRecords([makeRecord('1', 100), makeRecord('2', null, 'not_found')]);
    expect(store.getViewModel().canExport).toBe(true);
  });

  it('sorts by reviews_desc by default', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    store.setRecords([makeRecord('1', 10), makeRecord('2', 500), makeRecord('3', 100)]);
    expect(store.getViewModel().rows[0].goodsId).toBe('2');
  });

  it('filters by minReviews', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    store.setRecords([makeRecord('1', 10), makeRecord('2', 500)]);
    store.setMinReviews(100);
    expect(store.getViewModel().rows).toHaveLength(1);
    expect(store.getViewModel().rows[0].goodsId).toBe('2');
  });

  it('notifies subscribers', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    const calls: string[] = [];
    store.subscribe((viewModel) => calls.push(viewModel.state));
    store.setState('running');
    expect(calls).toContain('running');
  });

  it('blocked message appears in view model', () => {
    const store = createReviewPanelStore(DEFAULT_SETTINGS);
    store.setBlockedMessage('PDD asked for verification');
    expect(store.getViewModel().blockedMessage).toBe('PDD asked for verification');
  });
});
