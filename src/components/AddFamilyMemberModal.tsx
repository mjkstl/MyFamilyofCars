import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddFamilyMemberModal({
  visible,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (displayName: string, relationship: string) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState('');

  const close = () => {
    setDisplayName('');
    setRelationship('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Add family member</Text>
          <TextInput accessibilityLabel="Family member name" style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Name" />
          <TextInput accessibilityLabel="Relationship to family member" style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="Relationship (optional)" />
          <Pressable disabled={saving || !displayName.trim()} style={styles.save} onPress={() => onSave(displayName.trim(), relationship.trim())}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Add member</Text>}
          </Pressable>
          <Pressable onPress={close}><Text style={styles.cancel}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontSize: 21, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, marginTop: 10, fontSize: 16 },
  save: { backgroundColor: '#0F766E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  saveText: { color: '#fff', fontWeight: '800' },
  cancel: { textAlign: 'center', color: '#64748B', marginTop: 14 },
});
