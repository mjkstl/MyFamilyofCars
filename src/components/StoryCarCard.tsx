import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';
import CollectionPhotoGallery from '@/components/CollectionPhotoGallery';

export default function StoryCarCard({
  car,
  onPress,
  onEdit,
}: {
  car: FamilyCar;
  onPress: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read the story of ${car.year} ${car.make} ${car.model}`}
        onPress={onPress}
      >
        <CollectionPhotoGallery photos={car.photos} fallbackUrl={car.photo_url} />
        <Text style={styles.title}>{car.year} {car.make} {car.model}</Text>
        {car.nickname ? <Text style={styles.nickname}>“{car.nickname}”</Text> : null}
        <Text style={styles.person}>Connected to {car.member_display_name}</Text>
        <Text style={styles.story} numberOfLines={4}>
          {car.memories || 'This car is waiting for its family story.'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit the story for ${car.year} ${car.make} ${car.model}`} onPress={onEdit}>
        <Text style={styles.edit}>Edit story and details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  photo: { width: '100%', height: 170, borderRadius: 12, backgroundColor: '#E2E8F0' },
  title: { color: '#0F172A', fontSize: 19, fontWeight: '800', marginTop: 12 },
  nickname: { color: '#64748B', fontStyle: 'italic', marginTop: 3 },
  person: { color: '#1D4ED8', fontSize: 13, fontWeight: '700', marginTop: 8 },
  story: { color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 9 },
  edit: { color: '#1D4ED8', fontWeight: '700', marginTop: 14 },
});
