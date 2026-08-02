import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import * as mediaRepo from '../db/repositories/mediaRepo';
import * as categoriesRepo from '../db/repositories/categoriesRepo';
import type { MediaRow, CategoryRow } from '../db/schema';

type TypeFilter = 'all' | 'audio' | 'video';

interface LibraryState {
  items: MediaRow[];
  cats: CategoryRow[];
  typeFilter: TypeFilter;
  categoryId: number | null;
  refresh: () => Promise<void>;
  setTypeFilter: (f: TypeFilter) => void;
  setCategoryId: (id: number | null) => void;
  remove: (id: string) => Promise<void>;
  rename: (id: string, fields: { title: string; artist: string }) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  cats: [],
  typeFilter: 'all',
  categoryId: null,
  async refresh() {
    const { typeFilter, categoryId } = get();
    const [items, cats] = await Promise.all([
      mediaRepo.listMedia({
        mediaType: typeFilter === 'all' ? undefined : typeFilter,
        categoryId: categoryId ?? undefined,
      }),
      categoriesRepo.listCategories(),
    ]);
    set({ items, cats });
  },
  setTypeFilter(typeFilter) {
    set({ typeFilter });
    void get().refresh();
  },
  setCategoryId(categoryId) {
    set({ categoryId });
    void get().refresh();
  },
  async rename(id, fields) {
    await mediaRepo.rename(id, fields);
    await get().refresh();
  },
  async remove(id) {
    const row = get().items.find((i) => i.id === id);
    if (row) {
      await FileSystem.deleteAsync(row.fileUri, { idempotent: true }).catch(() => {});
      if (row.artworkUri) {
        await FileSystem.deleteAsync(row.artworkUri, { idempotent: true }).catch(() => {});
      }
    }
    await mediaRepo.deleteMedia(id);
    await get().refresh();
  },
}));
