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
  const categoriesRepo = await import('../db/repositories/categoriesRepo');
  const cat = await categoriesRepo.findBySlug(slug);
  if (cat) await categoriesRepo.addMediaCategory(videoId, cat.id);
}
