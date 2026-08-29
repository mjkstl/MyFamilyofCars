import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import MemberEditModal from '@/components/MemberEditModal';
import type { Member } from '@/types/database';

export default function FamilyScreen() {
  const { family, currentMember } = useFamily();
  const { members, addMemberWithInference, updateMember } = useMembers(family?.id);
  const { cars: allCars } = useAllFamilyCars(family?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit-member state, opened by tapping a tile in the grid below.
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const carsByMember = (memberId: string) => allCars.filter((c) => c.member_id === memberId);

  const handleAddMember = async () => {
    if (!displayName.trim()) {
      Alert.alert('Missing name', 'Enter a name.');
      return;
    }
    setSubmitting(true);
    try {
      await addMemberWithInference({
        displayName: displayName.trim(),
        relationshipLabel: relationshipLabel.trim(),
        enteredByMemberId: currentMember?.id ?? null,
      });
      setDisplayName('');
      setRelationshipLabel('');
      setModalOpen(false);
    } catch (err) {
      Alert.alert('Couldn\u2019t add member', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (name: string, avatarUri: string | null) => {
    if (!editingMember) return;
    setSavingMember(true);
    try {
      await updateMember(editingMember.id, name, avatarUri);
      setEditingMember(null);
    } catch (err) {
      Alert.alert('Couldn\u2019t save', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingMember(false);
    }
  };

  const handleShareInvite = async () => {
    if (!family?.invite_code) return;
    try {
      await Share.share({
        message: `Join our family on My Family of Cars! Use invite code: ${family.invite_code}`,
      });
    } catch (err) {
      Alert.alert('Couldn\u2019t share', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 480, flex: 1 }}>
        <Text style={styles.heading}>{family?.name}</Text>

        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <View style={styles.tileWrap}>
              <MemberTile
                member={item}
                cars={carsByMember(item.id)}
                onPress={() => setEditingMember(item)}
                onEdit={() => setEditingMember(item)}
              />
              {item.parent_member_id && !item.parent_link_confirmed && (
                <Text style={styles.pendingBadge}>Link pending confirmation</Text>
              )}
            </View>
          )}
        />

        <Pressable style={styles.addButton} onPress={() => setModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add family member</Text>
        </Pressable>

        <Pressable style={styles.inviteButton} onPress={handleShareInvite}>
          <Text style={styles.inviteButtonText}>Invite a family member</Text>
        </Pressable>

        {family?.invite_code && (
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Invite code</Text>
            <Text style={styles.codeValue} selectable>
              {family.invite_code}
            </Text>
          </View>
        )}
        </View>
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a family member</Text>
            <TextInput style={styles.input} placeholder="Name" value={displayName} onChangeText={setDisplayName} />
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g. Mom, Dad, Brother)"
              value={relationshipLabel}
              onChangeText={setRelationshipLabel}
            />
            <Pressable style={styles.saveButton} onPress={handleAddMember} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add</Text>}
            </Pressable>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MemberEditModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSaveEdit}
        saving={savingMember}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  row: { justifyContent: 'flex-start', gap: 20 },
  tileWrap: { alignItems: 'center' },
  pendingBadge: { fontSize: 11, color: '#B45309', marginTop: -14, marginBottom: 10 },
  addButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  inviteButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  inviteButtonText: { color: '#1D4ED8', fontWeight: '600' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  codeLabel: { fontSize: 12, color: '#999' },
  codeValue: { fontSize: 16, fontWeight: '700', letterSpacing: 1, color: '#111' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10 },
  saveButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelLink: { textAlign: 'center', color: '#888', marginTop: 12, marginBottom: 4 },
});
