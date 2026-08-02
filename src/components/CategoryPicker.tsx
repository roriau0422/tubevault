import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as categoriesRepo from '../db/repositories/categoriesRepo';
import { useTheme } from '../theme';
import type { CategoryRow } from '../db/schema';

export function CategoryPicker(props: {
  /** Persist selection for this media on save. Pass null with onSave for pre-download picks. */
  mediaId: string | null;
  visible: boolean;
  onClose: () => void;
  /** When set, save hands the chosen ids to the caller instead of writing the DB. */
  onSave?: (categoryIds: number[]) => void;
  /** Optional heading override (defaults to the categories title). */
  title?: string;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!props.visible) return;
    void Promise.all([
      categoriesRepo.listCategories(),
      props.mediaId ? categoriesRepo.categoryIdsForMedia(props.mediaId) : Promise.resolve([]),
    ]).then(([all, ids]) => {
      setCats(all);
      setSelected(new Set(ids));
    });
  }, [props.visible, props.mediaId]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    if (props.onSave) {
      props.onSave([...selected]);
    } else if (props.mediaId) {
      await categoriesRepo.setMediaCategories(props.mediaId, [...selected]);
    }
    props.onClose();
  };

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: th.dark ? th.elevated : th.card, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Text style={[styles.heading, { color: th.textBright }]}>
            {props.title ?? t('categories.title')}
          </Text>
          <View style={styles.chips}>
            {cats.map((c) => {
              const active = selected.has(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: th.accent }
                      : {
                          backgroundColor: th.fill,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: th.chipBorder,
                        },
                  ]}
                >
                  <Text style={[styles.label, active ? styles.labelActive : { color: th.text }]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={props.onClose} hitSlop={8}>
              <Text style={[styles.cancel, { color: th.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={() => void save()} hitSlop={8}>
              <Text style={[styles.save, { color: th.accentText }]}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 16,
  },
  heading: { fontSize: 17, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  label: { fontSize: 13 },
  labelActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, paddingBottom: 12 },
  cancel: { fontWeight: '600' },
  save: { fontWeight: '700' },
});
