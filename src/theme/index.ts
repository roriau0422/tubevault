import { useColorScheme, type ViewStyle } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  elevated: string;
  text: string;
  textBright: string;
  textSecondary: string;
  textTertiary: string;
  fill: string;
  separator: string;
  thumbPlaceholder: string;
  accent: string;
  accentText: string;
  accentNowPlaying: string;
  accentTintStrong: string;
  accentTintSoft: string;
  accentBarSoft: string;
  progressTrack: string;
  tabBarBg: string;
  tabInactive: string;
  segmentActiveBg: string;
  segmentActiveText: string;
  chipBg: string;
  chipBorder: string;
  cardShadow: ViewStyle;
  segmentShadow: ViewStyle;
}

export const darkTheme: Theme = {
  dark: true,
  bg: '#000000',
  card: '#131315',
  elevated: '#1c1c20',
  text: '#f2f2f5',
  textBright: '#ffffff',
  textSecondary: 'rgba(235,235,245,0.6)',
  textTertiary: 'rgba(235,235,245,0.5)',
  fill: 'rgba(118,118,128,0.24)',
  separator: 'rgba(255,255,255,0.08)',
  thumbPlaceholder: '#1c1c1f',
  accent: '#ff645f',
  accentText: '#ff6f69',
  accentNowPlaying: '#ff7d76',
  accentTintStrong: 'rgba(255,100,95,0.16)',
  accentTintSoft: 'rgba(255,100,95,0.12)',
  accentBarSoft: 'rgba(255,100,95,0.45)',
  progressTrack: 'rgba(255,255,255,0.09)',
  tabBarBg: 'rgba(16,16,18,0.82)',
  tabInactive: 'rgba(235,235,245,0.55)',
  segmentActiveBg: '#636366',
  segmentActiveText: '#ffffff',
  chipBg: 'rgba(118,118,128,0.24)',
  chipBorder: 'transparent',
  cardShadow: {},
  segmentShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
};

export const lightTheme: Theme = {
  dark: false,
  bg: '#f7f7f8',
  card: '#ffffff',
  elevated: '#ffffff',
  text: '#1b1b1d',
  textBright: '#1b1b1d',
  textSecondary: 'rgba(60,60,67,0.6)',
  textTertiary: 'rgba(60,60,67,0.5)',
  fill: 'rgba(118,118,128,0.12)',
  separator: 'rgba(60,60,67,0.12)',
  thumbPlaceholder: '#e9e9ec',
  accent: '#d73337',
  accentText: '#cc272e',
  accentNowPlaying: '#bb061e',
  accentTintStrong: 'rgba(215,51,55,0.10)',
  accentTintSoft: 'rgba(215,51,55,0.08)',
  accentBarSoft: 'rgba(215,51,55,0.40)',
  progressTrack: 'rgba(60,60,67,0.10)',
  tabBarBg: 'rgba(249,249,250,0.85)',
  tabInactive: 'rgba(60,60,67,0.55)',
  segmentActiveBg: '#ffffff',
  segmentActiveText: '#1b1b1d',
  chipBg: '#ffffff',
  chipBorder: 'rgba(60,60,67,0.15)',
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
};

export const TAB_BAR_INSET = 96;

export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useSettingsStore((s) => s.themeMode);
  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return dark ? darkTheme : lightTheme;
}
