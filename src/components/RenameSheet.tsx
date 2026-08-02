import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import type { MediaRow } from '../db/schema';

/** Bottom sheet for editing a media item's display title and artist. */
export function RenameSheet(props: {
  item: MediaRow | null;
  visible: boolean;
  onClose: () => void;
  onSave: (fields: { title: string; artist: string }) => void;
}) {
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTouch} onPress={props.onClose} />
        {props.item ? (
          // Keyed by item so the fields re-initialize for each media row.
          <RenameForm
            key={props.item.id}
            item={props.item}
            onClose={props.onClose}
            onSave={props.onSave}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RenameForm(props: {
  item: MediaRow;
  onClose: () => void;
  onSave: (fields: { title: string; artist: string }) => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(props.item.title);
  const [artist, setArtist] = useState(props.item.artist);

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return; // a title is required; artist may be empty
    props.onSave({ title: trimmed, artist: artist.trim() });
    props.onClose();
  };

  const inputStyle = [styles.input, { backgroundColor: th.fill, color: th.text }];

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: th.dark ? th.elevated : th.card, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Text style={[styles.heading, { color: th.textBright }]}>{t('library.rename')}</Text>
      <Text style={[styles.label, { color: th.textTertiary }]}>{t('library.renameName')}</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        autoFocus
        autoCorrect={false}
      />
      <Text style={[styles.label, { color: th.textTertiary }]}>{t('library.renameArtist')}</Text>
      <TextInput
        style={inputStyle}
        value={artist}
        onChangeText={setArtist}
        autoCorrect={false}
        onSubmitEditing={save}
        returnKeyType="done"
      />
      <View style={styles.actions}>
        <Pressable onPress={props.onClose} hitSlop={8}>
          <Text style={[styles.cancel, { color: th.textSecondary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable onPress={save} hitSlop={8}>
          <Text style={[styles.save, { color: title.trim() ? th.accentText : th.textTertiary }]}>
            {t('common.save')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 8,
  },
  heading: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 6,
  },
  input: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 14 },
  cancel: { fontWeight: '600' },
  save: { fontWeight: '700' },
});
