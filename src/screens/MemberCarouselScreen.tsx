import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  const { cars, loading, deleteCar } = useCars(member.id);
  const [factsByCarId, setFactsByCarId] = useState<Record<string, CarFact | null>>({});

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

  const handleDeleteCar = (car: Car) => {
    Alert.alert(
      'Delete this car?',
      `${car.year} ${car.make} ${car.model} will be permanently removed from ${member.display_name}'s carousel. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCar(car.id);
            } catch (err) {
              Alert.alert('Couldn\u2019t delete', err instanceof Error ? err.message : String(err));
            }
          },
        },
      ]
    );
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
        horizontal
        data={cars}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        renderItem={({ item }) => (
          <CarCard
            car={item}
            fact={factsByCarId[item.id] ?? null}
            onEdit={() => handleEditCar(item)}
            onDelete={() => handleDeleteCar(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {member.display_name} doesn't have any cars yet — tap + to add one.
            </Text>
          </View>
        }
      />
      <Pressable
        accessibilityLabel={`Add a car for ${member.display_name}`}
        style={styles.fab}
        onPress={() => navigation.navigate('AddCarForMember', { member })}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, alignItems: 'center' },
  empty: { width: 280, padding: 20 },
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
});
