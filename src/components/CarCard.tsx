import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Car, CarFact, CarStatus } from '@/types/database';
import { getColorHex } from '@/utils/carColors';
import { openVehicleSearch } from '@/utils/vehicleSearch';

const CARD_WIDTH = Dimensions.get('window').width * 0.82;

const STATUS_META: Record<CarStatus, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; fg: string }> = {
  first: { label: 'First Car', icon: 'numeric-1-circle', bg: '#DBEAFE', fg: '#1D4ED8' },
  current: { label: 'Currently Driving', icon: 'circle', bg: '#DCFCE7', fg: '#166534' },
  memory: { label: 'Memory', icon: 'image-multiple', bg: '#E0E7FF', fg: '#3730A3' },
  dream: { label: 'Dream Car', icon: 'star', bg: '#FEF3C7', fg: '#92400E' },
};

export default function CarCard({
  car,
  fact,
  onEdit,
  onDelete,
}: {
  car: Car;
  fact: CarFact | null;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [factExpanded, setFactExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        {/* Placeholder anchor for Phase 2 fun facts (mpg, popular color, cool
            features, etc). Not wired to real data yet — this just reserves
            the visual spot so Phase 2 can drop content in without a
            layout change. Shows a live teaser if a fact already exists. */}
        <View style={styles.factBubble}>
          <Text style={styles.factBubbleText} numberOfLines={1}>
            {fact ? fact.fact_text : 'Fun facts coming soon'}
          </Text>
          <View style={styles.factBubbleTail} />
        </View>
        {car.photo_url ? (
          <Image source={{ uri: car.photo_url }} style={styles.photo} resizeMode="contain" />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>No photo yet</Text>
          </View>
        )}
      </View>

      {car.photo_quality_status === 'flagged' && (
        <View style={styles.flagBanner}>
          <Text style={styles.flagBannerText}>This photo may not show a vehicle — tap to re-upload</Text>
        </View>
      )}

      <Text style={styles.title}>
        {car.year} {car.make} {car.model}
      </Text>
      {car.nickname ? <Text style={styles.nickname}>“{car.nickname}”</Text> : null}

      <View style={[styles.statusBadge, { backgroundColor: STATUS_META[car.status].bg }]}>
        <MaterialCommunityIcons name={STATUS_META[car.status].icon} size={12} color={STATUS_META[car.status].fg} />
        <Text style={[styles.statusBadgeText, { color: STATUS_META[car.status].fg }]}>
          {STATUS_META[car.status].label}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {car.color ? (
          <View style={styles.colorRow}>
            <View style={[styles.swatch, { backgroundColor: getColorHex(car.color) }]} />
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

      {car.memories ? (
        <View style={styles.memoriesBox}>
          <Text style={styles.memoriesLabel}>Memories</Text>
          <Text style={styles.memoriesText}>{car.memories}</Text>
        </View>
      ) : null}

      {car.fun_fact ? (
        <View style={styles.funFactBox}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color="#0E7490" />
          <Text style={styles.funFactText}>{car.fun_fact}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Find this ${car.year} ${car.make} ${car.model} for sale`}
        style={styles.saleButton}
        onPress={() => void openVehicleSearch(car.make, car.model, car.year, car.trim, car.color)}
      >
        <Text style={styles.saleButtonText}>Find this car for sale!</Text>
      </Pressable>

      {(onEdit || onDelete) && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <Pressable onPress={onEdit} hitSlop={8}>
              <Text style={styles.actionEdit}>Edit</Text>
            </Pressable>
          )}
          {onEdit && onDelete && <Text style={styles.actionsDivider}>{'\u00b7'}</Text>}
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8}>
              <Text style={styles.actionDelete}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
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
  photoWrap: { position: 'relative' },
  factBubble: {
    position: 'absolute',
    top: -10,
    left: 10,
    zIndex: 2,
    maxWidth: '75%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  factBubbleText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  factBubbleTail: {
    position: 'absolute',
    bottom: -6,
    left: 14,
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    transform: [{ rotate: '45deg' }],
  },
  photo: { width: '100%', height: 90, borderRadius: 12, marginBottom: 10, backgroundColor: '#F3F4F6' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { color: '#999' },
  flagBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8, marginBottom: 8 },
  flagBannerText: { color: '#92400E', fontSize: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  nickname: { fontSize: 14, color: '#666', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', marginTop: 8 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#ccc' },
  metaText: { fontSize: 13, color: '#555' },
  factBox: { marginTop: 12, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10 },
  factText: { fontSize: 13, color: '#334155' },
  factHint: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  memoriesBox: { marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10 },
  memoriesLabel: { fontSize: 11, fontWeight: '700', color: '#B45309', marginBottom: 3, textTransform: 'uppercase' },
  memoriesText: { fontSize: 13, color: '#78350F', lineHeight: 18 },
  funFactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#ECFEFF',
    borderRadius: 10,
    padding: 10,
  },
  funFactText: { flex: 1, fontSize: 12, color: '#155E75', lineHeight: 17, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 },
  actionEdit: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  actionDelete: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  actionsDivider: { color: '#ccc' },
  saleButton: { borderWidth: 1, borderColor: '#B45309', borderRadius: 9, paddingVertical: 9, alignItems: 'center', marginTop: 12, backgroundColor: '#FEF3C7' },
  saleButtonText: { color: '#92400E', fontWeight: '800', fontSize: 13 },
});
