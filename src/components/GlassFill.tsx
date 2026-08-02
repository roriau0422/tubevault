import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme';

/**
 * The design's `backdrop-filter: blur(24px)` + translucent tint, as an
 * absolutely-positioned fill. The parent supplies the shape and clips it.
 */
export function GlassFill({ tint }: { tint: string }) {
  const th = useTheme();
  return (
    <>
      {/*
        iOS blurs what is behind the view natively. Android draws the tint only:
        every blurMethod in expo-blur 57 requires a `blurTarget` ref to a
        BlurTargetView wrapping the content to blur, and warns then falls back to
        no blur without one. The tab bar and the scenes are siblings in the
        navigator, so there is no single subtree to wrap.
        ponytail: tint-only on Android. The design's tint is 0.82-0.85 alpha, so
        the blur is barely visible anyway; wrap the scenes in a BlurTargetView and
        thread its ref here through context if it ever needs to be exact.
      */}
      <BlurView intensity={64} tint={th.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
    </>
  );
}
