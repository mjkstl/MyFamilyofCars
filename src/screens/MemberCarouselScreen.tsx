import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { TreeStackParamList } from '@/navigation/RootNavigator';
import { useCars } from '@/hooks/useCars';
import { supabase } from '@/lib/supabase';
import CarCard from '@/components/CarCard';
import type { Car, CarFact } from '@/types/database';

type Props = {
  route: RouteProp<TreeStackParamList, 'MemberCarousel'>;
  navigation: NativeStackNavigationProp<TreeStackParamList, 'MemberCarousel'>;
};

export default function MemberCarouselScreen({ route, navigation }: Props) {
  const { member } = route.params;
  const { cars, loading, deleteCar, refresh } = useCars(member.id);
  const [factsByCarId, setFactsByCarId] = useState<Record<string, CarFact | null>>({});
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { width: pageWidth } = useWindowDimensions();

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        data={cars}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
          setPageIndex(index);
        }}
        getItemLayout={(_data, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: pageWidth }]}>
            <CarCard
              car={item}
              fact={factsByCarId[item.id] ?? null}
              onEdit={() => handleEditCar(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { width: pageWidth }]}>
            <Text style={styles.emptyText}>
              {member.display_name} doesn't have any cars yet — tap + to add one.
            </Text>
          </View>
        }
      />

      {cars.length > 1 && (
        <>
          <Pressable
            accessibilityLabel="Previous car"
            style={[styles.navArrow, styles.navArrowLeft, pageIndex === 0 && styles.navArrowDisabled]}
            onPress={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={pageIndex === 0 ? '#ccc' : '#1D4ED8'} />
          </Pressable>
          <Pressable
            accessibilityLabel="Next car"
            style={[styles.navArrow, styles.navArrowRight, pageIndex === cars.length - 1 && styles.navArrowDisabled]}
            onPress={() => goToPage(pageIndex + 1)}
            disabled={pageIndex === cars.length - 1}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={pageIndex === cars.length - 1 ? '#ccc' : '#1D4ED8'}
            />
          </Pressable>
          <View style={styles.pageDots}>
            {cars.map((c, i) => (
              <View key={c.id} style={[styles.dot, i === pageIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      )}

      <Pressable
        accessibilityLabel={`Add a car for ${member.display_name}`}
        style={styles.fab}
        onPress={() => navigation.navigate('AddCarForMember', { member })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this car?</Text>
            {deleteTarget && (
              <Text style={styles.modalBody}>
                {deleteTarget.year} {deleteTarget.make} {deleteTarget.model} will be permanently removed from{' '}
                {member.display_name}'s carousel. This can't be undone.
              </Text>
            )}
            {deleteError && <Text style={styles.modalError}>{deleteError}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteButton} onPress={confirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: '#888', textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { color: '#fff', fontSize: 30, fontWeight: '400', lineHeight: 32 },
  navArrow: {
    position: 'absolute',
    top: '42%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  navArrowLeft: { left: 10 },
  navArrowRight: { right: 10 },
  navArrowDisabled: { opacity: 0.4 },
  pageDots: { position: 'absolute', bottom: 90, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: '#1D4ED8', width: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#444', lineHeight: 20 },
  modalError: { fontSize: 13, color: '#DC2626', marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  modalCancelText: { color: '#333', fontWeight: '600' },
  modalDeleteButton: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' },
  modalDeleteText: { color: '#fff', fontWeight: '700' },
});

