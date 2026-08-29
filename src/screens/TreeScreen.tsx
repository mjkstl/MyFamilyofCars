import React, { useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, SafeAreaView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import MemberEditModal from '@/components/MemberEditModal';
import AppLogoHeader from '@/components/AppLogoHeader';
import FamilyPoster from '@/components/FamilyPoster';
import type { TreeStackParamList, RootStackParamList } from '@/navigation/RootNavigator';
import type { Member } from '@/types/database';

// ReorderCars lives on the root stack, one level above this screen's own
// TreeStack — composing both param lists lets navigation.navigate(...)
// reach it with full type-checking, matching how it actually resolves at
// runtime (React Navigation bubbles unresolved route names upward).
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<TreeStackParamList, 'TreeHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SCROLL_PAGE_SIZE = 420;

export default function TreeScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useFamily();
  const { members, loading, updateMember } = useMembers(family?.id);
  const { cars: allCars } = useAllFamilyCars(family?.id);
  const posterRef = useRef<View>(null);
  const listRef = useRef<FlatList>(null);
  const [sharing, setSharing] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  // Drives the up/down scroll-arrow pair below.
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const canScrollUp = scrollY > 4;
  const canScrollDown = scrollY + viewportHeight < contentHeight - 4;
  const showArrows = contentHeight > viewportHeight + 4;

  const scrollByPage = (direction: 1 | -1) => {
    const nextOffset = Math.max(0, scrollY + direction * SCROLL_PAGE_SIZE);
    listRef.current?.scrollToOffset({ offset: nextOffset, animated: true });
  };

  const carsByMember = (memberId: string) => allCars.filter((c) => c.member_id === memberId);

  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(posterRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Sharing unavailable', 'Sharing isn\u2019t supported on this device/browser.');
      }
    } catch (err) {
      Alert.alert('Couldn\u2019t create poster', err instanceof Error ? err.message : String(err));
    } finally {
      setSharing(false);
    }
  };

  const handleSaveMember = async (displayName: string, avatarUri: string | null) => {
    if (!editingMember) return;
    setSavingMember(true);
    try {
      await updateMember(editingMember.id, displayName, avatarUri);
      setEditingMember(null);
    } catch (err) {
      Alert.alert('Couldn\u2019t save', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingMember(false);
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
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
        data={members}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        ListHeaderComponent={
          <>
            <AppLogoHeader />
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
          <MemberTile
            member={item}
            cars={carsByMember(item.id)}
            onPress={() => navigation.navigate('MemberCarousel', { member: item })}
            onEdit={() => setEditingMember(item)}
            onReorder={() => navigation.navigate('ReorderCars', { member: item })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No family members yet — add someone from the Family tab.</Text>
        }
      />

      {showArrows && (
        <View style={styles.scrollArrows}>
          <Pressable
            accessibilityLabel="Scroll up"
            onPress={() => scrollByPage(-1)}
            disabled={!canScrollUp}
            style={[styles.scrollArrowButton, !canScrollUp && styles.scrollArrowDisabled]}
          >
            <MaterialCommunityIcons name="chevron-up" size={26} color={canScrollUp ? '#1D4ED8' : '#ccc'} />
          </Pressable>
          <Pressable
            accessibilityLabel="Scroll down"
            onPress={() => scrollByPage(1)}
            disabled={!canScrollDown}
            style={[styles.scrollArrowButton, !canScrollDown && styles.scrollArrowDisabled]}
          >
            <MaterialCommunityIcons name="chevron-down" size={26} color={canScrollDown ? '#1D4ED8' : '#ccc'} />
          </Pressable>
        </View>
      )}

      <MemberEditModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSaveMember}
        saving={savingMember}
      />

      {/* Rendered off-screen, only used as a source for captureRef above. */}
      <View style={styles.offscreen}>
        <FamilyPoster ref={posterRef} familyName={family?.name ?? 'Our Family'} cars={allCars} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { justifyContent: 'flex-start', gap: 20 },
  familyName: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 14, marginBottom: 10 },
  shareButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
  scrollArrows: { position: 'absolute', right: 16, bottom: 20, gap: 8 },
  scrollArrowButton: {
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
  scrollArrowDisabled: { opacity: 0.5 },
});
