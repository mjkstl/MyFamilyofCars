import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

/**
 * A two-button confirmation dialog that works on web AND native.
 *
 * Use this instead of Alert.alert(title, body, [cancel, confirm]):
 * a multi-button Alert is a silent no-op on React Native Web — the
 * button looks broken because nothing renders at all.
 */
export default function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={[styles.button, styles.cancel]} onPress={onCancel} disabled={busy}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, destructive ? styles.confirmDanger : styles.confirm]}
              onPress={onConfirm}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.confirmText}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, width: '100%', maxWidth: 380 },
  title: { fontSize: font.heading, fontWeight: '800', color: colors.ink, marginBottom: space.sm },
  body: { fontSize: font.label, color: colors.text, lineHeight: 20 },
  error: { fontSize: font.small, color: colors.danger, marginTop: space.md },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  button: { flex: 1, minHeight: MIN_TAP, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  cancel: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  cancelText: { color: colors.text, fontWeight: '600', fontSize: font.label },
  confirm: { backgroundColor: colors.primary },
  confirmDanger: { backgroundColor: colors.danger },
  confirmText: { color: colors.white, fontWeight: '700', fontSize: font.label },
});
