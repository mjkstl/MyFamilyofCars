import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, SafeAreaView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import FamilyPoster from '@/components/FamilyPoster';
import type { TreeStackParamList } from '@/navigation/RootNavigator';
import AppLogoHeader from '@/components/AppLogoHeader';
import MemberEditModal from '@/components/MemberEditModal';
import type { Member } from '@/types/database';

type Nav = NativeStackNavigationProp<TreeStackParamList, 'TreeHome'>;

export default function TreeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, updateFamily } = useFamily();
  const { members, loading, updateMember } = useMembers(family?.id);
  const { cars: allCars } = useAllFamilyCars(family?.id);
  const posterRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingFamily, setEditingFamily] = useState(false);
  const [familyName, setFamilyName] = useState(family?.name ?? '');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSharePoster = async () => {
    if (!posterRef.current || allCars.length === 0) {
      Alert.alert('Nothing to share yet', 'Add at least one car before sharing the family poster.');
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(posterRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your family of cars' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing isn\u2019t supported on this device.');
      }
    } catch (err) {
      Alert.alert('Couldn\u2019t create poster', err instanceof Error ? err.message : String(err));
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppLogoHeader />
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.familyTitleRow}>
              <Text style={styles.familyName}>{family?.name}</Text>
              <Pressable accessibilityLabel="Edit family name" onPress={() => { setFamilyName(family?.name ?? ''); setEditingFamily(true); }}>
                <Text style={styles.familyEdit}>✎</Text>
              </Pressable>
            </View>
            <Pressable style={styles.shareButton} onPress={handleSharePoster} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shareButtonText}>Share My Family of Cars</Text>
              )}
            </Pressable>
          </>
        }
        renderItem={({ item }) => (
          <MemberTile
            member={item}
            cars={allCars.filter((car) => car.member_id === item.id)}
            onPress={() => navigation.navigate('MemberCarousel', { member: item })}
            onEdit={() => setEditingMember(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No family members yet — add someone from the Family tab.</Text>
        }
      />

      {/* Off-screen poster, captured by handleSharePoster above. Positioned
          far off-canvas rather than unmounted, since captureRef needs a
          laid-out native view to snapshot. */}
      <View style={styles.offscreen} pointerEvents="none">
        <FamilyPoster ref={posterRef} familyName={family?.name ?? ''} cars={allCars} />
      </View>
      <MemberEditModal
        member={editingMember}
        saving={savingEdit}
        onClose={() => setEditingMember(null)}
        onSave={async (displayName, avatarUri) => {
          if (!editingMember) return;
          setSavingEdit(true);
          try {
            await updateMember(editingMember.id, displayName, avatarUri);
            setEditingMember(null);
          } finally {
            setSavingEdit(false);
          }
        }}
      />
      <Modal visible={editingFamily} transparent animationType="slide" onRequestClose={() => setEditingFamily(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit family name</Text>
            <TextInput style={styles.familyInput} value={familyName} onChangeText={setFamilyName} autoFocus />
            <Pressable
              style={styles.modalSave}
              onPress={async () => {
                if (!family?.id || !familyName.trim()) return;
                setSavingEdit(true);
                try { await updateFamily(family.id, familyName); setEditingFamily(false); } finally { setSavingEdit(false); }
              }}
              disabled={savingEdit}
            >
              {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Save name</Text>}
            </Pressable>
            <Pressable onPress={() => setEditingFamily(false)}><Text style={styles.cancelLink}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { justifyContent: 'space-between' },
  familyName: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  familyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  familyEdit: { color: '#F97316', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  shareButton: { backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center', marginBottom: 12 },
  shareButtonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  familyInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 13, fontSize: 16 },
  modalSave: { backgroundColor: '#0F766E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  cancelLink: { color: '#64748B', textAlign: 'center', marginTop: 14 },
});
