import type { ErrorCode } from '../errors';

export type DownloadPhase =
  | 'queued'
  | 'resolving'
  | 'downloading'
  | 'downloading_video'
  | 'downloading_audio'
  | 'muxing'
  | 'finalizing'
  | 'done'
  | 'failed';

export interface QueueItem {
  videoId: string;
  mediaType: 'audio' | 'video';
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  /** User-chosen categories to assign once the media row exists (ask-on-download). */
  categoryIds?: number[];
  phase: DownloadPhase;
  progress: number; // 0–1 combined
  attempts: number;
  error?: ErrorCode;
  bytesWritten?: number; // downloaded so far across all tracks of this item
  bytesTotal?: number; // expected total across all tracks; undefined when unknown
  bytesPerSec?: number; // smoothed transfer rate while downloading
}

export const MAX_CONCURRENT = 2; // googlevideo throttles beyond 2 (arch doc §4.2)
export const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 8000, 30000] as const;

export function retryDelayMs(attempt: number): number | null {
  return attempt >= 1 && attempt <= MAX_ATTEMPTS ? BACKOFF_MS[attempt - 1] : null;
}

export function isActive(phase: DownloadPhase): boolean {
  return phase !== 'queued' && phase !== 'done' && phase !== 'failed';
}

export function canStartNext(items: QueueItem[]): QueueItem | undefined {
  const active = items.filter((i) => isActive(i.phase)).length;
  if (active >= MAX_CONCURRENT) return undefined;
  return items.find((i) => i.phase === 'queued');
}

// Combined video progress: video 70%, audio 15%, mux 15% (arch doc §4.5).
export function videoProgress(phase: DownloadPhase, phaseProgress: number): number {
  switch (phase) {
    case 'downloading_video':
      return phaseProgress * 0.7;
    case 'downloading_audio':
      return 0.7 + phaseProgress * 0.15;
    case 'muxing':
      return 0.85 + phaseProgress * 0.15;
    case 'finalizing':
      return 1;
    default:
      return phaseProgress;
  }
}
