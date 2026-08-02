import * as FileSystem from 'expo-file-system/legacy';
import { File, FileMode } from 'expo-file-system';
import { AppError, toAppError } from '../errors';
import * as mediaRepo from '../db/repositories/mediaRepo';
import * as downloadsRepo from '../db/repositories/downloadsRepo';
import { MEDIA_DIRS, TMP_DIR } from './bootstrap';
import { resolveVideo, ANDROID_VR_USER_AGENT, type ResolvedVideo } from './innertube';
import { pickAudioFormat, pickVideoFormats } from './formatPolicy';
import { canStartNext, isActive, retryDelayMs, type QueueItem } from './downloadMachine';
import { muxCopy, remuxCopy } from './mux';
import { applyAutoTag } from './autotag';
import * as categoriesRepo from '../db/repositories/categoriesRepo';

const CHUNK_SIZE = 2 * 1024 * 1024;
async function downloadToFile(
  url: string,
  fileUri: string,
  onProgress: (bytesWritten: number, bytesExpected: number) => void
): Promise<void> {
  const file = new File(fileUri);
  file.create({ overwrite: true, intermediates: true });
  const handle = file.open(FileMode.WriteOnly);
  try {
    let offset = 0;
    let total = 0;
    for (;;) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ANDROID_VR_USER_AGENT,
          Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}`,
        },
      });
      if (res.status >= 400) {
        throw new AppError('DOWNLOAD_FAILED', `download HTTP ${res.status}`);
      }
      if (total === 0) {
        const m = /\/(\d+)\s*$/.exec(res.headers.get('content-range') ?? '');
        if (m) total = Number(m[1]);
      }
      const chunk = new Uint8Array(await res.arrayBuffer());
      if (chunk.length > 0) {
        handle.writeBytes(chunk);
        offset += chunk.length;
        onProgress(offset, total);
      }
      if (res.status === 200 || chunk.length === 0 || (total > 0 && offset >= total)) break;
    }
  } finally {
    handle.close();
  }
}

class SpeedMeter {
  private lastBytes = 0;
  private lastTime = 0;
  private ema = 0;

  sample(totalBytes: number): number {
    const now = Date.now();
    if (this.lastTime === 0) {
      this.lastTime = now;
      this.lastBytes = totalBytes;
      return 0;
    }
    const dtSec = (now - this.lastTime) / 1000;
    if (dtSec < 0.5) return this.ema;
    const rate = Math.max(0, totalBytes - this.lastBytes) / dtSec;
    this.ema = this.ema === 0 ? rate : this.ema * 0.7 + rate * 0.3;
    this.lastBytes = totalBytes;
    this.lastTime = now;
    return this.ema;
  }
}

export interface EnqueueRequest {
  videoId: string;
  mediaType: 'audio' | 'video';
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  /** Categories chosen up front (ask-on-download); assigned after the media row is created. */
  categoryIds?: number[];
}

type Listener = (items: QueueItem[]) => void;

class DownloadManager {
  private items = new Map<string, QueueItem>();
  private listeners = new Set<Listener>();
  private cancelled = new Set<string>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  enqueue(req: EnqueueRequest): void {
    const existing = this.items.get(req.videoId);
    if (existing && existing.phase !== 'failed') return;
    this.cancelled.delete(req.videoId);
    this.items.set(req.videoId, { ...req, phase: 'queued', progress: 0, attempts: 0 });
    this.emit();
    this.pump();
  }

  cancel(videoId: string): void {
    this.cancelled.add(videoId);
    const item = this.items.get(videoId);
    if (item && !isActive(item.phase)) this.items.delete(videoId);
    this.emit();
  }

  retry(videoId: string): void {
    const item = this.items.get(videoId);
    if (!item || item.phase !== 'failed') return;
    this.cancelled.delete(videoId);
    this.patch(videoId, {
      phase: 'queued',
      progress: 0,
      attempts: 0,
      error: undefined,
      bytesWritten: undefined,
      bytesTotal: undefined,
      bytesPerSec: undefined,
    });
    this.pump();
  }

  private snapshot(): QueueItem[] {
    return [...this.items.values()];
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  private patch(videoId: string, p: Partial<QueueItem>): void {
    const item = this.items.get(videoId);
    if (!item) return;
    this.items.set(videoId, { ...item, ...p });
    this.emit();
    const u = this.items.get(videoId)!;
    void downloadsRepo.upsertDownload({
      videoId,
      mediaType: u.mediaType,
      status: u.phase,
      progress: Math.round(u.progress * 100),
      error: u.error ?? null,
    });
  }

  private pump(): void {
    const next = canStartNext(this.snapshot());
    if (next) void this.run(next);
  }

  private async run(item: QueueItem): Promise<void> {
    try {
      if (this.cancelled.has(item.videoId)) {
        this.items.delete(item.videoId);
        this.cancelled.delete(item.videoId);
        this.emit();
        return;
      }
      if (__DEV__) console.log('[download] run', item.mediaType, item.videoId);
      this.patch(item.videoId, { phase: 'resolving', attempts: item.attempts + 1 });
      const info = await resolveVideo(item.videoId);
      if (__DEV__) console.log('[download] resolved, starting', item.mediaType);
      if (item.mediaType === 'audio') {
        await this.runAudio(item.videoId, info);
      } else {
        await this.runVideo(item.videoId, info);
      }
      await downloadsRepo.removeDownload(item.videoId);
      this.patch(item.videoId, { phase: 'done', progress: 1, bytesPerSec: undefined });
      if (__DEV__) console.log('[download] DONE', item.mediaType, item.videoId);
    } catch (e) {
      if (__DEV__) {
        const app = toAppError(e, 'DOWNLOAD_FAILED');
        let cause: unknown = app.cause;
        const chain: string[] = [];
        while (cause) {
          const c = cause as { message?: string; code?: string; cause?: unknown };
          chain.push(c.message ?? c.code ?? String(cause));
          cause = c.cause;
        }
        console.error(`[download] FAILED ${item.videoId} code=${app.code} causes=[${chain.join(' <- ')}]`);
      }
      await this.handleFailure(item.videoId, toAppError(e, 'DOWNLOAD_FAILED'));
    } finally {
      this.pump();
    }
  }

  private async handleFailure(videoId: string, err: AppError): Promise<void> {
    const item = this.items.get(videoId);
    if (!item) return;
    const delay = retryDelayMs(item.attempts);
    if (delay === null || this.cancelled.has(videoId)) {
      this.patch(videoId, { phase: 'failed', error: err.code });
      return;
    }
    // Keep the current (active) phase during backoff so the slot stays occupied
    // and a concurrent pump() can't double-start this item.
    this.patch(videoId, { progress: 0, bytesWritten: undefined, bytesPerSec: undefined });
    await new Promise((r) => setTimeout(r, delay));
    this.patch(videoId, { phase: 'queued' });
    // run()'s finally pump() fires after this returns; re-resolve happens
    // naturally in run(), so expired URLs (~6h) get fresh ones.
  }

  private async runAudio(videoId: string, info: ResolvedVideo): Promise<void> {
    const pick = pickAudioFormat(info.adaptiveFormats);
    if (!pick?.format.url) throw new AppError('NO_FORMAT', 'no audio format with url');
    const tmpUri = `${TMP_DIR}${videoId}.audio.tmp`;

    const meter = new SpeedMeter();
    const expected = pick.format.content_length ?? 0;
    this.patch(videoId, { phase: 'downloading', bytesTotal: expected || undefined });
    await downloadToFile(pick.format.url, tmpUri, (written, reported) => {
      const total = expected || reported;
      this.patch(videoId, {
        progress: total > 0 ? written / total : 0,
        bytesWritten: written,
        bytesTotal: total || undefined,
        bytesPerSec: meter.sample(written),
      });
    });

    const finalUri = `${MEDIA_DIRS.audio}${videoId}.${pick.ext}`;
    this.patch(videoId, { phase: 'finalizing', bytesPerSec: undefined });
    // Remux instead of move: fixes the fragmented-DASH container (misreported
    // duration → playback slides past the real end). Falls back to the raw
    // file if ffmpeg fails, since a playable file beats a failed download.
    try {
      await remuxCopy(tmpUri, finalUri);
      await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
    } catch {
      await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
    }
    const artworkUri = await this.saveArtwork(videoId, info.thumbnailUrl);
    const size = await FileSystem.getInfoAsync(finalUri);
    await mediaRepo.upsertMedia({
      id: videoId,
      mediaType: 'audio',
      title: info.title,
      artist: info.author,
      durationSec: info.durationSec,
      fileUri: finalUri,
      artworkUri,
      mimeType: pick.format.mime_type,
      bitrate: pick.format.bitrate,
      height: null,
      sizeBytes: size.exists ? (size.size ?? 0) : (pick.format.content_length ?? 0),
      addedAt: Date.now(),
    });
    await this.autoTag(videoId, info);
  }

  protected async runVideo(videoId: string, info: ResolvedVideo): Promise<void> {
    const pick = pickVideoFormats(info.adaptiveFormats);
    if (!pick?.video.url || !pick.audio.url) throw new AppError('NO_FORMAT', 'no video+audio formats with url');
    const tmpVideo = `${TMP_DIR}${videoId}.video.mp4`;
    const tmpAudio = `${TMP_DIR}${videoId}.audio.m4a`;
    const finalUri = `${MEDIA_DIRS.video}${videoId}.mp4`;

    try {
      // Download the two tracks separately, then mux; reserve the last ~8% for muxing.
      // Byte totals span both tracks so the UI can show "84 MB / 186 MB".
      const meter = new SpeedMeter();
      let videoExpected = pick.video.content_length ?? 0;
      let audioExpected = pick.audio.content_length ?? 0;
      const combinedTotal = () => (videoExpected && audioExpected ? videoExpected + audioExpected : 0);
      let videoBytes = 0;

      this.patch(videoId, { phase: 'downloading_video', bytesTotal: combinedTotal() || undefined });
      await downloadToFile(pick.video.url, tmpVideo, (written, reported) => {
        if (!videoExpected && reported > 0) videoExpected = reported;
        videoBytes = written;
        this.patch(videoId, {
          progress: videoExpected > 0 ? (written / videoExpected) * 0.6 : 0,
          bytesWritten: written,
          bytesTotal: combinedTotal() || undefined,
          bytesPerSec: meter.sample(written),
        });
      });
      this.patch(videoId, { phase: 'downloading_audio' });
      await downloadToFile(pick.audio.url, tmpAudio, (written, reported) => {
        if (!audioExpected && reported > 0) audioExpected = reported;
        this.patch(videoId, {
          progress: 0.6 + (audioExpected > 0 ? (written / audioExpected) * 0.3 : 0),
          bytesWritten: videoBytes + written,
          bytesTotal: combinedTotal() || undefined,
          bytesPerSec: meter.sample(videoBytes + written),
        });
      });

      this.patch(videoId, { phase: 'muxing', progress: 0.92, bytesPerSec: undefined });
      await muxCopy(tmpVideo, tmpAudio, finalUri);

      this.patch(videoId, { phase: 'finalizing', progress: 1 });
      const artworkUri = await this.saveArtwork(videoId, info.thumbnailUrl);
      const size = await FileSystem.getInfoAsync(finalUri);
      await mediaRepo.upsertMedia({
        id: videoId,
        mediaType: 'video',
        title: info.title,
        artist: info.author,
        durationSec: info.durationSec,
        fileUri: finalUri,
        artworkUri,
        mimeType: 'video/mp4',
        bitrate: pick.video.bitrate,
        height: pick.video.height ?? null,
        sizeBytes: size.exists ? (size.size ?? 0) : (pick.video.content_length ?? 0),
        addedAt: Date.now(),
      });
      await this.autoTag(videoId, info);
    } finally {
      await FileSystem.deleteAsync(tmpVideo, { idempotent: true }).catch(() => {});
      await FileSystem.deleteAsync(tmpAudio, { idempotent: true }).catch(() => {});
    }
  }

  protected async autoTag(videoId: string, info: ResolvedVideo): Promise<void> {
    await applyAutoTag(videoId, info.category).catch(() => {}); // tagging never fails a download
    // An explicit user pick from the download sheet overrides the auto tag.
    const chosen = this.items.get(videoId)?.categoryIds;
    if (chosen?.length) {
      await categoriesRepo.setMediaCategories(videoId, chosen).catch(() => {});
    }
  }

  protected async saveArtwork(videoId: string, thumbnailUrl: string | null): Promise<string | null> {
    if (!thumbnailUrl) return null;
    const uri = `${MEDIA_DIRS.artwork}${videoId}.jpg`;
    try {
      await FileSystem.downloadAsync(thumbnailUrl, uri);
      return uri;
    } catch {
      return null; // artwork is optional, never fails a download
    }
  }
}

export const downloadManager = new DownloadManager();
export type { QueueItem };
