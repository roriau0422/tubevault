import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme';

export function MediaRow(props: {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
  /** wide 96×54 (search results), square 52×52 (library). Default wide. */
  thumbShape?: 'wide' | 'square';
  /** Small overlay label on the thumbnail (like: duration "3:42"). */
  thumbBadge?: string;
  /** Now playing highlight: tinted background, accent title, no separator. */
  active?: boolean;
}) {
  const th = useTheme();
  const square = props.thumbShape === 'square';
  const thumbStyle = [
    square ? styles.thumbSquare : styles.thumbWide,
    { backgroundColor: th.thumbPlaceholder },
  ];
  return (
    <Pressable
      style={[
        styles.row,
        props.active
          ? [styles.rowActive, { backgroundColor: th.accentTintSoft }]
          : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: th.separator },
      ]}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
    >
      <View style={thumbStyle}>
        {props.imageUrl ? <Image source={{ uri: props.imageUrl }} style={styles.thumbImg} /> : null}
        {props.thumbBadge ? (
          <View style={styles.thumbBadge}>
            <Text style={styles.thumbBadgeLabel}>{props.thumbBadge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text
          numberOfLines={square ? 1 : 2}
          style={[styles.title, { color: props.active ? th.accentNowPlaying : th.text }]}
        >
          {props.title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: th.textSecondary }]}>
          {props.subtitle}
        </Text>
      </View>
      {props.right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  rowActive: { borderRadius: 14, paddingHorizontal: 10, marginHorizontal: -10 },
  thumbWide: { width: 96, height: 54, borderRadius: 10, overflow: 'hidden' },
  thumbSquare: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  thumbBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  thumbBadgeLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  meta: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600', fontSize: 15, lineHeight: 20 },
  subtitle: { fontSize: 13, marginTop: 2 },
});
