import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import type { Car, CarFact } from '@/types/database';

const CARD_WIDTH = Dimensions.get('window').width * 0.82;

export default function CarCard({
  car,
  fact,
  onEdit,
  onDelete,
  onNotesSave,
}: {
  car: Car;
  fact: CarFact | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onNotesSave?: (notes: string) => Promise<void> | void;
}) {
  const [factExpanded, setFactExpanded] = useState(false);
  const [notes, setNotes] = useState(car.notes ?? '');
  const [savedNotes, setSavedNotes] = useState(car.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  return (
    <View style={styles.card}>
      {car.photo_url ? (
        <Image source={{ uri: car.photo_url }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Text style={styles.photoFallbackText}>No photo yet</Text>
        </View>
      )}

      {car.photo_quality_status === 'flagged' && (
        <View style={styles.flagBanner}>
          <Text style={styles.flagBannerText}>This photo may not show a vehicle — tap to re-upload</Text>
        </View>
      )}

      <Text style={styles.title}>
        {car.year} {car.make} {car.model}
      </Text>
      {car.nickname ? <Text style={styles.nickname}>“{car.nickname}”</Text> : null}

      <View style={styles.metaRow}>
        {car.color ? (
          <View style={styles.colorRow}>
            <View style={[styles.swatch, { backgroundColor: car.color }]} />
            <Text style={styles.metaText}>{car.color}</Text>
          </View>
        ) : null}
      </View>

      {fact ? (
        <Pressable style={styles.factBox} onPress={() => setFactExpanded((v) => !v)}>
          <Text style={styles.factText} numberOfLines={factExpanded ? undefined : 2}>
            {fact.fact_text}
          </Text>
          <Text style={styles.factHint}>{factExpanded ? 'Tap to collapse' : 'Tap for more'}</Text>
        </Pressable>
      ) : null}

      {onNotesSave ? (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Memory</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a memory about this car..."
            multiline
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.memorySaveButton, notes === savedNotes && styles.memorySaveDisabled]}
            disabled={savingNotes || notes === savedNotes}
            onPress={async () => {
              setSavingNotes(true);
              try {
                await onNotesSave(notes);
                setSavedNotes(notes);
              } finally {
                setSavingNotes(false);
              }
            }}
          >
            {savingNotes ? <ActivityIndicator color="#fff" /> : <Text style={styles.memorySaveText}>Save memory</Text>}
          </Pressable>
        </View>
      ) : null}

      {onEdit || onDelete ? (
        <View style={styles.actionRow}>
          {onEdit ? (
            <Pressable style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photo: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10, backgroundColor: '#eee' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { color: '#999' },
  flagBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8, marginBottom: 8 },
  flagBannerText: { color: '#92400E', fontSize: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  nickname: { fontSize: 14, color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 8 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#ccc' },
  metaText: { fontSize: 13, color: '#555' },
  factBox: { marginTop: 12, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10 },
  factText: { fontSize: 13, color: '#334155' },
  factHint: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  notesSection: { marginTop: 14 },
  notesLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  notesInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  memorySaveButton: { backgroundColor: '#0F766E', borderRadius: 9, padding: 11, alignItems: 'center', marginTop: 8 },
  memorySaveDisabled: { backgroundColor: '#94A3B8' },
  memorySaveText: { color: '#fff', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: { flex: 1, backgroundColor: '#0F766E', borderRadius: 9, padding: 11, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: '700' },
  deleteButton: { flex: 1, backgroundColor: '#FFF1F2', borderRadius: 9, padding: 11, alignItems: 'center' },
  deleteButtonText: { color: '#BE123C', fontWeight: '700' },
});
