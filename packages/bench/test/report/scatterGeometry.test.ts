import { describe, expect, it } from 'vitest';
import { buildScatterView, niceStep, niceTicks } from '../../src/report/scatterGeometry.js';

describe('niceStep', () => {
  it('picks a round step relative to the range', () => {
    expect(niceStep(40)).toBe(20);
    expect(niceStep(20)).toBe(10);
    expect(niceStep(8)).toBe(5);
    expect(niceStep(4)).toBe(2);
  });
});

describe('niceTicks', () => {
  it('pads degenerate ranges around a single value', () => {
    const { lo, hi, ticks } = niceTicks(0.5, 0.5);
    expect(lo).toBeLessThan(0.5);
    expect(hi).toBeGreaterThan(0.5);
    expect(ticks).toContain(0.5);
  });

  it('rounds min/max out to step boundaries', () => {
    const { lo, hi, ticks } = niceTicks(3, 37);
    expect(lo).toBeLessThanOrEqual(3);
    expect(hi).toBeGreaterThanOrEqual(37);
    expect(ticks.length).toBeGreaterThan(1);
  });
});

describe('buildScatterView', () => {
  const points = [
    { id: 'a/model-1', name: 'model-1', judgment: 0.8, efficiency: 0.6, lead: true },
    { id: 'b/model-2', name: 'model-2', judgment: 0.4, efficiency: 0.3, lead: false },
  ];

  it('projects one dot per point inside the plot bounds', () => {
    const view = buildScatterView(points, 0.5, '买入持有基线');
    expect(view.dots).toHaveLength(2);
    for (const dot of view.dots) {
      expect(dot.cx).toBeGreaterThanOrEqual(view.padL);
      expect(dot.cx).toBeLessThanOrEqual(view.innerRight);
      expect(dot.cy).toBeGreaterThanOrEqual(view.padT);
      expect(dot.cy).toBeLessThanOrEqual(view.innerBottom);
    }
  });

  it('marks points below the baseline judgment', () => {
    const view = buildScatterView(points, 0.5, '买入持有基线');
    const below = view.dots.find((dot) => dot.id === 'b/model-2');
    const above = view.dots.find((dot) => dot.id === 'a/model-1');
    expect(below?.below).toBe(true);
    expect(above?.below).toBe(false);
  });

  it('omits the baseline line when no baseline judgment is given', () => {
    const view = buildScatterView(points, null, '买入持有基线');
    expect(view.baseline).toBeNull();
  });

  it('gives the lead model a larger radius', () => {
    const view = buildScatterView(points, null, '买入持有基线');
    const lead = view.dots.find((dot) => dot.id === 'a/model-1');
    const rest = view.dots.find((dot) => dot.id === 'b/model-2');
    expect(lead?.r).toBeGreaterThan(rest?.r ?? 0);
  });
});
