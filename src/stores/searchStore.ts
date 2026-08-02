import { create } from 'zustand';
import type { ErrorCode } from '../errors';
import { toAppError } from '../errors';
import { searchVideos, type SearchResult } from '../services/innertube';

interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: ErrorCode | null;
  setQuery: (q: string) => void;
  search: () => Promise<void>;
  preview: (r: SearchResult) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  async search() {
    const q = get().query.trim();
    if (!q) return;
    set({ loading: true, error: null });
    try {
      const results = await searchVideos(q);
      if (__DEV__) console.log('[search] ok:', results.length, 'results');
      set({ results, loading: false });
    } catch (e) {
      if (__DEV__) {
        const cause = (e as { cause?: { stack?: string } })?.cause;
        console.error('[search] failed:', e, '\n[cause stack]\n', cause?.stack ?? cause);
      }
      set({ loading: false, error: toAppError(e, 'NETWORK').code });
    }
  },
  // Preview (stream-without-download) is disabled: YouTube is SABR-only, so there
  // is no plain URL to hand to the player. Use the download buttons instead.
  async preview() {
    // intentionally no-op
  },
}));
