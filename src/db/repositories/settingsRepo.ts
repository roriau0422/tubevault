import { eq } from 'drizzle-orm';
import { db, sqlite } from '../client';
import { settings } from '../schema';
import type { Language } from '../../i18n';

// Sync read used in index.js BEFORE React renders (i18n needs the language).
export function getLanguageSync(): Language {
  try {
    const row = sqlite.getFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'language'
    );
    return row?.value === 'en' ? 'en' : 'mn';
  } catch {
    return 'mn';
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
