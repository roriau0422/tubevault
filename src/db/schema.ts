import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(), // videoId
  mediaType: text('media_type', { enum: ['audio', 'video'] }).notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  durationSec: integer('duration_sec').notNull().default(0),
  fileUri: text('file_uri').notNull(),
  artworkUri: text('artwork_uri'),
  mimeType: text('mime_type').notNull(),
  bitrate: integer('bitrate'),
  height: integer('height'), // video only
  sizeBytes: integer('size_bytes').notNull().default(0),
  addedAt: integer('added_at').notNull(),
  playCount: integer('play_count').notNull().default(0),
  lastPlayedAt: integer('last_played_at'),
});

export const downloads = sqliteTable('downloads', {
  videoId: text('video_id').primaryKey(),
  mediaType: text('media_type', { enum: ['audio', 'video'] }).notNull(),
  status: text('status').notNull(),
  progress: integer('progress').notNull().default(0), // 0–100
  error: text('error'),
  updatedAt: integer('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug'), // set for seeded defaults, null for user-created
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const mediaCategories = sqliteTable(
  'media_categories',
  {
    mediaId: text('media_id').notNull(),
    categoryId: integer('category_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.categoryId] })]
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type MediaRow = typeof media.$inferSelect;
export type NewMediaRow = typeof media.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
