import { useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSearchStore } from '../../src/stores/searchStore';
import { useDownloadStore } from '../../src/stores/downloadStore';
import { MediaRow } from '../../src/components/MediaRow';
import { EqBars } from '../../src/components/EqBars';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useTheme, TAB_BAR_INSET } from '../../src/theme';
import { suggestQueries, type SearchResult } from '../../src/services/innertube';
import type { QueueItem } from '../../src/services/downloadMachine';

const SKELETON_ROWS = 7;
const STAGGER_LIMIT = 10;

function formatDuration(sec: number): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Placeholder search pre-flight */
function SkeletonList() {
  const th = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <Animated.View key={i} style={[styles.skelRow, { opacity: pulse }]}>
          <View style={[styles.skelThumb, { backgroundColor: th.thumbPlaceholder }]} />
          <View style={styles.skelMeta}>
            <View style={[styles.skelLine, { backgroundColor: th.fill, width: '82%' }]} />
            <View style={[styles.skelLine, { backgroundColor: th.fill, width: '46%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function FadeInRow({ index, children }: { index: number; children: ReactNode }) {
  const [v] = useState(() => new Animated.Value(index < STAGGER_LIMIT ? 0 : 1));

  useEffect(() => {
    if (index >= STAGGER_LIMIT) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 300,
      delay: index * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index]);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function DownloadingIndicator({ item }: { item: QueueItem }) {
  const th = useTheme();
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const pct = Math.round(Math.min(1, Math.max(0, item.progress)) * 100);
  return (
    <View style={styles.dlWrap}>
      <View style={styles.dlPctRow}>
        <Animated.View
          style={{
            transform: [
              { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [-1.5, 1.5] }) },
            ],
          }}
        >
          <Ionicons name="arrow-down" size={12} color={th.accentText} />
        </Animated.View>
        <Text style={[styles.dlPct, { color: th.accentText }]}>{pct}%</Text>
      </View>
      <View style={[styles.dlTrack, { backgroundColor: th.progressTrack }]}>
        <View style={[styles.dlFill, { backgroundColor: th.accent, width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function DoneBadge() {
  const th = useTheme();
  const [scale] = useState(() => new Animated.Value(0.2));

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.doneCircle,
        { backgroundColor: th.accentTintStrong, transform: [{ scale }] },
      ]}
    >
      <Ionicons name="checkmark" size={15} color={th.accentText} />
    </Animated.View>
  );
}

function ResultActions({
  result,
  onDownload,
}: {
  result: SearchResult;
  onDownload: (result: SearchResult, mediaType: 'audio' | 'video') => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const retry = useDownloadStore((s) => s.retry);
  const queued = useDownloadStore((s) => s.items.find((i) => i.videoId === result.videoId));

  const enqueueAs = (mediaType: 'audio' | 'video') => onDownload(result, mediaType);

  if (queued?.phase === 'done') return <DoneBadge />;
  if (queued?.phase === 'failed') {
    return (
      <Pressable
        hitSlop={6}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: th.accentTintStrong, opacity: pressed ? 0.6 : 1 },
        ]}
        onPress={() => retry(result.videoId)}
      >
        <Ionicons name="refresh" size={12} color={th.accentText} />
        <Text style={[styles.pillLabel, { color: th.accentText }]}>{t('common.retry')}</Text>
      </Pressable>
    );
  }
  if (queued) return <DownloadingIndicator item={queued} />;

  return (
    <View style={styles.actions}>
      <Pressable
        hitSlop={6}
        accessibilityLabel={t('search.downloadAudio')}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: th.accentTintStrong, opacity: pressed ? 0.6 : 1 },
        ]}
        onPress={() => enqueueAs('audio')}
      >
        <Ionicons name="arrow-down" size={12} color={th.accentText} />
        <Text style={[styles.pillLabel, { color: th.accentText }]}>{t('library.audio')}</Text>
      </Pressable>
      <Pressable
        hitSlop={6}
        accessibilityLabel={t('search.downloadVideo')}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: th.fill, opacity: pressed ? 0.6 : 1 },
        ]}
        onPress={() => enqueueAs('video')}
      >
        <Ionicons name="arrow-down" size={12} color={th.textSecondary} />
        <Text style={[styles.pillLabel, { color: th.textSecondary }]}>{t('library.video')}</Text>
      </Pressable>
    </View>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const th = useTheme();
  const { query, results, loading, error, setQuery, search, preview } = useSearchStore();
  const enqueue = useDownloadStore((s) => s.enqueue);
  const askCategory = useSettingsStore((s) => s.askCategoryOnDownload);
  const language = useSettingsStore((s) => s.language);
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState<{
    result: SearchResult;
    mediaType: 'audio' | 'video';
  } | null>(null);
  // Keyed by the query they belong to, so a stale batch is simply not shown.
  const [sug, setSug] = useState<{ q: string; list: string[] }>({ q: '', list: [] });

  const trimmed = query.trim();
  const suggestions = sug.q === trimmed ? sug.list : [];

  // Debounced so a fast typist fires one request, aborted on the next keystroke
  useEffect(() => {
    if (!focused || !trimmed) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestQueries(trimmed, language, ctrl.signal)
        .then((list) => setSug({ q: trimmed, list }))
        .catch(() => {}); // suggestions are a nicety — failures stay silent
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed, focused, language]);

  const runSuggestion = (s: string) => {
    setQuery(s);
    setFocused(false);
    Keyboard.dismiss();
    void search();
  };

  const startDownload = (
    result: SearchResult,
    mediaType: 'audio' | 'video',
    categoryIds?: number[]
  ) =>
    enqueue({
      videoId: result.videoId,
      mediaType,
      title: result.title,
      artist: result.author,
      thumbnailUrl: result.thumbnailUrl,
      categoryIds,
    });

  const onDownload = (result: SearchResult, mediaType: 'audio' | 'video') => {
    if (askCategory) setPending({ result, mediaType });
    else startDownload(result, mediaType);
  };

  const idle = !loading && !error && results.length === 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.h1, { color: th.textBright }]}>{t('tabs.search')}</Text>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: th.fill },
          focused && { borderColor: th.accentBarSoft },
        ]}
      >
        <Ionicons name="search" size={16} color={focused ? th.accentText : th.textSecondary} />
        <TextInput
          style={[styles.input, { color: th.text }]}
          placeholder={t('search.placeholder')}
          placeholderTextColor={th.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => void search()}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading ? (
          <EqBars color={th.accent} />
        ) : query.length > 0 ? (
          <Pressable hitSlop={8} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={th.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: th.accentTintSoft }]}>
          <Ionicons name="cloud-offline-outline" size={15} color={th.accentText} />
          <Text style={[styles.errorLabel, { color: th.accentText }]}>{t(`errors.${error}`)}</Text>
        </View>
      ) : null}
      {focused && suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: s }) => (
            <Pressable style={styles.sugRow} onPress={() => runSuggestion(s)}>
              <Ionicons name="search" size={15} color={th.textTertiary} />
              <Text numberOfLines={1} style={[styles.sugLabel, { color: th.text }]}>
                {s}
              </Text>
              {/* Lifts the suggestion into the box to refine it, without searching. */}
              <Pressable hitSlop={10} onPress={() => setQuery(s)}>
                <Ionicons name="arrow-up-outline" size={16} color={th.textTertiary} />
              </Pressable>
            </Pressable>
          )}
        />
      ) : loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.videoId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item, index }) => (
            <FadeInRow index={index}>
              <MediaRow
                title={item.title}
                subtitle={item.author}
                imageUrl={item.thumbnailUrl}
                thumbBadge={formatDuration(item.durationSec)}
                onPress={() => void preview(item)}
                right={<ResultActions result={item} onDownload={onDownload} />}
              />
            </FadeInRow>
          )}
          ListEmptyComponent={
            idle && !query ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCircle, { backgroundColor: th.fill }]}>
                  <Ionicons name="search" size={26} color={th.textTertiary} />
                </View>
                <Text style={[styles.emptyHint, { color: th.textSecondary }]}>
                  {t('search.hint')}
                </Text>
              </View>
            ) : idle && query ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCircle, { backgroundColor: th.fill }]}>
                  <Ionicons name="telescope-outline" size={26} color={th.textTertiary} />
                </View>
                <Text style={[styles.emptyHint, { color: th.textSecondary }]}>
                  {t('search.noResults')}
                </Text>
              </View>
            ) : null
          }
        />
      )}
      <CategoryPicker
        mediaId={null}
        visible={pending !== null}
        title={t('search.chooseCategory')}
        onSave={(ids) => {
          if (pending) startDownload(pending.result, pending.mediaType, ids);
        }}
        onClose={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 62, paddingHorizontal: 20 },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: 0.2 },
  searchBox: {
    marginTop: 14,
    marginBottom: 10,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  listContent: { paddingBottom: TAB_BAR_INSET },
  sugRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sugLabel: { flex: 1, minWidth: 0, fontSize: 15 },
  actions: { gap: 6, alignItems: 'stretch' },
  pill: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontSize: 12, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 8,
  },
  errorLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  skelThumb: { width: 96, height: 54, borderRadius: 10 },
  skelMeta: { flex: 1, gap: 8 },
  skelLine: { height: 11, borderRadius: 5.5 },
  dlWrap: { alignItems: 'center', gap: 5, width: 64 },
  dlPctRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dlPct: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dlTrack: { width: 64, height: 3, borderRadius: 1.5, overflow: 'hidden' },
  dlFill: { height: 3, borderRadius: 1.5 },
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: { alignItems: 'center', marginTop: 64, gap: 14 },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: { fontSize: 14, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
});
