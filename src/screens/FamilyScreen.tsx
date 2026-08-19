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
import type { Member } from '@/types/database';

export default function FamilyScreen() {
  const { family, currentMember } = useFamily();
  const { members, addMemberWithInference, confirmParentLink } = useMembers(family?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manual-picker state, shown when inference confidence is low.
  const [manualPickFor, setManualPickFor] = useState<Member | null>(null);

  const handleShareInvite = async () => {
    if (!family) return;
    try {
      await Share.share({
        message:
          `Join our family car tree on "My Family of Cars"! ` +
          `Use invite code: ${family.invite_code}`,
      });
    } catch {
      // user cancelled share sheet — nothing to do
    }
  };

  const handleAddMember = async () => {
    if (!displayName.trim() || !relationshipLabel.trim()) {
      Alert.alert('Missing info', 'Enter a name and how they relate to you.');
      return;
    }
    setSubmitting(true);
    try {
      const { member, inference } = await addMemberWithInference({
        displayName: displayName.trim(),
        relationshipLabel: relationshipLabel.trim(),
        referenceName: displayName.trim(),
        enteredByMemberId: currentMember?.id ?? null,
      });

      setModalOpen(false);
      setDisplayName('');
      setRelationshipLabel('');

      if (inference.confidence === 'high' && inference.suggestedParent) {
        Alert.alert(
          'Confirm relationship',
          `Is ${inference.suggestedParent.display_name} ${member.display_name}'s parent in the tree?`,
          [
            {
              text: 'No, let me pick',
              style: 'cancel',
              onPress: () => setManualPickFor(member),
            },
            {
              text: 'Yes',
              onPress: () => confirmParentLink(member.id, inference.suggestedParent!.id, 'high'),
            },
          ]
        );
      } else if (inference.confidence === 'low') {
        setManualPickFor(member);
      }
    } catch (err) {
      Alert.alert('Couldn\u2019t add member', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.heading}>{family?.name}</Text>

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

        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>{item.display_name}</Text>
              {item.relationship ? <Text style={styles.memberRelationship}>{item.relationship}</Text> : null}
              {item.parent_member_id && !item.parent_link_confirmed && (
                <Text style={styles.pendingBadge}>Link pending confirmation</Text>
              )}
            </View>
          )}
        />

        <Pressable style={styles.addButton} onPress={() => setModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add family member</Text>
        </Pressable>
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a family member</Text>
            <TextInput
              style={styles.input}
              placeholder="Their name"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship to you (e.g. Dad, Sister, Grandma)"
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

      <Modal visible={!!manualPickFor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Who is {manualPickFor?.display_name}'s parent in the tree?
            </Text>
            <FlatList
              data={members.filter((m) => m.id !== manualPickFor?.id)}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerRow}
                  onPress={async () => {
                    if (!manualPickFor) return;
                    await confirmParentLink(manualPickFor.id, item.id, 'manual');
                    setManualPickFor(null);
                  }}
                >
                  <Text style={styles.pickerRowText}>{item.display_name}</Text>
                </Pressable>
              )}
            />
            <Pressable
              onPress={async () => {
                if (!manualPickFor) return;
                await confirmParentLink(manualPickFor.id, null, 'manual');
                setManualPickFor(null);
              }}
            >
              <Text style={styles.cancelLink}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: '700' },
  inviteButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  inviteButtonText: { color: '#1D4ED8', fontWeight: '600' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  codeLabel: { fontSize: 12, color: '#999' },
  codeValue: { fontSize: 16, fontWeight: '700', letterSpacing: 1, color: '#111' },
  memberRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRelationship: { fontSize: 13, color: '#888' },
  pendingBadge: { fontSize: 11, color: '#B45309', marginTop: 2 },
  addButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10 },
  saveButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelLink: { textAlign: 'center', color: '#888', marginTop: 12, marginBottom: 4 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  pickerRowText: { fontSize: 16 },
});
