import TrackPlayer, { Event, PlayerCommand, type MediaItem } from '@rntp/player';
import type { MediaRow } from '../db/schema';
import * as settingsRepo from '../db/repositories/settingsRepo';

let ready = false;

export function setupPlayerOnce(): void {
  if (ready) return;
  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
  });
  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Seek,
      PlayerCommand.SkipForward,
      PlayerCommand.SkipBackward,
    ],
    handling: 'hybrid',
    perCommandHandling: {
      [PlayerCommand.Next]: 'js',
      [PlayerCommand.Previous]: 'js',
    },
    forwardInterval: 15,
    backwardInterval: 15,
  });
  if (__DEV__) {
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      console.error('[player] playback error:', JSON.stringify(e));
    });
  }
  // Persist position for cold-start restore (spec: PlayerService).
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    void settingsRepo.setSetting(
      'playbackPosition',
      JSON.stringify({ mediaId: e.mediaId, position: e.position })
    );
  });
  ready = true;
}

export function toMediaItem(m: MediaRow): MediaItem {
  return {
    mediaId: m.id,
    url: m.fileUri,
    title: m.title,
    artist: m.artist,
    artworkUrl: m.artworkUri ?? undefined,
    duration: m.durationSec,
    mimeType: m.mimeType,
  };
}

export function artworkUri(item: MediaItem): string | undefined {
  return typeof item.artworkUrl === 'string' ? item.artworkUrl : undefined;
}
