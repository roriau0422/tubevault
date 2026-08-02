import { FFmpegKit, ReturnCode } from '@nikhil-cephei/ffmpeg-kit-react-native';
import { AppError } from '../errors';

function stripScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

export async function muxCopy(videoUri: string, audioUri: string, outUri: string): Promise<void> {
  const cmd = `-y -i "${stripScheme(videoUri)}" -i "${stripScheme(audioUri)}" -c copy -movflags +faststart "${stripScheme(outUri)}"`;
  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) {
    throw new AppError('MUX_FAILED');
  }
}

export async function remuxCopy(inUri: string, outUri: string): Promise<void> {
  // -movflags is mp4-family only; the opus fallback remuxes webm → ogg.
  const faststart = /\.(m4a|mp4|mov)$/i.test(outUri) ? ' -movflags +faststart' : '';
  const cmd = `-y -i "${stripScheme(inUri)}" -c copy${faststart} "${stripScheme(outUri)}"`;
  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) {
    throw new AppError('MUX_FAILED');
  }
}
