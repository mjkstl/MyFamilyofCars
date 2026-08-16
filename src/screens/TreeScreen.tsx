import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, SafeAreaView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import FamilyPoster from '@/components/FamilyPoster';
import type { TreeStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<TreeStackParamList, 'TreeHome'>;

export default function TreeScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useFamily();
  const { members, loading } = useMembers(family?.id);
  const { cars: allCars } = useAllFamilyCars(family?.id);
  const posterRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleSharePoster = async () => {
    if (!posterRef.current || allCars.length === 0) {
      Alert.alert('Nothing to share yet', 'Add at least one car before sharing the family poster.');
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(posterRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your family of cars' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing isn\u2019t supported on this device.');
      }
    } catch (err) {
      Alert.alert('Couldn\u2019t create poster', err instanceof Error ? err.message : String(err));
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.familyName}>{family?.name}</Text>
            <Pressable style={styles.shareButton} onPress={handleSharePoster} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shareButtonText}>Share My Family of Cars</Text>
              )}
            </Pressable>
          </>
        }
        renderItem={({ item }) => (
          <MemberTile member={item} onPress={() => navigation.navigate('MemberCarousel', { member: item })} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No family members yet — add someone from the Family tab.</Text>
        }
      />

      {/* Off-screen poster, captured by handleSharePoster above. Positioned
          far off-canvas rather than unmounted, since captureRef needs a
          laid-out native view to snapshot. */}
      <View style={styles.offscreen} pointerEvents="none">
        <FamilyPoster ref={posterRef} familyName={family?.name ?? ''} cars={allCars} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { justifyContent: 'space-between' },
  familyName: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  shareButton: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 20 },
  shareButtonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
});
