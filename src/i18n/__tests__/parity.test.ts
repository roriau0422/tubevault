import mn from '../locales/mn.json';
import en from '../locales/en.json';
import { ERROR_CODES } from '../../errors';

function flatKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

test('mn and en catalogs have identical key sets', () => {
  expect(flatKeys(en).sort()).toEqual(flatKeys(mn).sort());
});

test('every ErrorCode has an errors.* entry in both catalogs', () => {
  for (const code of ERROR_CODES) {
    expect((mn.errors as Record<string, string>)[code]).toBeTruthy();
    expect((en.errors as Record<string, string>)[code]).toBeTruthy();
  }
});

test('no empty strings in catalogs', () => {
  const check = (obj: object) => {
    for (const v of Object.values(obj)) {
      if (typeof v === 'object' && v !== null) check(v);
      else expect(String(v).trim()).not.toBe('');
    }
  };
  check(mn);
  check(en);
});
