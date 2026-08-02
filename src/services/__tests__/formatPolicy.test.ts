import { pickAudioFormat, pickVideoFormats, type AdaptiveFormat } from '../formatPolicy';

const f = (p: Partial<AdaptiveFormat>): AdaptiveFormat => ({
  mime_type: 'audio/mp4; codecs="mp4a.40.2"',
  bitrate: 128000,
  has_audio: true,
  has_video: false,
  ...p,
});

describe('pickAudioFormat', () => {
  test('prefers aac over higher-bitrate opus (iOS cannot decode opus)', () => {
    const formats = [
      f({ mime_type: 'audio/webm; codecs="opus"', bitrate: 192000 }),
      f({ mime_type: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 130000 }),
    ];
    const picked = pickAudioFormat(formats)!;
    expect(picked.ext).toBe('m4a');
  });

  test('takes highest-bitrate aac', () => {
    const formats = [f({ bitrate: 96000 }), f({ bitrate: 192000 })];
    const picked = pickAudioFormat(formats)!;
    expect(picked.format.bitrate).toBe(192000);
    expect(picked.ext).toBe('m4a');
  });

  test('falls back to opus when no aac exists', () => {
    const formats = [f({ mime_type: 'audio/webm; codecs="opus"', bitrate: 130000 })];
    const picked = pickAudioFormat(formats)!;
    expect(picked.ext).toBe('opus');
  });

  test('ignores video and muxed formats', () => {
    const formats = [
      f({ has_video: true, has_audio: true, mime_type: 'video/mp4; codecs="avc1, mp4a"' }),
      f({ has_video: true, has_audio: false, mime_type: 'video/mp4; codecs="avc1"' }),
    ];
    expect(pickAudioFormat(formats)).toBeNull();
  });
});

describe('pickVideoFormats', () => {
  const v = (p: Partial<AdaptiveFormat>): AdaptiveFormat => ({
    mime_type: 'video/mp4; codecs="avc1.640028"',
    bitrate: 2_000_000,
    has_audio: false,
    has_video: true,
    height: 720,
    ...p,
  });

  test('caps at 1080p and picks highest height then bitrate', () => {
    const formats = [
      v({ height: 2160, mime_type: 'video/mp4; codecs="av01.0"' }),
      v({ height: 1440 }),
      v({ height: 1080, bitrate: 3_000_000 }),
      v({ height: 1080, bitrate: 4_000_000 }),
      v({ height: 720 }),
      f({ mime_type: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000 }),
    ];
    const picked = pickVideoFormats(formats)!;
    expect(picked.video.height).toBe(1080);
    expect(picked.video.bitrate).toBe(4_000_000);
  });

  test('h264 only — vp9/av1 are rejected even below 1080p', () => {
    const formats = [
      v({ height: 1080, mime_type: 'video/webm; codecs="vp9"' }),
      v({ height: 480 }),
      f({}),
    ];
    expect(pickVideoFormats(formats)!.video.height).toBe(480);
  });

  test('audio pair is highest-bitrate aac, never opus', () => {
    const formats = [
      v({}),
      f({ mime_type: 'audio/webm; codecs="opus"', bitrate: 160000 }),
      f({ bitrate: 128000 }),
      f({ bitrate: 44000 }),
    ];
    expect(pickVideoFormats(formats)!.audio.bitrate).toBe(128000);
  });

  test('returns null when either half is missing', () => {
    expect(pickVideoFormats([f({})])).toBeNull();
    expect(pickVideoFormats([v({})])).toBeNull();
  });
});
