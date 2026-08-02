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
        iOS blurs what is behind the view natively.
      */}
      <BlurView intensity={64} tint={th.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
    </>
  );
}
