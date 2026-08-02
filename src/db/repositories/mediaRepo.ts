import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../client';
import { media, mediaCategories, type MediaRow, type NewMediaRow } from '../schema';

export type LibraryFilter = {
  mediaType?: 'audio' | 'video';
  categoryId?: number;
  search?: string;
};

export async function upsertMedia(row: NewMediaRow): Promise<void> {
  await db.insert(media).values(row).onConflictDoUpdate({ target: media.id, set: row });
}

export async function getMedia(id: string): Promise<MediaRow | null> {
  const rows = await db.select().from(media).where(eq(media.id, id));
  return rows[0] ?? null;
}

export async function listMedia(f: LibraryFilter = {}): Promise<MediaRow[]> {
  const conds = [];
  if (f.mediaType) conds.push(eq(media.mediaType, f.mediaType));
  if (f.search) {
    const q = `%${f.search}%`;
    conds.push(or(like(media.title, q), like(media.artist, q)));
  }
  if (f.categoryId != null) {
    const tagged = db
      .select({ id: mediaCategories.mediaId })
      .from(mediaCategories)
      .where(eq(mediaCategories.categoryId, f.categoryId));
    conds.push(inArray(media.id, tagged));
  }
  return db
    .select()
    .from(media)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(media.addedAt));
}

export async function deleteMedia(id: string): Promise<void> {
  await db.delete(mediaCategories).where(eq(mediaCategories.mediaId, id));
  await db.delete(media).where(eq(media.id, id));
}

export async function rename(
  id: string,
  fields: { title: string; artist: string }
): Promise<void> {
  await db.update(media).set(fields).where(eq(media.id, id));
}

export async function markPlayed(id: string): Promise<void> {
  await db
    .update(media)
    .set({ playCount: sql`${media.playCount} + 1`, lastPlayedAt: Date.now() })
    .where(eq(media.id, id));
}

export async function allFileUris(): Promise<{ id: string; fileUri: string }[]> {
  return db.select({ id: media.id, fileUri: media.fileUri }).from(media);
}

export async function totals(): Promise<{
  count: number;
  sizeBytes: number;
  videoBytes: number;
  audioBytes: number;
}> {
  const rows = await db
    .select({
      count: sql<number>`count(*)`,
      sizeBytes: sql<number>`coalesce(sum(${media.sizeBytes}), 0)`,
      videoBytes: sql<number>`coalesce(sum(case when ${media.mediaType} = 'video' then ${media.sizeBytes} else 0 end), 0)`,
      audioBytes: sql<number>`coalesce(sum(case when ${media.mediaType} = 'audio' then ${media.sizeBytes} else 0 end), 0)`,
    })
    .from(media);
  return rows[0] ?? { count: 0, sizeBytes: 0, videoBytes: 0, audioBytes: 0 };
}
