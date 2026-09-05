import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamily } from '@/hooks/useFamily';
import { useAllFamilyCars, type FamilyCar } from '@/hooks/useAllFamilyCars';
import StoryCarCard from '@/components/StoryCarCard';
import AppLogoHeader from '@/components/AppLogoHeader';
import type { StoryStackParamList } from '@/navigation/RootNavigator';
import type { Member } from '@/types/database';

type SortMode = 'added' | 'year' | 'person' | 'status';
type StoryNav = NativeStackNavigationProp<StoryStackParamList, 'Storybook'>;

export default function StorybookScreen() {
  const navigation = useNavigation<StoryNav>();
  const treeNavigation = navigation;
  const { family } = useFamily();
  const { cars, loading } = useAllFamilyCars(family?.id);
  const [sortMode, setSortMode] = useState<SortMode>('added');

  const sortedCars = useMemo(() => {
    const result = [...cars];
    const statusOrder = { current: 0, memory: 1, dream: 2 };
    result.sort((a, b) => {
      if (sortMode === 'year') return a.year - b.year;
      if (sortMode === 'person') return a.member_display_name.localeCompare(b.member_display_name);
      if (sortMode === 'status') return statusOrder[a.status] - statusOrder[b.status];
      return a.created_at.localeCompare(b.created_at);
    });
    return result;
  }, [cars, sortMode]);

  const openCar = (car: FamilyCar) => {
    const member: Member = {
      id: car.member_id,
      family_id: family?.id ?? '',
      display_name: car.member_display_name,
      relationship: null,
      avatar_url: null,
      user_id: null,
      parent_member_id: null,
      parent_link_confidence: null,
      parent_link_confirmed: false,
      created_at: car.created_at,
    };
    treeNavigation.navigate('MemberCarousel', { member });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppLogoHeader compact />
        <Text style={styles.heading}>Our Story</Text>
        <Text style={styles.intro}>
          The cars your family has loved, remembered in the order that feels most meaningful.
        </Text>
        <Pressable style={styles.printButton} accessibilityRole="button" onPress={() => navigation.navigate('PrintPreview')}>
          <Text style={styles.printButtonText}>Create a keepsake</Text>
        </Pressable>
        <Text style={styles.sortLabel}>Arrange the story by</Text>
        <View style={styles.sortRow}>
          {([
            ['added', 'Date added'],
            ['year', 'Year'],
            ['person', 'Person'],
            ['status', 'Status'],
          ] as const).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sortMode === value }} onPress={() => setSortMode(value)} style={[styles.sortButton, sortMode === value && styles.sortButtonActive]}>
              <Text style={[styles.sortText, sortMode === value && styles.sortTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {sortedCars.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your story is waiting</Text>
            <Text style={styles.emptyText}>Add a car to begin your family’s garage story.</Text>
          </View>
        ) : (
          sortedCars.map((car) => (
            <StoryCarCard
              key={car.id}
              car={car}
              onPress={() => openCar(car)}
              onEdit={() => {
                const member: Member = {
                  id: car.member_id,
                  family_id: family?.id ?? '',
                  display_name: car.member_display_name,
                  relationship: null,
                  avatar_url: null,
                  user_id: null,
                  parent_member_id: null,
                  parent_link_confidence: null,
                  parent_link_confirmed: false,
                  created_at: car.created_at,
                };
                treeNavigation.navigate('AddCarForMember', { member, car });
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { color: '#0F172A', fontSize: 30, fontWeight: '800', marginTop: 10 },
  intro: { color: '#475569', fontSize: 15, lineHeight: 22, marginTop: 7, marginBottom: 14 },
  printButton: { alignSelf: 'flex-start', backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16 },
  printButtonText: { color: '#fff', fontWeight: '800' },
  sortLabel: { color: '#475569', fontSize: 12, fontWeight: '800', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  sortButton: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 11 },
  sortButtonActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  sortText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  sortTextActive: { color: '#fff' },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginTop: 12 },
  emptyTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  emptyText: { color: '#475569', marginTop: 6, lineHeight: 20 },
});
