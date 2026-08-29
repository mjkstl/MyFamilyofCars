import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useCars } from '@/hooks/useCars';
import type { Car } from '@/types/database';

type Props = { route: RouteProp<RootStackParamList, 'ReorderCars'> };

export default function CarReorderScreen({ route }: Props) {
  const { member } = route.params;
  const { cars, loading, reorderCars } = useCars(member.id);
  const [localOrder, setLocalOrder] = useState<Car[]>([]);
  const [saving, setSaving] = useState(false);

  // Keep a local copy so drag reordering and the arrow buttons can update
  // the on-screen order instantly, without waiting on a round-trip.
  useEffect(() => {
    setLocalOrder(cars);
  }, [cars]);

  const persist = async (next: Car[]) => {
    setLocalOrder(next);
    setSaving(true);
    try {
      await reorderCars(next.map((c) => c.id));
    } finally {
      setSaving(false);
    }
  };

  const moveBy = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localOrder.length) return;
    const next = [...localOrder];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    persist(next);
  };

  if (loading && localOrder.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.heading}>Reorder {member.display_name}'s cars</Text>
        <Text style={styles.subheading}>
          On a phone: press and hold {'\u2630'} to drag. Anywhere: use the arrows.
        </Text>
        {saving && <ActivityIndicator size="small" style={{ marginTop: 6 }} />}
      </View>

      <DraggableFlatList
        data={localOrder}
        keyExtractor={(car) => car.id}
        onDragEnd={({ data }) => persist(data)}
        renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<Car>) => {
          const index = getIndex() ?? 0;
          return (
            <ScaleDecorator>
              <View style={[styles.row, isActive && styles.rowActive]}>
                <Pressable
                  accessibilityLabel="Drag to reorder"
                  onLongPress={drag}
                  disabled={saving}
                  style={styles.dragHandle}
                >
                  <MaterialCommunityIcons name="drag-horizontal-variant" size={22} color="#9CA3AF" />
                </Pressable>

                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]} />
                )}

                <Text style={styles.rowText} numberOfLines={1}>
                  {item.year} {item.make} {item.model}
                </Text>

                <View style={styles.arrowGroup}>
                  <Pressable
                    accessibilityLabel="Move up"
                    onPress={() => moveBy(index, -1)}
                    disabled={index === 0 || saving}
                    style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                  >
                    <MaterialCommunityIcons name="chevron-up" size={20} color={index === 0 ? '#ccc' : '#1D4ED8'} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Move down"
                    onPress={() => moveBy(index, 1)}
                    disabled={index === localOrder.length - 1 || saving}
                    style={[styles.arrowButton, index === localOrder.length - 1 && styles.arrowDisabled]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={20}
                      color={index === localOrder.length - 1 ? '#ccc' : '#1D4ED8'}
                    />
                  </Pressable>
                </View>
              </View>
            </ScaleDecorator>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No cars to reorder yet.</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingBottom: 8 },
  heading: { fontSize: 18, fontWeight: '800' },
  subheading: { fontSize: 12, color: '#888', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 10,
  },
  rowActive: { borderColor: '#1D4ED8', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  dragHandle: { padding: 4 },
  thumb: { width: 48, height: 36, borderRadius: 6, backgroundColor: '#eee' },
  thumbFallback: {},
  rowText: { flex: 1, fontSize: 14, fontWeight: '600' },
  arrowGroup: { gap: 2 },
  arrowButton: { padding: 2 },
  arrowDisabled: { opacity: 0.4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});
