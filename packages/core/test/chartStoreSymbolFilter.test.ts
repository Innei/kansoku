import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../src/db/index.js';
import { chartMeta } from '../src/db/schema.js';
import { listCharts } from '../src/charts/store.js';

function seedMeta(db: Db, id: string, symbol: string, createdAt: string) {
  return db.insert(chartMeta).values({
    id,
    schemaVersion: 1,
    type: 'intraday',
    title: id,
    symbol,
    createdAt,
    updatedAt: createdAt,
    predictionUpdatedAt: null,
  });
}

describe('listCharts symbol filter', () => {
  async function seededDb(): Promise<Db> {
    const db = createDb(':memory:');
    await seedMeta(db, '2026-07-20-mu-intraday', 'MU.US', '2026-07-20T14:00:00.000Z');
    await seedMeta(db, '2026-07-21-smu-intraday', 'SMU.US', '2026-07-21T14:00:00.000Z');
    return db;
  }

  it('does not match a substring symbol (MU.US must not return newer SMU.US)', async () => {
    const db = await seededDb();
    const latest = await listCharts({ symbol: 'MU.US', type: 'intraday', limit: 1 }, db);
    expect(latest).toHaveLength(1);
    expect(latest[0].symbol).toBe('MU.US');
    expect(latest[0].id).toBe('2026-07-20-mu-intraday');
  });

  it('lists only exact-symbol docs for the analyses path', async () => {
    const db = await seededDb();
    const analyses = await listCharts({ symbol: 'MU.US', type: 'intraday' }, db);
    expect(analyses.map((m) => m.symbol)).toEqual(['MU.US']);
  });

  it('normalizes a bare ticker to its .US form when matching', async () => {
    const db = await seededDb();
    const metas = await listCharts({ symbol: 'MU', type: 'intraday' }, db);
    expect(metas.map((m) => m.id)).toEqual(['2026-07-20-mu-intraday']);
  });
});
