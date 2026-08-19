import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Member } from '@/types/database';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';

export default function MemberTile({ member, cars = [], onPress, onEdit }: { member: Member; cars?: FamilyCar[]; onPress: () => void; onEdit?: () => void }) {
  const initials = member.display_name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
      {cars.length > 0 ? (
        <View style={styles.carThumbRow}>
          {cars.slice(0, 4).map((car) => (
            <View key={car.id} style={styles.carThumbFrame}>
              {car.photo_url ? (
                <Image source={{ uri: car.photo_url }} style={styles.carThumb} resizeMode="cover" />
              ) : (
                <View style={styles.carThumbFallback} />
              )}
            </View>
          ))}
        </View>
      ) : null}
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
  name: { fontSize: 15, fontWeight: '600' },
  relationship: { fontSize: 12, color: '#888' },
  carThumbRow: { flexDirection: 'row', gap: 5, marginTop: 10 },
  carThumbFrame: { width: 42, height: 30, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  carThumb: { width: '100%', height: '100%' },
  carThumbFallback: { flex: 1, backgroundColor: '#CBD5E1' },
});
