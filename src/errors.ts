export const ERROR_CODES = [
  'RESOLVE_FAILED',
  'NO_FORMAT',
  'DOWNLOAD_FAILED',
  'URL_EXPIRED',
  'MUX_FAILED',
  'STORAGE_FULL',
  'NETWORK',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly cause?: unknown
  ) {
    super(code);
    this.name = 'AppError';
  }
}

export function toAppError(e: unknown, fallback: ErrorCode = 'UNKNOWN'): AppError {
  return e instanceof AppError ? e : new AppError(fallback, e);
}
