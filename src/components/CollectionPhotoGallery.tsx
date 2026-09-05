import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ItemPhoto } from '@/types/database';

export default function CollectionPhotoGallery({
  photos,
  fallbackUrl,
  height = 170,
  width = Math.min(Dimensions.get('window').width - 36, 670),
}: {
  photos: ItemPhoto[];
  fallbackUrl?: string | null;
  height?: number;
  width?: number;
}) {
  const orderedPhotos = photos.length > 0
    ? photos
    : fallbackUrl
      ? [{ id: 'legacy-photo', item_id: '', url: fallbackUrl, caption: null, order_index: 0, created_at: '' }]
      : [];

  if (orderedPhotos.length === 0) {
    return <View style={[styles.fallback, { height, width }]}><Text style={styles.fallbackText}>No photo yet</Text></View>;
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height, width }} accessibilityLabel={`${orderedPhotos.length} car photo${orderedPhotos.length === 1 ? '' : 's'}`}>
      {orderedPhotos.map((photo) => (
        <View key={photo.id} style={{ width, height }}>
          <Image source={{ uri: photo.url }} style={[styles.photo, { height }]} resizeMode="cover" />
          {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', borderRadius: 12, backgroundColor: '#E2E8F0' },
  fallback: { width: '100%', borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#64748B', fontWeight: '600' },
  caption: { color: '#475569', fontSize: 12, marginTop: -24, marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 4 },
});
