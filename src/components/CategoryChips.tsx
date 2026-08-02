import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import type { CategoryRow } from '../db/schema';

export function CategoryChips(props: {
  cats: CategoryRow[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: th.accent }
          : { backgroundColor: th.chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor: th.chipBorder },
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : { color: th.text }]}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {chip(t('library.all'), props.activeId === null, () => props.onSelect(null), 'all')}
      {props.cats.map((c) =>
        chip(c.name, props.activeId === c.id, () => props.onSelect(c.id), String(c.id))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 12, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  label: { fontSize: 13 },
  labelActive: { color: '#fff', fontWeight: '600' },
});
