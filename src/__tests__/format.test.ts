import { formatBytes } from '../format';

describe('formatBytes', () => {
  it('picks the unit by magnitude', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(940_000)).toBe('940 KB');
    expect(formatBytes(1_000_000)).toBe('1 MB');
    expect(formatBytes(186_000_000)).toBe('186 MB');
    expect(formatBytes(1_200_000_000)).toBe('1.2 GB');
  });

  it('never renders a negative size', () => {
    expect(formatBytes(-1)).toBe('0 KB');
  });
});
