import { useEffect, useState } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';

const BAR_COUNT = 4;
const BAR_HEIGHT = 15;

/** Animated equalizer bars shown next to the now-playing item. */
export function EqBars({ color, animated = true }: { color: string; animated?: boolean }) {
  const [values] = useState(() =>
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.4))
  );

  useEffect(() => {
    if (!animated) return;
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 110),
          Animated.timing(v, {
            toValue: 1,
            duration: 700 + i * 130,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.25,
            duration: 700 + i * 130,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animated, values]);

  return (
    <View style={styles.wrap}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: color },
            animated
              ? {
                  transform: [
                    // Anchor scaling to the bottom edge.
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [BAR_HEIGHT / 2, 0] }) },
                    { scaleY: v },
                  ],
                }
              : {
                  transform: [
                    { translateY: (BAR_HEIGHT / 2) * (1 - [0.5, 0.9, 0.4, 0.7][i]) },
                    { scaleY: [0.5, 0.9, 0.4, 0.7][i] },
                  ],
                },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 2.5, alignItems: 'flex-end', height: BAR_HEIGHT },
  bar: { width: 3, height: BAR_HEIGHT, borderRadius: 1.5 },
});
