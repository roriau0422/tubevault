const PAIRS: readonly (readonly [string, string])[] = [
  ['ye', 'е'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['ts', 'ц'],
  ['kh', 'х'],
  ['ee', 'ээ'],
  ['oo', 'оо'],
  ['uu', 'уу'],
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

export function isRomanised(query: string): boolean {
  return /^[\x20-\x7E]+$/.test(query);
}
