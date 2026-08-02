import { eq } from 'drizzle-orm';
import { db } from '../client';
import { downloads } from '../schema';

export async function upsertDownload(d: {
  videoId: string;
  mediaType: 'audio' | 'video';
  status: string;
  progress: number;
  error?: string | null;
}): Promise<void> {
  const row = { ...d, error: d.error ?? null, updatedAt: Date.now() };
  await db
    .insert(downloads)
    .values(row)
    .onConflictDoUpdate({ target: downloads.videoId, set: row });
}

export async function removeDownload(videoId: string): Promise<void> {
  await db.delete(downloads).where(eq(downloads.videoId, videoId));
}
