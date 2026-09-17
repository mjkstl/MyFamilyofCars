import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Car, CarStatus } from '@/types/database';

const STATUS_META: Record<CarStatus, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; fg: string }> = {
  first: { label: 'First Car', icon: 'numeric-1-circle', bg: '#DBEAFE', fg: '#1D4ED8' },
  current: { label: 'Currently Driving', icon: 'circle', bg: '#DCFCE7', fg: '#166534' },
  memory: { label: 'Memory', icon: 'image-multiple', bg: '#E0E7FF', fg: '#3730A3' },
  dream: { label: 'Dream Car', icon: 'star', bg: '#FEF3C7', fg: '#92400E' },
};

/**
 * Purpose-built for the Family Tree page's filterable, family-wide
 * Collection list — a scrollable browse view of every car across
 * generations. CarCard (used on the Member Edit page's one-per-screen
 * carousel) is a large placard sized to 82% of the full screen width;
 * crammed into a scrollable list here it doesn't fit the context. This
 * is a compact row instead: thumbnail + details, sized to its actual
 * container rather than a fixed carousel-oriented width.
 */
export default function CollectionCarRow({ car, memberName }: { car: Car; memberName: string }) {
  const status = STATUS_META[car.status];

  return (
    <View style={styles.row}>
      {car.photo_url ? (
        <Image source={{ uri: car.photo_url }} style={styles.thumb} resizeMode="contain" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <MaterialCommunityIcons name="car" size={22} color="#CBD5E1" />
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {car.nickname ? `${car.nickname} — ` : ''}
          {car.year} {car.make} {car.model}
        </Text>
        <Text style={styles.memberLabel} numberOfLines={1}>Connected to {memberName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons name={status.icon} size={11} color={status.fg} />
          <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
  },
  thumb: { width: 84, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  memberLabel: { fontSize: 12, color: '#64748B' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
});
