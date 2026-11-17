import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import type { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { TreeStackParamList, RootStackParamList } from '@/navigation/RootNavigator';
import { useCars } from '@/hooks/useCars';
import { supabase } from '@/lib/supabase';
import CarCard from '@/components/CarCard';
import ConfirmModal from '@/components/ConfirmModal';
import { colors, font, radius, space, cardShadow, MIN_TAP } from '@/theme/tokens';
import type { Car, CarFact } from '@/types/database';

type Props = {
  route: RouteProp<TreeStackParamList, 'MemberCarousel'>;
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<TreeStackParamList, 'MemberCarousel'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

export default function MemberEditScreen({ route, navigation }: Props) {
  const { member } = route.params;
  const { cars, loading, deleteCar, refresh } = useCars(member.id);
  const [factsByCarId, setFactsByCarId] = useState<Record<string, CarFact | null>>({});
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { width: pageWidth } = useWindowDimensions();
  // The card fills the phone's width (minus a margin) but stops growing
  // at 440 so it stays a readable card on tablets and desktop web.
  const cardWidth = Math.min(pageWidth - space.lg * 2, 440);

  // Edits, deletes, and reassignments all happen on a screen pushed ON TOP
  // of this one — React Navigation keeps this screen mounted underneath
  // rather than remounting it, so its car list would otherwise go stale
  // (e.g. a car reassigned away wouldn't disappear) until refocused here.
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    let cancelled = false;
    async function loadFacts() {
      const results: Record<string, CarFact | null> = {};
      await Promise.all(
        cars.map(async (car) => {
          const { data } = await supabase
            .from('car_facts')
            .select('*')
            .eq('make', car.make)
            .eq('model', car.model)
            .eq('year', car.year)
            .limit(1)
            .maybeSingle();
          results[car.id] = (data as CarFact) ?? null;
        })
      );
      if (!cancelled) setFactsByCarId(results);
    }
    if (cars.length > 0) loadFacts();
  }, [cars]);

  const handleEditCar = (car: Car) => {
    navigation.navigate('AddCarForMember', { member, car });
  };

  // Alert.alert() with multiple buttons is a silent no-op on React Native
  // Web — tapping Delete called it, nothing rendered, and it looked
  // completely broken. A plain Modal works identically on web and native.
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCar(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const goToPage = (index: number) => {
    const clamped = Math.max(0, Math.min(index, cars.length - 1));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setPageIndex(clamped);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const addCar = () => navigation.navigate('AddCarForMember', { member });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasCars = cars.length > 0;
  const hasSeveral = cars.length > 1;
  const atFirst = pageIndex === 0;
  const atLast = pageIndex >= cars.length - 1;

  return (
    <View style={styles.screen}>
      {hasCars ? (
        <FlatList
          ref={listRef}
          horizontal
          pagingEnabled
          data={cars}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          // onScroll (not only onMomentumScrollEnd) keeps "2 of 5" right
          // on web too, where momentum events do not fire reliably.
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
            if (index !== pageIndex && index >= 0 && index < cars.length) setPageIndex(index);
          }}
          getItemLayout={(_data, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          renderItem={({ item }) => (
            // Each page scrolls vertically on its own, so a long story is
            // never cut off by the bottom bar on a small phone.
            <ScrollView style={{ width: pageWidth }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
              <CarCard
                car={item}
                fact={factsByCarId[item.id] ?? null}
                width={cardWidth}
                onEdit={() => handleEditCar(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            </ScrollView>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="car-side" size={44} color={colors.faint} />
          <Text style={styles.emptyTitle}>No cars yet</Text>
          <Text style={styles.emptyText}>
            Add the first car {member.display_name} ever drove, or the one in the driveway today.
          </Text>
          <Pressable accessibilityRole="button" style={styles.emptyButton} onPress={addCar}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.white} />
            <Text style={styles.emptyButtonText}>Add a car for {member.display_name}</Text>
          </Pressable>
        </View>
      )}

      {/* One bottom bar holds every control, in fixed places, instead of
          arrows floating over the middle of the card. */}
      {hasCars ? (
        <View style={styles.bottomBar}>
          <View style={styles.barSide}>
            {hasSeveral ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reorder cars"
                style={styles.reorderButton}
                onPress={() => navigation.navigate('ReorderCars', { member })}
              >
                <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.primary} />
                {/* On the narrowest phones (320pt) the word would collide
                    with the pager, so the button falls back to its icon;
                    the accessibility label still says "Reorder cars". */}
                {pageWidth >= 360 ? <Text style={styles.reorderButtonText}>Reorder</Text> : null}
              </Pressable>
            ) : null}
          </View>

          {hasSeveral ? (
            <View style={styles.pager}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous car"
                style={[styles.pagerArrow, atFirst && styles.pagerArrowDisabled]}
                onPress={() => goToPage(pageIndex - 1)}
                disabled={atFirst}
              >
                <MaterialCommunityIcons name="chevron-left" size={26} color={atFirst ? colors.faint : colors.primary} />
              </Pressable>
              <Text style={styles.pagerText} accessibilityLabel={`Car ${pageIndex + 1} of ${cars.length}`}>
                {pageIndex + 1} of {cars.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next car"
                style={[styles.pagerArrow, atLast && styles.pagerArrowDisabled]}
                onPress={() => goToPage(pageIndex + 1)}
                disabled={atLast}
              >
                <MaterialCommunityIcons name="chevron-right" size={26} color={atLast ? colors.faint : colors.primary} />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.barSide, styles.barSideRight]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add a car for ${member.display_name}`}
              style={styles.addButton}
              onPress={addCar}
            >
              <MaterialCommunityIcons name="plus" size={26} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete this car?"
        body={
          deleteTarget
            ? `${deleteTarget.year} ${deleteTarget.make} ${deleteTarget.model} will be permanently removed from ${member.display_name}’s cars, along with its story. This can’t be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  page: { alignItems: 'center', padding: space.lg, paddingBottom: space.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.sm },
  emptyTitle: { fontSize: font.title, fontWeight: '800', color: colors.ink, marginTop: space.sm },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: font.label, lineHeight: 20, maxWidth: 320 },
  emptyButton: {
    minHeight: MIN_TAP + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    marginTop: space.lg,
  },
  emptyButtonText: { color: colors.white, fontWeight: '700', fontSize: font.label },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  barSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  barSideRight: { justifyContent: 'flex-end' },
  reorderButton: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    minWidth: MIN_TAP,
    justifyContent: 'center',
  },
  reorderButtonText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  pager: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pagerArrow: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, alignItems: 'center', justifyContent: 'center' },
  pagerArrowDisabled: { opacity: 0.5 },
  pagerText: { color: colors.text, fontSize: font.label, fontWeight: '700', minWidth: 56, textAlign: 'center' },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
});
