import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OutputDeviceButton } from '@rntp/player';
import { VideoView } from 'expo-video';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayerStore, getVideoPlayer, type RepeatSetting } from '../src/stores/playerStore';
import * as categoriesRepo from '../src/db/repositories/categoriesRepo';
import { MediaRow } from '../src/components/MediaRow';
import { EqBars } from '../src/components/EqBars';
import { useTheme } from '../src/theme';
import { formatBytes } from '../src/format';

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayerModal() {
  const { t } = useTranslation();
  const th = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    queue,
    index,
    playing,
    position,
    duration,
    repeat,
    shuffled,
    togglePlay,
    next,
    previous,
    jumpTo,
    seekTo,
    cycleRepeat,
    toggleShuffle,
  } = usePlayerStore();
  const item = queue[index];
  const [cat, setCat] = useState<{ mediaId: string; name: string | null } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const [touchPing, setTouchPing] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const videoRef = useRef<VideoView>(null);
  const dragY = useMemo(() => new Animated.Value(0), []);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          !fullscreen && g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 2,
        onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 140 || g.vy > 0.9) router.back();
          else Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [fullscreen, dragY, router]
  );

  const mediaId = item?.id;
  const controlsShown = hiddenFor !== mediaId;

  useEffect(() => {
    if (!controlsShown || !playing || !mediaId || scrubbing) return;
    const id = setTimeout(() => setHiddenFor(mediaId), 3000);
    return () => clearTimeout(id);
  }, [controlsShown, playing, touchPing, mediaId, scrubbing]);

  useEffect(() => {
    if (!mediaId) return;
    let alive = true;
    void Promise.all([
      categoriesRepo.listCategories(),
      categoriesRepo.categoryIdsForMedia(mediaId),
    ]).then(([all, ids]) => {
      if (!alive) return;
      const first = all.find((c) => ids.includes(c.id));
      setCat({ mediaId, name: first?.name ?? null });
    });
    return () => {
      alive = false;
    };
  }, [mediaId]);
  const category = cat && cat.mediaId === mediaId ? cat.name : null;

  const bg = th.dark ? '#000000' : '#ffffff';

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.empty, { color: th.textSecondary }]}>{t('player.noTrack')}</Text>
      </View>
    );
  }

  const isVideo = item.mediaType === 'video';
  const qualityChip = item.height ? `${item.height}p · H.264` : null;
  const sizeChip = item.sizeBytes > 0 ? formatBytes(item.sizeBytes) : null;

  const header = (
    <View style={styles.header}>
      <Text numberOfLines={2} style={[styles.title, { color: th.textBright }]}>
        {item.title}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, { color: th.textSecondary }]}>
        {item.artist}
      </Text>
      <View style={styles.chips}>
        {isVideo && qualityChip ? (
          <View style={[styles.chip, { backgroundColor: th.fill }]}>
            <Text style={[styles.chipLabel, { color: th.textSecondary }]}>{qualityChip}</Text>
          </View>
        ) : null}
        {isVideo && sizeChip ? (
          <View style={[styles.chip, { backgroundColor: th.fill }]}>
            <Text style={[styles.chipLabel, { color: th.textSecondary }]}>{sizeChip}</Text>
          </View>
        ) : null}
        {category ? (
          <View style={[styles.chip, { backgroundColor: th.accentTintStrong }]}>
            <Text style={[styles.chipLabel, { color: th.accentText }]}>{category}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.modes}>
        <Pressable hitSlop={10} onPress={toggleShuffle}>
          <Text style={[styles.modeLabel, { color: shuffled ? th.accentText : th.textTertiary }]}>
            {t('player.shuffle')}
          </Text>
        </Pressable>
        <Pressable hitSlop={10} onPress={cycleRepeat}>
          <Text
            style={[styles.modeLabel, { color: repeat !== 'off' ? th.accentText : th.textTertiary }]}
          >
            {repeatLabel(repeat, t('player.repeat'))}
          </Text>
        </Pressable>
        <OutputDeviceButton tintColor={th.textTertiary} style={styles.route} />
      </View>
      <View style={[styles.queueHeading, { borderTopColor: th.separator }]}>
        <Text style={[styles.queueTitle, { color: th.textBright }]}>{t('player.queue')}</Text>
        <Text style={[styles.queueCount, { color: th.textTertiary }]}>
          {index + 1} / {queue.length}
        </Text>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bg, transform: [{ translateY: dragY }] },
      ]}
    >
      <View {...pan.panHandlers} style={[styles.pinned, { paddingTop: insets.top + 8 }]}>
        <View
          style={[
            styles.grabber,
            { backgroundColor: th.dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.25)' },
          ]}
        />
        {/* One stage for both engines: video surface or album art, same 16:9
            box, same overlay controls on top. */}
        <View style={styles.stage}>
          {isVideo ? (
            <VideoView
              ref={videoRef}
              player={getVideoPlayer()}
              style={styles.fill}
              nativeControls={fullscreen}
              onFullscreenEnter={() => setFullscreen(true)}
              onFullscreenExit={() => setFullscreen(false)}
              contentFit="contain"
            />
          ) : item.artworkUri ? (
            <Image
              source={{ uri: item.artworkUri }}
              contentFit="cover"
              style={[styles.fill, { backgroundColor: th.thumbPlaceholder }]}
            />
          ) : (
            <View style={[styles.fill, { backgroundColor: th.thumbPlaceholder }]} />
          )}
          {controlsShown ? (
            <View style={styles.overlay} onTouchStart={() => setTouchPing((p) => p + 1)}>
              <Pressable style={styles.scrim} onPress={() => setHiddenFor(item.id)} />
              <View style={styles.overlayControls}>
                <Pressable hitSlop={12} onPress={previous}>
                  <Ionicons name="play-skip-back" size={30} color="#ffffff" />
                </Pressable>
                <Pressable hitSlop={8} style={styles.overlayPlayButton} onPress={togglePlay}>
                  <Ionicons
                    name={playing ? 'pause' : 'play'}
                    size={28}
                    color="#ffffff"
                    style={playing ? undefined : styles.playIconNudge}
                  />
                </Pressable>
                <Pressable hitSlop={12} onPress={next}>
                  <Ionicons name="play-skip-forward" size={30} color="#ffffff" />
                </Pressable>
              </View>
              <View style={styles.scrubber}>
                <Text style={styles.overlayTime}>{formatTime(position)}</Text>
                <Slider
                  style={styles.overlaySlider}
                  minimumValue={0}
                  maximumValue={Math.max(duration, 1)}
                  value={position}
                  onSlidingStart={() => setScrubbing(true)}
                  onSlidingComplete={(v) => {
                    setScrubbing(false);
                    seekTo(v);
                  }}
                  minimumTrackTintColor={th.accent}
                  maximumTrackTintColor="rgba(255,255,255,0.25)"
                  thumbTintColor={th.accent}
                />
                <Text style={styles.overlayTime}>{formatTime(duration)}</Text>
                {isVideo ? (
                  <Pressable hitSlop={10} onPress={() => void videoRef.current?.enterFullscreen()}>
                    <Ionicons name="expand" size={18} color="#ffffff" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setHiddenFor(null)} />
          )}
        </View>
      </View>
      <FlatList
        data={queue}
        keyExtractor={(q) => q.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={header}
        renderItem={({ item: q, index: i }) => (
          <MediaRow
            title={q.title}
            subtitle={`${q.artist}${q.durationSec ? ` · ${formatTime(q.durationSec)}` : ''}`}
            imageUrl={q.artworkUri}
            active={q.id === mediaId}
            onPress={() => jumpTo(i)}
            right={q.id === mediaId ? <EqBars color={th.accentText} animated={playing} /> : undefined}
          />
        )}
      />
    </Animated.View>
  );
}

function repeatLabel(repeat: RepeatSetting, base: string): string {
  return repeat === 'one' ? `${base} · 1` : base;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pinned: { paddingBottom: 4 },
  grabber: { width: 36, height: 5, borderRadius: 999, alignSelf: 'center', marginBottom: 12 },
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  overlayControls: { flexDirection: 'row', alignItems: 'center', gap: 46 },
  overlayPlayButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scrubber: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  overlaySlider: { flex: 1, height: 20 },
  overlayTime: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },
  listContent: { paddingHorizontal: 20 },
  header: { paddingTop: 14 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  artist: { fontSize: 14, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  playIconNudge: { marginLeft: 4 },
  modes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
    marginTop: 22,
  },
  modeLabel: { fontSize: 13, fontWeight: '600' },
  route: { width: 22, height: 22 },
  queueHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  queueTitle: { fontSize: 15, fontWeight: '700' },
  queueCount: { fontSize: 13, fontVariant: ['tabular-nums'] },
  empty: { marginTop: 80, textAlign: 'center' },
});
