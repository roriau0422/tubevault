import { seedSlugForYouTubeCategory } from '../autotag';

test('maps YouTube categories to seed slugs (music-vs-educational split, arch doc §4.7)', () => {
  expect(seedSlugForYouTubeCategory('Education')).toBe('educational');
  expect(seedSlugForYouTubeCategory('Science & Technology')).toBe('educational');
  expect(seedSlugForYouTubeCategory('Howto & Style')).toBe('educational');
  expect(seedSlugForYouTubeCategory('Music')).toBeNull(); // genre is the user's call
  expect(seedSlugForYouTubeCategory('Entertainment')).toBeNull();
  expect(seedSlugForYouTubeCategory(null)).toBeNull();
});
