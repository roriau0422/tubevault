import { useEffect, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDownloadStore } from '../../src/stores/downloadStore';
import { ProgressBar } from '../../src/components/ProgressBar';
import { useTheme, TAB_BAR_INSET } from '../../src/theme';
import { formatBytes } from '../../src/format';
import { isActive } from '../../src/services/downloadMachine';
import * as mediaRepo from '../../src/db/repositories/mediaRepo';
import type { QueueItem } from '../../src/services/downloadMachine';
import type { MediaRow } from '../../src/db/schema';

function activeStatus(item: QueueItem, phaseLabel: string): string {
  const parts = [phaseLabel];
  if (item.phase.startsWith('downloading') && item.bytesWritten != null) {
    parts.push(
      item.bytesTotal
        ? `${formatBytes(item.bytesWritten)} / ${formatBytes(item.bytesTotal)}`
        : formatBytes(item.bytesWritten)
    );
    if (item.bytesPerSec && item.bytesPerSec >= 1e3) {
      parts.push(`${formatBytes(item.bytesPerSec)}/s`);
    }
  }
  return parts.join(' · ');
}

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const th = useTheme();
  const { items, cancel, retry } = useDownloadStore();
  const [mediaById, setMediaById] = useState<Record<string, MediaRow>>({});

  const doneIds = items
    .filter((i) => i.phase === 'done')
    .map((i) => i.videoId)
    .join(',');
  useEffect(() => {
    if (!doneIds) return;
    let alive = true;
    void Promise.all(doneIds.split(',').map((id) => mediaRepo.getMedia(id))).then((rows) => {
      if (!alive) return;
      const map: Record<string, MediaRow> = {};
      for (const r of rows) if (r) map[r.id] = r;
      setMediaById(map);
    });
    return () => {
      alive = false;
    };
  }, [doneIds]);

  const running = items.filter((i) => i.phase !== 'done' && i.phase !== 'failed');
  const failed = items.filter((i) => i.phase === 'failed');
  const done = items.filter((i) => i.phase === 'done');

  const sections = [
    ...(running.length + failed.length > 0
      ? [{ key: 'active', title: `${t('downloads.active')} — ${running.length + failed.length}`, data: [...running, ...failed] }]
      : []),
    ...(done.length > 0 ? [{ key: 'done', title: t('downloads.completed'), data: done }] : []),
  ];

  const renderItem = ({ item }: { item: QueueItem }) => {
    if (item.phase === 'failed') {
      return (
        <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
          <View style={styles.cardHeader}>
            <View style={styles.info}>
              <Text numberOfLines={1} style={[styles.title, { color: th.text }]}>{item.title}</Text>
              <Text style={[styles.status, { color: th.accentText }]}>
                {t('downloads.status.failed')}
                {item.error ? ` · ${t(`errors.${item.error}`)}` : ''}
              </Text>
            </View>
            <Pressable
              hitSlop={6}
              style={[styles.retryPill, { backgroundColor: th.accentTintStrong }]}
              onPress={() => retry(item.videoId)}
            >
              <Text style={[styles.retryLabel, { color: th.accentText }]}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    if (item.phase === 'done') {
      const media = mediaById[item.videoId];
      const meta = [
        t(`library.${item.mediaType}`),
        media?.height ? `${media.height}p` : null,
        media?.sizeBytes ? formatBytes(media.sizeBytes) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      return (
        <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
          <View style={styles.cardHeader}>
            <View style={[styles.doneCircle, { backgroundColor: th.accentTintStrong }]}>
              <Ionicons name="checkmark" size={13} color={th.accentText} />
            </View>
            <View style={styles.info}>
              <Text numberOfLines={1} style={[styles.title, { color: th.text }]}>{item.title}</Text>
              <Text style={[styles.status, { color: th.textTertiary }]}>{meta}</Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.card, { backgroundColor: th.card }, th.cardShadow]}>
        <View style={styles.cardHeader}>
          <View style={styles.info}>
            <Text numberOfLines={1} style={[styles.title, { color: th.text }]}>{item.title}</Text>
            <Text
              numberOfLines={1}
              style={[styles.status, { color: item.phase === 'queued' ? th.textTertiary : th.textSecondary }]}
            >
              {activeStatus(item, t(`downloads.status.${item.phase}`))}
            </Text>
          </View>
          <Text style={[styles.pct, { color: th.textTertiary }]}>
            {Math.round(Math.min(1, Math.max(0, item.progress)) * 100)}%
          </Text>
          <Pressable
            hitSlop={6}
            style={[styles.cancelCircle, { backgroundColor: th.fill }]}
            onPress={() => cancel(item.videoId)}
          >
            <Ionicons name="close" size={14} color={th.textSecondary} />
          </Pressable>
        </View>
        <ProgressBar progress={item.progress} active={isActive(item.phase)} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.h1, { color: th.textBright }]}>{t('tabs.downloads')}</Text>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.videoId}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: th.textTertiary }]}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: th.textSecondary }]}>{t('downloads.empty')}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 62, paddingHorizontal: 20 },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: 0.2 },
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 18,
    marginBottom: 8,
  },
  listContent: { paddingBottom: TAB_BAR_INSET },
  card: { borderRadius: 14, padding: 13, gap: 8, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600', fontSize: 14 },
  status: { fontSize: 12, marginTop: 2 },
  pct: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cancelCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  retryLabel: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40 },
});
