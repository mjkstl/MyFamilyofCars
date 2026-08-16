import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import type { Car, CarFact } from '@/types/database';

const CARD_WIDTH = Dimensions.get('window').width * 0.82;

export default function CarCard({ car, fact }: { car: Car; fact: CarFact | null }) {
  const [factExpanded, setFactExpanded] = useState(false);

  return (
    <View style={styles.card}>
      {car.photo_url ? (
        <Image source={{ uri: car.photo_url }} style={styles.photo} />
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
});
