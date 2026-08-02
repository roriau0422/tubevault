// Tier-2 auto-tagging (arch doc §4.7): YouTube's own category is reliable for the
// music-vs-educational split; genre within music stays manual.
const CATEGORY_TO_SLUG: Record<string, string> = {
  Education: 'educational',
  'Science & Technology': 'educational',
  'Howto & Style': 'educational',
};

export function seedSlugForYouTubeCategory(category: string | null): string | null {
  return category ? (CATEGORY_TO_SLUG[category] ?? null) : null;
}

export async function applyAutoTag(videoId: string, category: string | null): Promise<void> {
  const slug = seedSlugForYouTubeCategory(category);
  if (!slug) return;
  // Lazy import keeps this module loadable in jest (expo-sqlite is native-only);
  // the pure mapping above is what the unit test exercises.
  const categoriesRepo = await import('../db/repositories/categoriesRepo');
  const cat = await categoriesRepo.findBySlug(slug);
  if (cat) await categoriesRepo.addMediaCategory(videoId, cat.id);
}
