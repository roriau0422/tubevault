import {
  MAX_CONCURRENT,
  retryDelayMs,
  isActive,
  canStartNext,
  videoProgress,
  type QueueItem,
} from '../downloadMachine';

const item = (p: Partial<QueueItem>): QueueItem => ({
  videoId: 'x',
  mediaType: 'audio',
  title: 't',
  artist: 'a',
  thumbnailUrl: null,
  phase: 'queued',
  progress: 0,
  attempts: 0,
  ...p,
});

test('retry backoff is 2s/8s/30s then gives up', () => {
  expect(retryDelayMs(1)).toBe(2000);
  expect(retryDelayMs(2)).toBe(8000);
  expect(retryDelayMs(3)).toBe(30000);
  expect(retryDelayMs(4)).toBeNull();
});

test('isActive covers every in-flight phase and nothing else', () => {
  for (const p of ['resolving', 'downloading', 'downloading_video', 'downloading_audio', 'muxing', 'finalizing'] as const) {
    expect(isActive(p)).toBe(true);
  }
  for (const p of ['queued', 'done', 'failed'] as const) {
    expect(isActive(p)).toBe(false);
  }
});

test('canStartNext respects MAX_CONCURRENT=2 and FIFO order', () => {
  expect(MAX_CONCURRENT).toBe(2);
  const items = [
    item({ videoId: 'a', phase: 'downloading' }),
    item({ videoId: 'b', phase: 'queued' }),
    item({ videoId: 'c', phase: 'queued' }),
  ];
  expect(canStartNext(items)?.videoId).toBe('b');
  items[1] = item({ videoId: 'b', phase: 'resolving' });
  expect(canStartNext(items)).toBeUndefined(); // 2 active
  items[0] = item({ videoId: 'a', phase: 'done' });
  expect(canStartNext(items)?.videoId).toBe('c');
});

test('videoProgress weights phases 70/15/15', () => {
  expect(videoProgress('downloading_video', 0.5)).toBeCloseTo(0.35);
  expect(videoProgress('downloading_audio', 0.5)).toBeCloseTo(0.775);
  expect(videoProgress('muxing', 0.5)).toBeCloseTo(0.925);
  expect(videoProgress('finalizing', 0)).toBeCloseTo(1);
  expect(videoProgress('downloading', 0.4)).toBeCloseTo(0.4); // audio items pass through
});
