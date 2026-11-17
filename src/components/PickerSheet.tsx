import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

const ROW_HEIGHT = 52;

type Props = {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Shows a filter box above the list (used for long lists like Make). */
  searchable?: boolean;
  loading?: boolean;
  /** Small line under the title, e.g. where the list comes from. */
  note?: string | null;
  /** Escape hatch at the bottom: "Not listed? Type it". */
  manualLabel?: string;
  onManual?: () => void;
  /** Shown instead of the list when there are no options. */
  emptyText?: string;
};

/**
 * A list that slides up from the bottom of the screen — scroll and tap,
 * no typing needed. Used for Year, Make and Trim on Add/Edit car.
 * Built on React Native's own Modal + FlatList, so it needs no extra
 * native library and looks the same in Expo Go, a real build and web.
 */
export default function PickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
  loading = false,
  note,
  manualLabel,
  onManual,
  emptyText = 'Nothing to choose from here.',
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  // Open with the current choice in view (e.g. 1998 in a list starting at
  // next year) instead of always at the top.
  const selectedIndex = selected ? filtered.findIndex((o) => o.toLowerCase() === selected.toLowerCase()) : -1;
  const initialIndex = !query && selectedIndex > 3 ? selectedIndex - 3 : 0;

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Close list" onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.closeButton} onPress={close}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          {note ? <Text style={styles.note}>{note}</Text> : null}

          {searchable ? (
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel={`Search ${title.toLowerCase()}`}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.placeholder}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : filtered.length === 0 ? (
            <Text style={styles.empty}>{query ? 'No matches.' : emptyText}</Text>
          ) : (
            <FlatList
              data={filtered as string[]}
              keyExtractor={(item) => item}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = !!selected && item.toLowerCase() === selected.toLowerCase();
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => {
                      setQuery('');
                      onSelect(item);
                    }}
                  >
                    <Text style={[styles.rowText, isSelected && styles.rowTextSelected]} numberOfLines={1}>{item}</Text>
                    {isSelected ? <MaterialCommunityIcons name="check" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          )}

          {onManual ? (
            <Pressable
              accessibilityRole="button"
              style={styles.manualButton}
              onPress={() => {
                setQuery('');
                onManual();
              }}
            >
              <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
              <Text style={styles.manualText}>{manualLabel ?? 'Not listed? Type it'}</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: MIN_TAP },
  title: { flex: 1, fontSize: font.heading, fontWeight: '800', color: colors.ink },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: font.tiny, color: colors.muted, paddingHorizontal: space.lg, marginBottom: space.sm, lineHeight: 17 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    minHeight: MIN_TAP,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.ink, paddingVertical: space.sm },
  loading: { marginVertical: space.xxl },
  empty: { fontSize: font.label, color: colors.muted, textAlign: 'center', marginVertical: space.xxl, paddingHorizontal: space.lg },
  list: { flexGrow: 0, flexShrink: 1 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  rowText: { flex: 1, fontSize: font.body, color: colors.ink },
  rowTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: MIN_TAP + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualText: { color: colors.primary, fontSize: font.label, fontWeight: '700' },
});
