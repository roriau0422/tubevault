import { AppError, ERROR_CODES, toAppError } from '../errors';

test('AppError carries a code', () => {
  const e = new AppError('NETWORK');
  expect(e.code).toBe('NETWORK');
  expect(e).toBeInstanceOf(Error);
});

test('toAppError passes AppError through unchanged', () => {
  const e = new AppError('URL_EXPIRED');
  expect(toAppError(e)).toBe(e);
});

test('toAppError wraps unknown errors with the fallback code', () => {
  const e = toAppError(new TypeError('boom'), 'DOWNLOAD_FAILED');
  expect(e.code).toBe('DOWNLOAD_FAILED');
  expect(toAppError('x').code).toBe('UNKNOWN');
});

test('ERROR_CODES contains all expected codes', () => {
  expect([...ERROR_CODES].sort()).toEqual(
    ['DOWNLOAD_FAILED', 'MUX_FAILED', 'NETWORK', 'NO_FORMAT', 'RESOLVE_FAILED', 'STORAGE_FULL', 'UNKNOWN', 'URL_EXPIRED'].sort()
  );
});
