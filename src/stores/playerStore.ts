import { create } from 'zustand';
import TrackPlayer, { Event, PlaybackState, RepeatMode } from '@rntp/player';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import type { MediaRow } from '../db/schema';
import * as mediaRepo from '../db/repositories/mediaRepo';
import * as settingsRepo from '../db/repositories/settingsRepo';
import { setupPlayerOnce, toMediaItem } from '../services/player';

// ── Unified player facade ────────────────────────────────────────────────────
// One queue, one UI, two engines: RNTP plays the audio items (native queue,
// lock screen, background), an expo-video singleton plays the video items.
// RNTP is loaded with the contiguous *audio run* around the current index so
// native auto-advance and lock-screen next/prev stay inside the run; crossing
// a run boundary (a video item) is handled here in JS.

export type RepeatSetting = 'off' | 'all' | 'one';

interface PlayerState {
  queue: MediaRow[];
  index: number; // -1 = nothing loaded
  playing: boolean;
  position: number; // seconds of the current item
  duration: number;
  repeat: RepeatSetting;
  shuffled: boolean;
  playQueue: (items: MediaRow[], startIndex: number) => void;
  jumpTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  togglePlay: () => void;
  seekTo: (sec: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  restoreQueue: () => Promise<void>;
  /** Sync a rename into the queue snapshot (lock screen updates on next load). */
  updateItemMeta: (id: string, fields: { title: string; artist: string }) => void;
}

// Module-level engine bookkeeping (not reactive state).
let video: VideoPlayer | null = null;
let runStart = 0; // queue index of the first item in the RNTP run
let listenersReady = false;
let lastPersistedAt = 0;
let lastEndAdvanceAt = 0; // dedupes 'ended' + null-transition both firing
let unshuffledQueue: MediaRow[] | null = null;

function getVideo(): VideoPlayer {
  if (!video) {
    video = createVideoPlayer(null);
    video.audioMixingMode = 'doNotMix';
    video.timeUpdateEventInterval = 1;
  }
  return video;
}

// Fast Refresh re-runs this module, which resets `video` to null while the old
// native player keeps decoding — the same file then plays twice, offset by
// however long the edit took. createVideoPlayer is documented as *not*
// releasing automatically, so hand it back before the module is replaced.
declare const module: { hot?: { dispose: (cb: () => void) => void } };
if (__DEV__) {
  module.hot?.dispose(() => {
    video?.release();
    video = null;
  });
}

function currentItem(): MediaRow | null {
  const s = usePlayerStore.getState();
  return s.queue[s.index] ?? null;
}

/** The contiguous stretch of audio items around `index`. */
function audioRun(queue: MediaRow[], index: number): { start: number; items: MediaRow[] } {
  let start = index;
  while (start > 0 && queue[start - 1].mediaType === 'audio') start--;
  let end = index;
  while (end + 1 < queue.length && queue[end + 1].mediaType === 'audio') end++;
  return { start, items: queue.slice(start, end + 1) };
}

function persistPosition(mediaId: string, position: number): void {
  const now = Date.now();
  if (now - lastPersistedAt < 4000) return;
  lastPersistedAt = now;
  void settingsRepo.setSetting('playbackPosition', JSON.stringify({ mediaId, position }));
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const ensureListeners = () => {
    if (listenersReady) return;
    listenersReady = true;
    setupPlayerOnce();

    // Native advance / lock-screen skip inside the audio run. A null item
    // marks the end of the native queue (the run) — 'ended' state is not
    // emitted reliably for multi-track queues, so this is the primary
    // end-of-run signal.
    TrackPlayer.addEventListener(
      Event.MediaItemTransition,
      (e: { item: { mediaId?: string } | null; index: number }) => {
        const s = get();
        const cur = s.queue[s.index];
        if (cur?.mediaType !== 'audio') return;
        if (e.item === null) {
          advance(1, true);
          return;
        }
        const qIndex = runStart + e.index;
        if (qIndex !== s.index && s.queue[qIndex]?.mediaType === 'audio') {
          set({ index: qIndex, position: 0, duration: s.queue[qIndex].durationSec });
          void mediaRepo.markPlayed(s.queue[qIndex].id);
        }
      }
    );

    // Lock screen / notification / headset next-prev. Routed to JS (see
    // setCommands perCommandHandling) so they step the app's whole queue
    // instead of only the audio run RNTP has loaded.
    TrackPlayer.addEventListener(Event.RemoteNext, () => advance(1));
    TrackPlayer.addEventListener(Event.RemotePrevious, () => advance(-1));

    // End of the audio run → cross the boundary (video, wrap, or stop).
    TrackPlayer.addEventListener(
      Event.PlaybackStateChanged,
      (e: { state: PlaybackState }) => {
        if (e.state !== PlaybackState.Ended) return;
        if (currentItem()?.mediaType !== 'audio') return;
        advance(1, true);
      }
    );

    TrackPlayer.addEventListener(Event.IsPlayingChanged, (e: { playing: boolean }) => {
      if (currentItem()?.mediaType !== 'audio') return;
      set({ playing: e.playing });
      if (e.playing) return;
      // This build emits NO event when the last track of the native queue
      // finishes — no 'ended' state, no null transition. The stop itself is
      // the only signal: if we're parked at the end of the track after a
      // short grace period (so native mid-run advances can settle), advance.
      const endIndex = get().index;
      setTimeout(() => {
        const s = get();
        if (s.playing || s.index !== endIndex) return;
        if (s.queue[s.index]?.mediaType !== 'audio') return;
        const p = TrackPlayer.getProgress() as { position: number; duration: number };
        const pos = Math.max(p.position, s.position);
        const dur = p.duration || s.duration;
        if (dur > 0 && pos >= dur - 0.75) advance(1, true);
      }, 400);
    });

    // The PlaybackProgressUpdated event does not fire in this RNTP build;
    // poll the synchronous JSI getter instead (same approach as useProgress).
    setInterval(() => {
      const cur = currentItem();
      if (cur?.mediaType !== 'audio' || !get().playing) return;
      const p = TrackPlayer.getProgress() as { position: number; duration: number };
      set({ position: p.position, duration: p.duration || cur.durationSec });
      persistPosition(cur.id, p.position);
    }, 1000);

    const v = getVideo();
    v.addListener('playToEnd', () => {
      if (currentItem()?.mediaType !== 'video') return;
      if (get().repeat === 'one') return; // player.loop already handles it
      advance(1, true);
    });
    v.addListener('playingChange', (e: { isPlaying: boolean }) => {
      if (currentItem()?.mediaType === 'video') set({ playing: e.isPlaying });
    });
    v.addListener('timeUpdate', (e: { currentTime: number }) => {
      const cur = currentItem();
      if (cur?.mediaType !== 'video') return;
      set({ position: e.currentTime, duration: v.duration || cur.durationSec });
      persistPosition(cur.id, e.currentTime);
    });
  };

  /** Load queue[index] into the right engine. */
  const loadCurrent = (autoplay: boolean, startAt = 0) => {
    const { queue, index, repeat } = get();
    const item = queue[index];
    if (!item) return;
    ensureListeners();
    set({ position: startAt, duration: item.durationSec });

    if (item.mediaType === 'audio') {
      getVideo().pause();
      const run = audioRun(queue, index);
      runStart = run.start;
      TrackPlayer.setMediaItems(run.items.map(toMediaItem), index - run.start);
      TrackPlayer.setRepeatMode(repeat === 'one' ? RepeatMode.One : RepeatMode.Off);
      if (startAt > 0) TrackPlayer.seekTo(startAt);
      if (autoplay) TrackPlayer.play();
    } else {
      TrackPlayer.pause();
      const v = getVideo();
      v.loop = repeat === 'one';
      // replace() loads synchronously on the iOS main thread (UI freeze).
      void v.replaceAsync({ uri: item.fileUri }).then(() => {
        if (startAt > 0) v.currentTime = startAt;
        if (autoplay) v.play();
      });
    }
    void mediaRepo.markPlayed(item.id);
  };

  /** Step by ±1 respecting repeat; `fromEnded` autoplays the landing item. */
  const advance = (dir: 1 | -1, fromEnded = false) => {
    if (fromEnded) {
      // RNTP may signal the end of a run twice (state + null transition).
      const now = Date.now();
      if (now - lastEndAdvanceAt < 1000) return;
      lastEndAdvanceAt = now;
    }
    const { queue, index, repeat } = get();
    if (queue.length === 0) return;
    let nextIndex = index + dir;
    if (nextIndex >= queue.length) {
      if (repeat !== 'all') {
        if (fromEnded) set({ playing: false });
        return;
      }
      nextIndex = 0;
    }
    if (nextIndex < 0) nextIndex = 0;
    set({ index: nextIndex });
    loadCurrent(true); // manual skip and natural advance both start playback
  };

  return {
    queue: [],
    index: -1,
    playing: false,
    position: 0,
    duration: 0,
    repeat: 'off',
    shuffled: false,

    playQueue(items, startIndex) {
      if (items.length === 0) return;
      const start = Math.max(0, startIndex);
      const { queue: prev, index: prevIndex, playing, position } = get();
      const sameItem = prev[prevIndex]?.id === items[start]?.id;
      // Re-opening whatever is already loaded must not rewind it. Identical
      // queue: leave both engines alone. Same item but a different queue (a
      // different filter or tab): reload so RNTP's audio run matches the new
      // neighbours, but resume at the live position instead of from zero.
      if (sameItem && prev.length === items.length && prev.every((p, i) => p.id === items[i].id)) {
        return;
      }
      set({ queue: [...items], index: start, shuffled: false });
      void settingsRepo.setSetting('queueIds', JSON.stringify(items.map((i) => i.id)));
      if (sameItem) loadCurrent(playing, position);
      else loadCurrent(true);
    },

    jumpTo(index) {
      const { queue, index: current } = get();
      if (!queue[index] || index === current) return; // tapping the active row is a no-op
      set({ index });
      loadCurrent(true);
    },

    next: () => advance(1),
    previous: () => advance(-1),

    togglePlay() {
      const item = currentItem();
      if (!item) return;
      if (item.mediaType === 'audio') {
        if (get().playing) TrackPlayer.pause();
        else {
          getVideo().pause();
          TrackPlayer.play();
        }
      } else {
        const v = getVideo();
        if (get().playing) v.pause();
        else {
          TrackPlayer.pause();
          v.play();
        }
      }
    },

    seekTo(sec) {
      const item = currentItem();
      if (!item) return;
      set({ position: sec });
      if (item.mediaType === 'audio') TrackPlayer.seekTo(sec);
      else getVideo().currentTime = sec;
    },

    cycleRepeat() {
      const order: RepeatSetting[] = ['off', 'all', 'one'];
      const repeat = order[(order.indexOf(get().repeat) + 1) % order.length];
      set({ repeat });
      const item = currentItem();
      if (item?.mediaType === 'audio') {
        TrackPlayer.setRepeatMode(repeat === 'one' ? RepeatMode.One : RepeatMode.Off);
      }
      getVideo().loop = repeat === 'one';
    },

    toggleShuffle() {
      const { queue, index, shuffled, playing, position } = get();
      if (queue.length < 2) return;
      let nextQueue: MediaRow[];
      if (shuffled) {
        nextQueue = unshuffledQueue ?? queue;
        unshuffledQueue = null;
      } else {
        unshuffledQueue = queue;
        // Current item stays put; the rest is shuffled around it.
        const rest = queue.filter((_, i) => i !== index);
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        nextQueue = [...rest.slice(0, index), queue[index], ...rest.slice(index)];
      }
      const newIndex = Math.max(
        0,
        nextQueue.findIndex((it) => it.id === queue[index]?.id)
      );
      set({ queue: nextQueue, index: newIndex, shuffled: !shuffled });
      // Reload the engine mapping without losing the playback position.
      loadCurrent(playing, position);
    },

    updateItemMeta(id, fields) {
      const { queue } = get();
      if (!queue.some((i) => i.id === id)) return;
      set({ queue: queue.map((i) => (i.id === id ? { ...i, ...fields } : i)) });
      if (unshuffledQueue) {
        unshuffledQueue = unshuffledQueue.map((i) => (i.id === id ? { ...i, ...fields } : i));
      }
    },

    async restoreQueue() {
      const idsJson = await settingsRepo.getSetting('queueIds');
      if (!idsJson) return;
      const ids: string[] = JSON.parse(idsJson);
      const rows = (await Promise.all(ids.map((id) => mediaRepo.getMedia(id)))).filter(
        (r): r is MediaRow => r !== null
      );
      if (rows.length === 0) return;
      const posJson = await settingsRepo.getSetting('playbackPosition');
      const pos = posJson
        ? (JSON.parse(posJson) as { mediaId: string; position: number })
        : { mediaId: rows[0].id, position: 0 };
      const index = Math.max(0, rows.findIndex((r) => r.id === pos.mediaId));
      set({ queue: rows, index });
      // Cold start restores PAUSED at the saved position (spec).
      loadCurrent(false, pos.position);
    },
  };
});

/** The singleton the full player's VideoView attaches to. */
export function getVideoPlayer(): VideoPlayer {
  return getVideo();
}
