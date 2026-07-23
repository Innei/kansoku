// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadProComposition = vi.hoisted(() => vi.fn());
vi.mock('../../src/features/edition/pro', () => ({ loadProComposition }));

import { resetProCompositionForTests, useProComposition } from '../../src/features/edition/useProComposition';

describe('useProComposition', () => {
  beforeEach(() => {
    loadProComposition.mockReset();
    resetProCompositionForTests();
  });

  it('starts in loading status', () => {
    loadProComposition.mockResolvedValue(null);
    const { result } = renderHook(() => useProComposition());
    expect(result.current).toEqual({ status: 'loading', composition: null });
  });

  it('resolves to ready with null composition in free mode', async () => {
    loadProComposition.mockResolvedValue(null);
    const { result } = renderHook(() => useProComposition());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.composition).toBeNull();
  });

  it('exposes the composition once the pro composition resolves', async () => {
    const Panel = () => null;
    loadProComposition.mockResolvedValue({ researchAssistantPanel: Panel });
    const { result } = renderHook(() => useProComposition());
    await waitFor(() => expect(result.current.composition).not.toBeNull());
    expect(result.current.composition!.researchAssistantPanel).toBe(Panel);
  });

  it('resolves to ready with null composition when the pro chunk fails to load', async () => {
    loadProComposition.mockRejectedValue(new Error('chunk missing'));
    const { result } = renderHook(() => useProComposition());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.composition).toBeNull();
  });
});
