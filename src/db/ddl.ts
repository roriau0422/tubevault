import { sqlite } from './client';

export function runMigrations(): void {
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      media_type TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      file_uri TEXT NOT NULL,
      artwork_uri TEXT,
      mime_type TEXT NOT NULL,
      bitrate INTEGER,
      height INTEGER,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      play_count INTEGER NOT NULL DEFAULT 0,
      last_played_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS downloads (
      video_id TEXT PRIMARY KEY,
      media_type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS media_categories (
      media_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (media_id, category_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
