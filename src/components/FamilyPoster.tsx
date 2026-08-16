import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';

interface Props {
  familyName: string;
  cars: FamilyCar[];
}

/**
 * Rendered off-screen (see TreeScreen) and captured via react-native-
 * view-shot into a shareable poster image. Keep this visually simple —
 * it's the Phase 1 "one basic layout" template; more styles come in
 * Phase 2/3 monetization tiers.
 */
const FamilyPoster = forwardRef<View, Props>(({ familyName, cars }, ref) => {
  return (
    <View ref={ref} style={styles.poster} collapsable={false}>
      <Text style={styles.title}>{familyName}</Text>
      <Text style={styles.subtitle}>Our Family of Cars</Text>
      <View style={styles.grid}>
        {cars.slice(0, 9).map((car) => (
          <View key={car.id} style={styles.cell}>
            {car.photo_url ? (
              <Image source={{ uri: car.photo_url }} style={styles.cellPhoto} />
            ) : (
              <View style={[styles.cellPhoto, styles.cellPhotoFallback]} />
            )}
            <Text style={styles.cellCaption} numberOfLines={1}>
              {car.year} {car.make} {car.model}
            </Text>
            <Text style={styles.cellOwner} numberOfLines={1}>
              {car.member_display_name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

FamilyPoster.displayName = 'FamilyPoster';
export default FamilyPoster;

const CELL_SIZE = 110;

const styles = StyleSheet.create({
  poster: { width: 380, padding: 20, backgroundColor: '#0F172A' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: CELL_SIZE, marginBottom: 14 },
  cellPhoto: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10, backgroundColor: '#1E293B' },
  cellPhotoFallback: {},
  cellCaption: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
  cellOwner: { color: '#94A3B8', fontSize: 10 },
});
