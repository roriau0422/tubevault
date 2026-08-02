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
  categoryIds?: number[];
  phase: DownloadPhase;
  progress: number; // 0–1 combined
  attempts: number;
  error?: ErrorCode;
  bytesWritten?: number; 
  bytesTotal?: number;
  bytesPerSec?: number;
}

export const MAX_CONCURRENT = 2;
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
