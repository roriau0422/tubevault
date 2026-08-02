// Romanised Mongolian -> Cyrillic.
//
// YouTube's InnerTube search matches literally for the ANDROID_VR client we use
// (the logged-in web client silently expands romanised queries; ours does not).
// Mongolian titles are written in Cyrillic, so "javkhlan duunuud" matches
// nothing while "жавхлан дуунууд" returns a full page.
//
// ponytail: deliberately a lookup table, not a real romanisation standard.
// It only has to get close enough for YouTube's own fuzzy matching to take
// over, and it is used solely as a fallback after a literal search came back
// empty — so an imperfect guess can never displace a working result.
const PAIRS: readonly (readonly [string, string])[] = [
  // Digraphs first; every multi-letter key must precede its own prefix.
  ['ye', 'е'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['ts', 'ц'],
  ['kh', 'х'],
  ['zh', 'ж'],
  // Doubled vowels are long vowels, not two syllables.
  ['ee', 'ээ'],
  ['oo', 'оо'],
  ['uu', 'уу'],
  // A trailing/medial -i after a vowel is й, not и.
  ['ii', 'ий'],
  ['ai', 'ай'],
  ['ei', 'эй'],
  ['oi', 'ой'],
  ['ui', 'уй'],
  ['a', 'а'],
  ['b', 'б'],
  ['v', 'в'],
  ['g', 'г'],
  ['d', 'д'],
  ['e', 'э'],
  ['z', 'з'],
  ['i', 'и'],
  ['j', 'ж'],
  ['k', 'к'],
  ['l', 'л'],
  ['m', 'м'],
  ['n', 'н'],
  ['o', 'о'],
  ['p', 'п'],
  ['r', 'р'],
  ['s', 'с'],
  ['t', 'т'],
  ['u', 'у'],
  ['f', 'ф'],
  ['h', 'х'],
  ['c', 'ц'],
  ['y', 'й'],
  ['w', 'в'],
  ['q', 'к'],
  ['x', 'х'],
];

/** Best-effort transliteration; anything unmatched (digits, spaces) passes through. */
export function latinToCyrillic(input: string): string {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;
  outer: while (i < s.length) {
    for (const [latin, cyrillic] of PAIRS) {
      if (s.startsWith(latin, i)) {
        out += cyrillic;
        i += latin.length;
        continue outer;
      }
    }
    out += s[i];
    i += 1;
  }
  return out;
}

/** True when a query is plain ASCII, i.e. worth trying to transliterate. */
export function isRomanised(query: string): boolean {
  return /^[\x20-\x7E]+$/.test(query);
}
