import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useFamily } from '@/hooks/useFamily';
import { useAllFamilyCars, type FamilyCar } from '@/hooks/useAllFamilyCars';
import StoryCarCard from '@/components/StoryCarCard';
import type { StoryStackParamList } from '@/navigation/RootNavigator';
import type { Member } from '@/types/database';
import KeepsakeInterestModal from '@/components/KeepsakeInterestModal';
import { trackEvent } from '@/services/analytics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

type SortMode = 'added' | 'year' | 'person' | 'status';
type StoryNav = NativeStackNavigationProp<StoryStackParamList, 'Storybook'>;

export default function StorybookScreen() {
  const navigation = useNavigation<StoryNav>();
  const treeNavigation = navigation;
  const { family } = useFamily();
  const { cars, loading, refresh: refreshCars } = useAllFamilyCars(family?.id);
  const [sortMode, setSortMode] = useState<SortMode>('added');
  const [interestOpen, setInterestOpen] = useState(false);

  React.useEffect(() => {
    if (family?.id) void trackEvent('storybook_opened', {}, family.id);
  }, [family?.id]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshCars();
    }, [refreshCars]),
  );

  const sortedCars = useMemo(() => {
    const result = [...cars];
    const statusOrder = { first: 0, current: 1, memory: 2, dream: 3 };
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
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const openInterest = () => {
    setInterestOpen(true);
    void trackEvent('keepsake_interest_opened', {}, family?.id);
  };

  /** The story list only knows each car's owner by id and name, so build
   * the minimal Member the car screens need to open. */
  const memberFor = (car: FamilyCar): Member => ({
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
  });

  const hasCars = sortedCars.length > 0;
  const storyCount = cars.filter((car) => car.memories).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The navigation bar already says "Our Story", so this screen
            opens on the family's own name rather than repeating the
            title under a large logo. */}
        <Text style={styles.heading} accessibilityRole="header">{family?.name ?? 'Our Story'}</Text>
        <Text style={styles.intro}>
          {hasCars
            ? `${cars.length} ${cars.length === 1 ? 'car' : 'cars'} · ${storyCount} ${storyCount === 1 ? 'story' : 'stories'} told so far`
            : 'The cars your family has loved, and the stories that go with them.'}
        </Text>

        {hasCars ? (
          <>
            <View style={styles.keepsakeCard}>
              <View style={styles.keepsakeHeader}>
                <MaterialCommunityIcons name="book-open-page-variant" size={22} color={colors.accent} />
                <Text style={styles.keepsakeTitle}>Make it a keepsake</Text>
              </View>
              <Text style={styles.keepsakeCopy}>See your family’s cars and stories laid out as printable pages.</Text>
              <Pressable
                style={styles.printButton}
                accessibilityRole="button"
                onPress={() => {
                  void trackEvent('print_preview_opened', {}, family?.id);
                  navigation.navigate('PrintPreview');
                }}
              >
                <Text style={styles.printButtonText}>Preview keepsake</Text>
              </Pressable>
              <Pressable style={styles.interestButton} accessibilityRole="button" onPress={openInterest}>
                <Text style={styles.interestButtonText}>Tell me when printed books are ready</Text>
              </Pressable>
            </View>

            <Text style={styles.sortLabel}>Arrange by</Text>
            <View style={styles.sortRow}>
              {([
                ['added', 'Date added'],
                ['year', 'Year'],
                ['person', 'Person'],
                ['status', 'Status'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sortMode === value }}
                  onPress={() => setSortMode(value)}
                  hitSlop={6}
                  style={[styles.sortButton, sortMode === value && styles.sortButtonActive]}
                >
                  <Text style={[styles.sortText, sortMode === value && styles.sortTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {sortedCars.map((car) => (
              <StoryCarCard
                key={car.id}
                car={car}
                onPress={() => openCar(car)}
                onEdit={() => treeNavigation.navigate('AddCarForMember', { member: memberFor(car), car })}
              />
            ))}
          </>
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="book-open-blank-variant" size={40} color={colors.accent} />
            <Text style={styles.emptyTitle}>Your story starts with one car</Text>
            <Text style={styles.emptyText}>Add a car and a line or two about it. It will appear here, ready to share and print.</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.printButton}
              onPress={() => navigation.getParent()?.navigate('Add Car' as never)}
            >
              <Text style={styles.printButtonText}>Add a car</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <KeepsakeInterestModal visible={interestOpen} familyId={family?.id} onClose={() => setInterestOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  // maxWidth keeps the reading column phone-shaped on tablets / web.
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heading: { fontFamily: font.brandFamily, color: colors.ink, fontSize: font.display, fontWeight: '800' },
  intro: { color: colors.muted, fontSize: font.label, lineHeight: 20, marginTop: space.xs, marginBottom: space.lg },
  keepsakeCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.lg },
  keepsakeHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  keepsakeTitle: { color: colors.ink, fontSize: font.heading, fontWeight: '800' },
  keepsakeCopy: { color: colors.text, fontSize: font.label, lineHeight: 20, marginTop: space.xs },
  printButton: {
    minHeight: MIN_TAP + 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    marginTop: space.md,
    alignSelf: 'stretch',
  },
  printButtonText: { color: colors.white, fontWeight: '700', fontSize: font.label },
  interestButton: { minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
  interestButtonText: { color: colors.accent, fontWeight: '700', fontSize: font.small, textAlign: 'center' },
  sortLabel: { color: colors.muted, fontSize: font.tiny, fontWeight: '800', marginTop: space.xl, marginBottom: space.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  sortButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  sortButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { color: colors.text, fontWeight: '600', fontSize: font.small },
  sortTextActive: { color: colors.white },
  empty: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.xl, marginTop: space.sm, alignItems: 'flex-start' },
  emptyTitle: { color: colors.ink, fontSize: font.title, fontWeight: '800', marginTop: space.sm },
  emptyText: { color: colors.text, fontSize: font.label, marginTop: space.xs, lineHeight: 20 },
});
