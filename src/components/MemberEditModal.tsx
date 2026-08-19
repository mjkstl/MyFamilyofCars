import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Member } from '@/types/database';

export default function MemberEditModal({
  member,
  onClose,
  onSave,
  saving,
}: {
  member: Member | null;
  onClose: () => void;
  onSave: (displayName: string, avatarUri: string | null) => void;
  saving: boolean;
}) {
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(member?.display_name ?? '');
    setAvatarUri(member?.avatar_url ?? null);
  }, [member]);

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit family member</Text>
          <Pressable style={styles.avatarPicker} onPress={() => void choosePhoto()}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>Add photo</Text>}
          </Pressable>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Name" />
          <Pressable
            style={styles.saveButton}
            disabled={saving || !displayName.trim()}
            onPress={() => onSave(displayName.trim(), avatarUri)}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save member</Text>}
          </Pressable>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.48)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  avatarPicker: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#CCFBF1', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  avatar: { width: '100%', height: '100%' },
  avatarText: { color: '#0F766E', fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 13, fontSize: 16 },
  saveButton: { backgroundColor: '#0F766E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  saveText: { color: '#fff', fontWeight: '700' },
  cancel: { color: '#64748B', textAlign: 'center', marginTop: 14 },
});
