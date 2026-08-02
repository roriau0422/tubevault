import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Paths } from 'expo-file-system';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme, TAB_BAR_INSET, type Theme } from '../../src/theme';
import { formatBytes } from '../../src/format';
import type { ThemeMode } from '../../src/stores/settingsStore';
import type { Language } from '../../src/i18n';

const LANGUAGES: { code: Language; labelKey: 'settings.languageMn' | 'settings.languageEn' }[] = [
  { code: 'mn', labelKey: 'settings.languageMn' },
  { code: 'en', labelKey: 'settings.languageEn' },
];

const THEMES: {
  mode: ThemeMode;
  labelKey: 'settings.themeSystem' | 'settings.themeLight' | 'settings.themeDark';
}[] = [
  { mode: 'system', labelKey: 'settings.themeSystem' },
  { mode: 'light', labelKey: 'settings.themeLight' },
  { mode: 'dark', labelKey: 'settings.themeDark' },
];

function SectionHeader({ th, label }: { th: Theme; label: string }) {
  return <Text style={[styles.section, { color: th.textTertiary }]}>{label}</Text>;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const th = useTheme();
  const s = useSettingsStore();

  const [diskTotal] = useState(() => Paths.totalDiskSpace);

  useFocusEffect(
    useCallback(() => {
      void useSettingsStore.getState().load();
    }, [])
  );

  // Bar shows usage against device capacity; falls back to the video/audio
  const denominator = diskTotal > 0 ? diskTotal : s.sizeBytes;
  const videoFrac = denominator > 0 ? s.videoBytes / denominator : 0;
  const audioFrac = denominator > 0 ? s.audioBytes / denominator : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.h1, { color: th.textBright }]}>{t('tabs.settings')}</Text>

      <SectionHeader th={th} label={t('settings.language')} />
      <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
        {LANGUAGES.map((l, idx) => (
          <Pressable
            key={l.code}
            style={[
              styles.row,
              idx < LANGUAGES.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: th.separator,
              },
            ]}
            onPress={() => void s.switchLanguage(l.code)}
          >
            <Text style={[styles.rowLabel, { color: th.text }]}>{t(l.labelKey)}</Text>
            {s.language === l.code ? (
              <Ionicons name="checkmark" size={18} color={th.accent} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <SectionHeader th={th} label={t('settings.downloads')} />
      <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: th.text }]}>{t('settings.askCategory')}</Text>
          <Switch
            value={s.askCategoryOnDownload}
            onValueChange={(v) => void s.setAskCategoryOnDownload(v)}
            trackColor={{ true: th.accent }}
          />
        </View>
      </View>
      <Text style={[styles.footnote, { color: th.textTertiary }]}>
        {t('settings.askCategoryHint')}
      </Text>

      <SectionHeader th={th} label={t('settings.storage')} />
      <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
        <View
          style={[
            styles.storageBlock,
            { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: th.separator },
          ]}
        >
          <View style={styles.spread}>
            <Text style={[styles.rowLabel, { color: th.text }]}>{t('settings.usedSpace')}</Text>
            <Text style={[styles.rowValue, { color: th.textSecondary }]}>
              {formatBytes(s.sizeBytes)}
            </Text>
          </View>
          <View style={[styles.storageBar, { backgroundColor: th.progressTrack }]}>
            <View style={{ flex: videoFrac, backgroundColor: th.accent }} />
            <View style={{ flex: audioFrac, backgroundColor: th.accentBarSoft }} />
            <View style={{ flex: Math.max(0, 1 - videoFrac - audioFrac) }} />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: th.accent }]} />
              <Text style={[styles.legendLabel, { color: th.textSecondary }]}>
                {t('library.video')} {formatBytes(s.videoBytes)}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: th.accentBarSoft }]} />
              <Text style={[styles.legendLabel, { color: th.textSecondary }]}>
                {t('library.audio')} {formatBytes(s.audioBytes)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: th.text }]}>{t('settings.mediaFiles')}</Text>
          <Text style={[styles.rowValue, { color: th.textSecondary }]}>{s.count}</Text>
        </View>
      </View>

      <SectionHeader th={th} label={t('settings.appearance')} />
      <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
        {THEMES.map((option, idx) => (
          <Pressable
            key={option.mode}
            style={[
              styles.row,
              idx < THEMES.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: th.separator,
              },
            ]}
            onPress={() => void s.setThemeMode(option.mode)}
          >
            <Text style={[styles.rowLabel, { color: th.text }]}>{t(option.labelKey)}</Text>
            {s.themeMode === option.mode ? (
              <Ionicons name="checkmark" size={18} color={th.accent} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 62, paddingHorizontal: 20, paddingBottom: TAB_BAR_INSET },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: 0.2 },
  section: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 14, overflow: 'hidden' },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: { fontSize: 16, flexShrink: 1 },
  rowValue: { fontSize: 16 },
  storageBlock: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  storageBar: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 12 },
  footnote: { fontSize: 12, lineHeight: 16, marginTop: 6, paddingHorizontal: 4 },
});
