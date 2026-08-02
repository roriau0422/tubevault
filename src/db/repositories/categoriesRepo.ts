import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { categories, mediaCategories, type CategoryRow } from '../schema';

export async function listCategories(): Promise<CategoryRow[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function createCategory(name: string): Promise<void> {
  await db.insert(categories).values({ name, slug: null });
}

export async function seedIfEmpty(seeds: { slug: string; name: string }[]): Promise<void> {
  const existing = await db.select().from(categories);
  if (existing.length > 0) return;
  await db.insert(categories).values(seeds.map((s, i) => ({ ...s, sortOrder: i })));
}

export async function findBySlug(slug: string): Promise<CategoryRow | null> {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug));
  return rows[0] ?? null;
}

export async function categoryIdsForMedia(mediaId: string): Promise<number[]> {
  const rows = await db
    .select({ categoryId: mediaCategories.categoryId })
    .from(mediaCategories)
    .where(eq(mediaCategories.mediaId, mediaId));
  return rows.map((r) => r.categoryId);
}

export async function setMediaCategories(mediaId: string, categoryIds: number[]): Promise<void> {
  await db.delete(mediaCategories).where(eq(mediaCategories.mediaId, mediaId));
  if (categoryIds.length) {
    await db
      .insert(mediaCategories)
      .values(categoryIds.map((categoryId) => ({ mediaId, categoryId })));
  }
}

export async function addMediaCategory(mediaId: string, categoryId: number): Promise<void> {
  await db.insert(mediaCategories).values({ mediaId, categoryId }).onConflictDoNothing();
}
