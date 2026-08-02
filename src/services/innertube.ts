import { toAppError, AppError } from '../errors';
import { latinToCyrillic, isRomanised } from '../translit';
import type { AdaptiveFormat } from './formatPolicy';

const ANDROID_VR_CLIENT = {
  clientName: 'ANDROID_VR',
  clientVersion: '1.65.10',
  deviceMake: 'Oculus',
  deviceModel: 'Quest 3',
  androidSdkVersion: 32,
  userAgent:
    'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
  osName: 'Android',
  osVersion: '12L',
  hl: 'en',
  timeZone: 'UTC',
  utcOffsetMinutes: 0,
} as const;

const CLIENT_NAME_ID = '28';
const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// googlevideo media requests want the issuing client's User-Agent.
export const ANDROID_VR_USER_AGENT = ANDROID_VR_CLIENT.userAgent;
export const STREAM_HEADERS: Record<string, string> = {
  'User-Agent': ANDROID_VR_USER_AGENT,
};

// --- visitor_data (session identity) ---

let visitorDataCache: string | null = null;

// Scrape a genuine visitor_data off the homepage. Cached; call resetVisitorData()
// to force a refresh when a request comes back bot-challenged.
async function getVisitorData(): Promise<string> {
  if (visitorDataCache) return visitorDataCache;
  let html: string;
  try {
    const res = await fetch('https://www.youtube.com/', { headers: { 'User-Agent': DESKTOP_UA } });
    html = await res.text();
  } catch (e) {
    throw toAppError(e, 'NETWORK');
  }
  const m = html.match(/"visitorData":"([^"]+)"/);
  if (!m) throw new AppError('RESOLVE_FAILED', 'could not obtain visitor_data');
  visitorDataCache = decodeURIComponent(m[1]);
  return visitorDataCache;
}

function resetVisitorData(): void {
  visitorDataCache = null;
}

// --- InnerTube calls ---
async function innertubeCall(endpoint: 'player' | 'search', extra: Record<string, unknown>): Promise<any> {
  const visitorData = await getVisitorData();
  const body = { context: { client: { ...ANDROID_VR_CLIENT, visitorData } }, ...extra };
  let res: Response;
  try {
    res = await fetch(`${INNERTUBE_BASE}/${endpoint}?prettyPrint=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ANDROID_VR_CLIENT.userAgent,
        'X-YouTube-Client-Name': CLIENT_NAME_ID,
        'X-YouTube-Client-Version': ANDROID_VR_CLIENT.clientVersion,
        Origin: 'https://www.youtube.com',
        'X-Goog-Visitor-Id': visitorData,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw toAppError(e, 'NETWORK');
  }
  if (!res.ok) throw new AppError('NETWORK', `innertube ${endpoint} HTTP ${res.status}`);
  return res.json();
}

// Refresh it once and retry before giving up.
async function callPlayer(videoId: string): Promise<any> {
  let pr = await innertubeCall('player', { videoId });
  if (pr?.playabilityStatus?.status === 'LOGIN_REQUIRED') {
    resetVisitorData();
    pr = await innertubeCall('player', { videoId });
  }
  return pr;
}

// --- parsing helpers ---

function firstRunText(node: any): string {
  return String(node?.runs?.[0]?.text ?? node?.simpleText ?? '');
}

function parseDuration(text: string): number {
  const parts = text.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function bestThumbnail(thumbnails: any[] | undefined): string | null {
  if (!thumbnails?.length) return null;
  return thumbnails[thumbnails.length - 1]?.url ?? null;
}

function mapAdaptiveFormat(f: any): AdaptiveFormat {
  const mime = String(f.mimeType ?? '');
  return {
    mime_type: mime,
    bitrate: Number(f.bitrate ?? 0),
    has_audio: mime.startsWith('audio/'),
    has_video: mime.startsWith('video/'),
    height: f.height ? Number(f.height) : undefined,
    content_length: f.contentLength ? Number(f.contentLength) : undefined,
    url: f.url ? String(f.url) : undefined,
  };
}

// Recursively collect every compactVideoRenderer in the (deeply nested) search resdponse.
function collectRenderers(node: any, key: string, out: any[]): void {
  if (!node || typeof node !== 'object') return;
  if (node[key]) out.push(node[key]);
  for (const k in node) {
    const v = node[k];
    if (v && typeof v === 'object') collectRenderers(v, key, out);
  }
}

// --- public API ---

export interface SearchResult {
  videoId: string;
  title: string;
  author: string;
  durationSec: number;
  thumbnailUrl: string | null;
}

export interface ResolvedVideo {
  videoId: string;
  title: string;
  author: string;
  durationSec: number;
  thumbnailUrl: string | null;
  category: string | null;
  adaptiveFormats: AdaptiveFormat[];
}

export async function searchVideos(query: string): Promise<SearchResult[]> {
  const results = await runSearch(query);
  if (results.length > 0 || !isRomanised(query)) return results;
  const cyrillic = latinToCyrillic(query);
  if (cyrillic === query.toLowerCase()) return results; // nothing to transliterate
  return runSearch(cyrillic);
}

async function runSearch(query: string): Promise<SearchResult[]> {
  let data: any;
  try {
    data = await innertubeCall('search', { query });
  } catch (e) {
    throw toAppError(e, 'NETWORK');
  }
  const renderers: any[] = [];
  collectRenderers(data?.contents, 'compactVideoRenderer', renderers);
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const v of renderers) {
    const videoId = String(v.videoId ?? '');
    const title = firstRunText(v.title);
    if (!videoId || !title || seen.has(videoId)) continue;
    seen.add(videoId);
    results.push({
      videoId,
      title,
      author: firstRunText(v.longBylineText) || firstRunText(v.shortBylineText),
      durationSec: parseDuration(firstRunText(v.lengthText)),
      thumbnailUrl: bestThumbnail(v.thumbnail?.thumbnails),
    });
  }
  return results;
}

export async function suggestQueries(
  query: string,
  hl: string,
  signal?: AbortSignal
): Promise<string[]> {
  const url =
    'https://suggestqueries-clients6.youtube.com/complete/search' +
    `?client=firefox&ds=yt&hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  const body: unknown = await res.json();
  const list = Array.isArray(body) ? body[1] : null;
  return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
}

export async function resolveVideo(videoId: string): Promise<ResolvedVideo> {
  let pr: any;
  try {
    pr = await callPlayer(videoId);
  } catch (e) {
    throw toAppError(e, 'RESOLVE_FAILED');
  }
  const status = pr?.playabilityStatus?.status;
  if (status && status !== 'OK') {
    throw new AppError('RESOLVE_FAILED', `not playable: ${status} ${pr?.playabilityStatus?.reason ?? ''}`.trim());
  }
  const d = pr?.videoDetails ?? {};
  const formats = (pr?.streamingData?.adaptiveFormats ?? []).map(mapAdaptiveFormat);
  return {
    videoId,
    title: String(d.title ?? videoId),
    author: String(d.author ?? ''),
    durationSec: Number(d.lengthSeconds ?? 0),
    thumbnailUrl: bestThumbnail(d.thumbnail?.thumbnails),
    category: pr?.microformat?.playerMicroformatRenderer?.category ?? null,
    adaptiveFormats: formats,
  };
}
