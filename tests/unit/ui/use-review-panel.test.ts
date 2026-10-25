import { describe, expect, it, vi } from 'vitest';
import { createGoodsRecord } from '../../../src/domain/goods-record';
import { createReviewPanelController } from '../../../src/ui/use-review-panel';

const makeRecord = (position: number) =>
  createGoodsRecord({
    goodsId: String(position),
    title: `商品 ${position}`,
    priceText: `¥${position}`,
    salesLabel: null,
    url: `https://mobile.pinduoduo.com/goods.html?goods_id=${position}`,
    position,
  });

describe('review panel controller', () => {
  it('deduplicates records and publishes immutable derived snapshots', () => {
    const controller = createReviewPanelController({ maxItems: 2 });
    const subscriber = vi.fn();
    controller.subscribe(subscriber);
    controller.addRecords([makeRecord(1), makeRecord(1), makeRecord(2), makeRecord(3)]);
    const view = controller.getViewModel();
    expect(view.records.map(({ goodsId }) => goodsId)).toEqual(['1', '2', '3']);
    expect(view.statusCounts).toMatchObject({ pending: 3, skipped_cap: 0 });
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it('applies the cap at run start and tracks progress/outcomes', () => {
    const controller = createReviewPanelController({ maxItems: 2 });
    controller.addRecords([makeRecord(1), makeRecord(2), makeRecord(3)]);
    controller.start();
    expect(controller.getRunnableRecords().map(({ goodsId }) => goodsId)).toEqual(['1', '2']);
    expect(controller.getViewModel()).toMatchObject({
      phase: 'running',
      progress: { completed: 0, total: 2 },
    });
    controller.updateRecord('1', {
      status: 'ok',
      reviewCount: 20,
      errorMessage: null,
      fetchedAt: '2026-10-24T00:00:00.000Z',
      source: 'network',
    });
    expect(controller.getViewModel().progress).toEqual({ completed: 1, total: 2 });
    expect(controller.getViewModel().canExport).toBe(true);
  });

  it('keeps completed data when a later run lowers the request cap', () => {
    const controller = createReviewPanelController({ maxItems: 3 });
    controller.addRecords([makeRecord(1), makeRecord(2), makeRecord(3)]);
    controller.updateRecord('3', {
      status: 'ok',
      reviewCount: 30,
      errorMessage: null,
      fetchedAt: null,
      source: 'cache',
    });
    controller.setMaximumItems(2);
    controller.start();
    expect(controller.getAllRecords()[2]).toMatchObject({ status: 'ok', reviewCount: 30 });
    expect(controller.getViewModel().progress.total).toBe(2);
  });

  it('supports pause/resume/done/reset transitions', () => {
    const controller = createReviewPanelController({ maxItems: 2 });
    controller.addRecords([makeRecord(1)]);
    controller.start();
    controller.pause('需要验证');
    expect(controller.getViewModel()).toMatchObject({ phase: 'paused', pauseReason: '需要验证' });
    controller.resume();
    expect(controller.getViewModel().phase).toBe('running');
    controller.complete();
    expect(controller.getViewModel().phase).toBe('done');
    controller.reset();
    expect(controller.getViewModel()).toMatchObject({
      phase: 'idle',
      progress: { completed: 0, total: 1 },
    });
  });

  it('derives filtered and sorted rows outside rendering', () => {
    const controller = createReviewPanelController({ maxItems: 5 });
    controller.addRecords([makeRecord(1), makeRecord(2)]);
    controller.updateRecord('1', {
      status: 'ok',
      reviewCount: 10,
      errorMessage: null,
      fetchedAt: null,
      source: 'cache',
    });
    controller.updateRecord('2', {
      status: 'ok',
      reviewCount: 100,
      errorMessage: null,
      fetchedAt: null,
      source: 'cache',
    });
    controller.setMinimumReviews(50);
    controller.setSort('reviews_desc');
    expect(controller.getViewModel().records.map(({ goodsId }) => goodsId)).toEqual(['2']);
  });
});
