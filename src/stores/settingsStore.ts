import { create } from 'zustand';
import i18n from 'i18next';
import { setLanguage, type Language } from '../i18n';
import * as settingsRepo from '../db/repositories/settingsRepo';
import * as mediaRepo from '../db/repositories/mediaRepo';

const ASK_CATEGORY_KEY = 'askCategoryOnDownload';
const THEME_MODE_KEY = 'themeMode';

/** Lives here rather than in ../theme, which imports this store. */
export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

interface SettingsState {
  language: Language;
  count: number;
  sizeBytes: number;
  videoBytes: number;
  audioBytes: number;
  askCategoryOnDownload: boolean;
  themeMode: ThemeMode;
  load: () => Promise<void>;
  switchLanguage: (lng: Language) => Promise<void>;
  setAskCategoryOnDownload: (on: boolean) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => {
  // Hydrate eagerly so the search screen sees the flag without visiting settings.
  void settingsRepo
    .getSetting(ASK_CATEGORY_KEY)
    .then((v) => set({ askCategoryOnDownload: v === '1' }));
  // Likewise the theme, which every screen reads on first paint.
  void settingsRepo.getSetting(THEME_MODE_KEY).then((v) => {
    if (THEME_MODES.includes(v as ThemeMode)) set({ themeMode: v as ThemeMode });
  });
  return {
    language: (i18n.language as Language) || 'mn',
    count: 0,
    sizeBytes: 0,
    videoBytes: 0,
    audioBytes: 0,
    askCategoryOnDownload: false,
    themeMode: 'system',
    async load() {
      const t = await mediaRepo.totals();
      set({
        count: t.count,
        sizeBytes: t.sizeBytes,
        videoBytes: t.videoBytes,
        audioBytes: t.audioBytes,
      });
    },
    async switchLanguage(lng) {
      await settingsRepo.setSetting('language', lng);
      await setLanguage(lng);
      set({ language: lng });
    },
    async setAskCategoryOnDownload(on) {
      set({ askCategoryOnDownload: on });
      await settingsRepo.setSetting(ASK_CATEGORY_KEY, on ? '1' : '0');
    },
    async setThemeMode(mode) {
      set({ themeMode: mode });
      await settingsRepo.setSetting(THEME_MODE_KEY, mode);
    },
  };
});
