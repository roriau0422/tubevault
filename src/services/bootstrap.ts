import * as FileSystem from 'expo-file-system/legacy';
import i18n from 'i18next';
import * as categoriesRepo from '../db/repositories/categoriesRepo';
import * as mediaRepo from '../db/repositories/mediaRepo';
import * as settingsRepo from '../db/repositories/settingsRepo';
import { remuxCopy } from './mux';

export const MEDIA_DIRS = {
  audio: `${FileSystem.documentDirectory}audio/`,
  video: `${FileSystem.documentDirectory}video/`,
  artwork: `${FileSystem.documentDirectory}artwork/`,
} as const;

export const TMP_DIR = `${FileSystem.cacheDirectory}tmp/`;

const SEED_SLUGS = [
  'rnb',
  'pop',
  'hiphop',
  'rock',
  'edm',
  'classical',
  'country',
  'educational',
  'podcasts',
  'other',
] as const;

export async function bootstrapApp(): Promise<void> {
  for (const dir of [...Object.values(MEDIA_DIRS), TMP_DIR]) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  }
  // Seed category names come from the ACTIVE catalog once they are user data afterwards.
  await categoriesRepo.seedIfEmpty(
    SEED_SLUGS.map((slug) => ({ slug, name: i18n.t(`categories.seeds.${slug}`) }))
  );
  await reconcileLibrary();
  await fixupDashAudio();
}

async function fixupDashAudio(): Promise<void> {
  if ((await settingsRepo.getSetting('dashAudioFixupDone')) === '1') return;
  const rows = await mediaRepo.listMedia({ mediaType: 'audio' });
  for (const row of rows) {
    const fixedUri = row.fileUri.replace(/(\.[^.]+)$/, '.fixed$1');
    try {
      await remuxCopy(row.fileUri, fixedUri);
      await FileSystem.deleteAsync(row.fileUri, { idempotent: true });
      await FileSystem.moveAsync({ from: fixedUri, to: row.fileUri });
    } catch {
      // Leave the original playable file alone
      await FileSystem.deleteAsync(fixedUri, { idempotent: true }).catch(() => {});
    }
  }
  await settingsRepo.setSetting('dashAudioFixupDone', '1');
}

async function reconcileLibrary(): Promise<void> {
  const onDisk = new Set<string>();
  for (const dir of [MEDIA_DIRS.audio, MEDIA_DIRS.video]) {
    const names = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
    for (const n of names) onDisk.add(dir + n);
  }
  const rows = await mediaRepo.allFileUris();
  const inDb = new Set(rows.map((r) => r.fileUri));
  for (const row of rows) {
    if (!onDisk.has(row.fileUri)) await mediaRepo.deleteMedia(row.id);
  }
  for (const uri of onDisk) {
    if (!inDb.has(uri)) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
