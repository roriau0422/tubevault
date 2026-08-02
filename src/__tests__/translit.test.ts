import { latinToCyrillic, isRomanised } from '../translit';

describe('latinToCyrillic', () => {
  it.each([
    ['javkhlan duunuud', 'жавхлан дуунууд'],
    ['javkhlan eej', 'жавхлан ээж'],
    ['javkhlan minii naiz', 'жавхлан миний найз'],
    ['javkhlan uvs nuur', 'жавхлан увс нуур'],
    ['javkhlan bayasgalan', 'жавхлан баясгалан'],
  ])('%s -> %s', (latin, cyrillic) => {
    expect(latinToCyrillic(latin)).toBe(cyrillic);
  });

  it('prefers digraphs over their prefixes', () => {
    expect(latinToCyrillic('ch')).toBe('ч');
    expect(latinToCyrillic('kh')).toBe('х');
    expect(latinToCyrillic('sh')).toBe('ш');
    expect(latinToCyrillic('ts')).toBe('ц');
  });

  it('is case insensitive and passes unmapped characters through', () => {
    expect(latinToCyrillic('Javkhlan 2024')).toBe('жавхлан 2024');
  });
});

describe('isRomanised', () => {
  it('accepts plain ASCII and rejects Cyrillic', () => {
    expect(isRomanised('javkhlan duunuud')).toBe(true);
    expect(isRomanised('жавхлан')).toBe(false);
    expect(isRomanised('javkhlan жавхлан')).toBe(false);
  });
});
