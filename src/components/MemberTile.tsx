import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Member } from '@/types/database';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';

export default function MemberTile({
  member,
  cars = [],
  onPress,
  onEdit,
  onReorder,
}: {
  member: Member;
  cars?: FamilyCar[];
  onPress: () => void;
  onEdit?: () => void;
  onReorder?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = member.display_name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Collapsed: a quick preview row of up to 4 thumbnails, matching the
  // original compact tile. Expanded: every car this member owns, each
  // one stacked below the last.
  const previewCars = expanded ? cars : cars.slice(0, 4);

  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        {onEdit ? (
          <Pressable accessibilityLabel={`Edit ${member.display_name}`} style={styles.editBadge} onPress={onEdit}>
            <Text style={styles.editBadgeText}>✎</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {member.display_name}
      </Text>
      {member.relationship ? (
        <Text style={styles.relationship} numberOfLines={1}>
          {member.relationship}
        </Text>
      ) : null}

      {cars.length > 0 && (
        <>
          <View style={expanded ? styles.carThumbColumn : styles.carThumbRow}>
            {previewCars.map((car) => (
              <View key={car.id} style={[styles.carThumbFrame, expanded && styles.carThumbFrameExpanded]}>
                {car.photo_url ? (
                  <Image source={{ uri: car.photo_url }} style={styles.carThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.carThumbFallback} />
                )}
              </View>
            ))}
          </View>

          {cars.length > 4 && (
            <Pressable
              accessibilityLabel={expanded ? 'Show fewer cars' : `Show all ${cars.length} cars`}
              style={styles.expandButton}
              onPress={() => setExpanded((v) => !v)}
            >
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#92400E"
              />
            </Pressable>
          )}

          {expanded && onReorder && cars.length > 1 && (
            <Pressable style={styles.reorderLink} onPress={onReorder}>
              <Text style={styles.reorderLinkText}>Reorder cars</Text>
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '47%', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 8 },
  avatarFallback: { backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 28, fontWeight: '700' },
  editBadge: { position: 'absolute', right: -4, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  name: { fontFamily: 'Trebuchet MS', fontSize: 15, fontWeight: '600' },
  relationship: { fontSize: 12, color: '#888' },
  carThumbRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  carThumbColumn: { flexDirection: 'column', gap: 6, marginTop: 10, width: '100%' },
  carThumbFrame: { width: 63, height: 45, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  carThumbFrameExpanded: { width: '100%', height: 70 },
  carThumb: { width: '100%', height: '100%' },
  carThumbFallback: { flex: 1, backgroundColor: '#CBD5E1' },
  // "Brown" down-arrow per the design note — a warm amber-brown rather
  // than the app's usual blue, so it reads as its own distinct control.
  expandButton: {
    marginTop: 6,
    width: 32,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderLink: { marginTop: 8 },
  reorderLinkText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
});
