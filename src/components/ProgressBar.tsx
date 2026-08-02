import { useEffect, useState } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

/** 6px accent progress bar; a shimmer sweeps the filled part while active. */
export function ProgressBar({ progress, active = false }: { progress: number; active?: boolean }) {
  const th = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const [fillWidth, setFillWidth] = useState(0);
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active || fillWidth <= 0) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, fillWidth, sweep]);

  const shimmerWidth = fillWidth * 0.4;
  return (
    <View style={[styles.track, { backgroundColor: th.progressTrack }]}>
      <View
        style={[styles.fill, { width: `${pct}%`, backgroundColor: th.accent }]}
        onLayout={(e) => setFillWidth(e.nativeEvent.layout.width)}
      >
        {active && fillWidth > 0 ? (
          <Animated.View
            style={[
              styles.shimmer,
              {
                width: shimmerWidth,
                transform: [
                  {
                    translateX: sweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-shimmerWidth, fillWidth + shimmerWidth],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.35)' },
});
