import { describe, expect, it } from 'vitest';
import { chunkFileNamesFor } from '../../vite.config.js';

describe('chunkFileNamesFor (web)', () => {
  it('routes a chunk containing a pro module under assets/__pro__', () => {
    const name = chunkFileNamesFor({
      name: 'research',
      moduleIds: ['/repo/apps/pro/overlays/apps/web/src/pages/research/ResearchPage.pro.tsx'],
      facadeModuleId: null,
    });
    expect(name).toBe('assets/__pro__/[name]-[hash].js');
  });

  it('routes a public chunk to the normal assets location', () => {
    const name = chunkFileNamesFor({
      name: 'home',
      moduleIds: ['/repo/apps/web/src/pages/Home.tsx'],
      facadeModuleId: null,
    });
    expect(name).toBe('assets/[name]-[hash].js');
  });

  it('routes a module-less pro facade chunk under assets/__pro__', () => {
    const name = chunkFileNamesFor({
      name: 'facade',
      moduleIds: [],
      facadeModuleId: '/repo/apps/pro/overlays/apps/web/src/edition/pro.pro.ts',
    });
    expect(name).toBe('assets/__pro__/[name]-[hash].js');
  });
});
