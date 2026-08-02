export interface AdaptiveFormat {
  mime_type: string;
  bitrate: number;
  has_audio: boolean;
  has_video: boolean;
  height?: number;
  content_length?: number;
  url?: string;
}

export function pickAudioFormat(
  formats: AdaptiveFormat[]
): { format: AdaptiveFormat; ext: 'opus' | 'm4a' } | null {
  const audioOnly = formats
    .filter((f) => f.has_audio && !f.has_video)
    .sort((a, b) => b.bitrate - a.bitrate);
  const aac = audioOnly.find((f) => f.mime_type.includes('mp4a'));
  if (aac) return { format: aac, ext: 'm4a' };
  const opus = audioOnly.find((f) => f.mime_type.includes('opus'));
  return opus ? { format: opus, ext: 'opus' } : null;
}

export function pickVideoFormats(
  formats: AdaptiveFormat[]
): { video: AdaptiveFormat; audio: AdaptiveFormat } | null {
  const video = formats
    .filter((f) => f.has_video && !f.has_audio)
    .filter((f) => f.mime_type.includes('avc1'))
    .filter((f) => (f.height ?? 0) <= 1080)
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || b.bitrate - a.bitrate)[0];
  const audio = formats
    .filter((f) => f.has_audio && !f.has_video)
    .filter((f) => f.mime_type.includes('mp4a'))
    .sort((a, b) => b.bitrate - a.bitrate)[0];
  return video && audio ? { video, audio } : null;
}
