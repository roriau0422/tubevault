import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { usePlayerStore } from '../../src/stores/playerStore';
import { MediaRow } from '../../src/components/MediaRow';
import { EqBars } from '../../src/components/EqBars';
import { CategoryChips } from '../../src/components/CategoryChips';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { RenameSheet } from '../../src/components/RenameSheet';
import { useTheme, TAB_BAR_INSET } from '../../src/theme';
import type { MediaRow as MediaRowData } from '../../src/db/schema';

const TYPE_FILTERS = ['all', 'audio', 'video'] as const;

export default function LibraryScreen() {
  const { t } = useTranslation();
  const th = useTheme();
  const router = useRouter();
  const lib = useLibraryStore();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playerQueue = usePlayerStore((s) => s.queue);
  const playerIndex = usePlayerStore((s) => s.index);
  const playing = usePlayerStore((s) => s.playing);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<MediaRowData | null>(null);
  const activeId = playerQueue[playerIndex]?.id;

  useFocusEffect(
    useCallback(() => {
      void useLibraryStore.getState().refresh();
    }, [])
  );

  // Unified player: the queue is exactly the list on screen, audio and video
  // interleaved. Tapping always opens the full player — with no mini player it
  // is the only way in, and swiping down dismisses it.
  const open = (item: MediaRowData) => {
    playQueue(lib.items, lib.items.findIndex((i) => i.id === item.id));
    router.push('/player');
  };

  // `cancelable` defaults to FALSE on Android, so without it neither the back
  // button nor a tap outside dismisses the dialog.
  const confirmDelete = (item: MediaRowData) =>
    Alert.alert(
      t('library.deleteConfirmTitle'),
      t('library.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => void lib.remove(item.id) },
      ],
      { cancelable: true }
    );

  // Android renders at most three buttons and silently drops the rest, so the
  // trailing Cancel never appears there — back/outside-tap is its stand-in.
  // iOS has no such limit and shows all four.
  const onLongPress = (item: MediaRowData) =>
    Alert.alert(
      item.title,
      undefined,
      [
        { text: t('library.rename'), onPress: () => setRenameFor(item) },
        { text: t('library.editCategories'), onPress: () => setPickerFor(item.id) },
        { text: t('common.delete'), style: 'destructive', onPress: () => confirmDelete(item) },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );

  const renderItem = ({ item }: { item: MediaRowData }) => {
    const isNowPlaying = item.id === activeId;
    const quality = item.height ? `${item.height}p` : null;
    return (
      <MediaRow
        title={item.title}
        subtitle={`${item.artist}${item.durationSec ? ` · ${formatDuration(item.durationSec)}` : ''}`}
        imageUrl={item.artworkUri}
        thumbShape="square"
        active={isNowPlaying}
        onPress={() => open(item)}
        onLongPress={() => onLongPress(item)}
        right={
          isNowPlaying ? (
            <EqBars color={th.accentText} animated={playing} />
          ) : item.mediaType === 'video' && quality ? (
            <View style={[styles.badge, { backgroundColor: th.fill }]}>
              <Text style={[styles.badgeLabel, { color: th.textSecondary }]}>{quality}</Text>
            </View>
          ) : undefined
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.h1, { color: th.textBright }]}>{t('tabs.library')}</Text>
      <View style={[styles.segmented, { backgroundColor: th.fill }]}>
        {TYPE_FILTERS.map((f) => {
          const active = lib.typeFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => lib.setTypeFilter(f)}
              style={[
                styles.segment,
                active && [
                  styles.segmentActive,
                  { backgroundColor: th.segmentActiveBg },
                  th.segmentShadow,
                ],
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  active
                    ? [styles.segmentLabelActive, { color: th.segmentActiveText }]
                    : { color: th.textSecondary },
                ]}
              >
                {t(`library.${f}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <CategoryChips cats={lib.cats} activeId={lib.categoryId} onSelect={lib.setCategoryId} />
      <FlatList
        data={lib.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: th.textSecondary }]}>{t('library.empty')}</Text>
        }
      />
      <CategoryPicker
        mediaId={pickerFor}
        visible={pickerFor !== null}
        onClose={() => {
          setPickerFor(null);
          void lib.refresh();
        }}
      />
      <RenameSheet
        item={renameFor}
        visible={renameFor !== null}
        onClose={() => setRenameFor(null)}
        onSave={(fields) => {
          if (!renameFor) return;
          void lib.rename(renameFor.id, fields);
          usePlayerStore.getState().updateItemMeta(renameFor.id, fields);
        }}
      />
    </View>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 62, paddingHorizontal: 20 },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: 0.2 },
  segmented: { marginTop: 14, flexDirection: 'row', borderRadius: 9, padding: 2 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 7,
  },
  segmentActive: {},
  segmentLabel: { fontSize: 13 },
  segmentLabelActive: { fontWeight: '600' },
  listContent: { paddingBottom: TAB_BAR_INSET },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeLabel: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40 },
});
