import React, { useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, SafeAreaView, Pressable, Alert, Share, TextInput, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import MemberEditModal from '@/components/MemberEditModal';
import AppLogoHeader from '@/components/AppLogoHeader';
import FamilyPoster from '@/components/FamilyPoster';
import CarCard from '@/components/CarCard';
import type { TreeStackParamList, RootStackParamList } from '@/navigation/RootNavigator';
import type { CarStatus, Member } from '@/types/database';

// ReorderCars lives on the root stack, one level above this screen's own
// TreeStack — composing both param lists lets navigation.navigate(...)
// reach it with full type-checking, matching how it actually resolves at
// runtime (React Navigation bubbles unresolved route names upward).
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<TreeStackParamList, 'TreeHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SCROLL_PAGE_SIZE = 420;

export default function MyTreeScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useFamily();
  const { members, loading, updateMember } = useMembers(family?.id);
  const { cars: allCars } = useAllFamilyCars(family?.id);
  const posterRef = useRef<View>(null);
  const listRef = useRef<FlatList>(null);
  const [sharing, setSharing] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CarStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Drives the up/down scroll-arrow pair below.
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const canScrollUp = scrollY > 4;
  const canScrollDown = scrollY + viewportHeight < contentHeight - 4;
  const showArrows = contentHeight > viewportHeight + 4;
  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allCars.filter((car) => {
      const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
      const matchesSearch =
        !query ||
        `${car.year} ${car.make} ${car.model} ${car.nickname ?? ''} ${car.member_display_name}`
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [allCars, search, statusFilter]);

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
      await Share.share(
        {
          message: `Our family cars on My Family of Cars${family?.name ? ` — ${family.name}` : ''}`,
          url: uri,
        },
        { dialogTitle: 'Share My Family of Cars', subject: 'My Family of Cars' },
      );
    } catch (err) {
      Alert.alert('Couldn\u2019t create poster', err instanceof Error ? err.message : String(err));
    } finally {
      setSharing(false);
    }
  };

  const handleInviteFamily = async () => {
    if (!family?.invite_code) {
      Alert.alert('Invite unavailable', 'Your family invite code is not ready yet.');
      return;
    }
    try {
      setCopied(false);
      setInviteOpen(true);
    } catch (err) {
      Alert.alert('Couldn\u2019t share invite', err instanceof Error ? err.message : String(err));
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
            <Pressable style={styles.shareButton} onPress={handleInviteFamily}>
              <Text style={styles.shareButtonText}>Invite family</Text>
            </Pressable>
            <Text style={styles.inviteNote}>Invitees can add their cars and memories. Collections remain private by default.</Text>
            {allCars.length > 0 && (
              <View style={styles.collectionSection}>
                <Text style={styles.collectionTitle}>Collection</Text>
                <View style={styles.filterRow}>
                  {([
                    ['all', 'All'],
                    ['current', 'Currently Driving'],
                    ['memory', 'Memories'],
                    ['dream', 'Dream Cars'],
                  ] as const).map(([value, label]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: statusFilter === value }}
                      onPress={() => setStatusFilter(value)}
                      style={[styles.filterButton, statusFilter === value && styles.filterButtonActive]}
                    >
                      <Text style={[styles.filterText, statusFilter === value && styles.filterTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {allCars.length >= 8 && (
                  <TextInput
                    accessibilityLabel="Search collection"
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search cars or people"
                    style={styles.searchInput}
                  />
                )}
                {filteredCars.length === 0 ? (
                  <Text style={styles.emptyCollection}>No cars match this filter.</Text>
                ) : (
                  <View style={styles.collectionGrid}>
                    {filteredCars.map((car) => {
                      const member = members.find((item) => item.id === car.member_id);
                      return (
                        <Pressable
                          key={car.id}
                          accessibilityLabel={`View ${car.year} ${car.make} ${car.model} for ${car.member_display_name}`}
                          onPress={() => member && navigation.navigate('MemberCarousel', { member })}
                        >
                          <CarCard car={car} fact={null} />
                          <Text style={styles.connectedLabel}>Connected to {car.member_display_name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
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

      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>Invite family</Text>
            <Text style={styles.inviteBody}>Invitees can add their cars and memories. Your collection remains private by default.</Text>
            <Text style={styles.inviteCodeLabel}>Invite code</Text>
            <Text style={styles.inviteCode} selectable>{family?.invite_code}</Text>
            <Pressable
              style={styles.copyButton}
              onPress={async () => {
                if (family?.invite_code) {
                  await Clipboard.setStringAsync(family.invite_code);
                  setCopied(true);
                }
              }}
            >
              <Text style={styles.shareButtonText}>{copied ? 'Copied' : 'Copy invite code'}</Text>
            </Pressable>
            <Pressable
              style={styles.shareInviteButton}
              onPress={() => Share.share({ message: `Join my family on My Family of Cars! Use invite code: ${family?.invite_code}` })}
            >
              <Text style={styles.shareInviteText}>Share invite</Text>
            </Pressable>
            <Pressable onPress={() => setInviteOpen(false)}>
              <Text style={styles.cancelInviteText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  familyName: { fontFamily: 'Trebuchet MS', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 14, marginBottom: 10 },
  shareButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inviteNote: { color: '#64748B', fontSize: 12, lineHeight: 17, textAlign: 'center', marginBottom: 14 },
  collectionSection: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14, marginBottom: 14 },
  collectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterButton: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#fff' },
  filterButtonActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  filterText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  searchInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, marginTop: 10, backgroundColor: '#fff' },
  emptyCollection: { color: '#64748B', paddingVertical: 16 },
  collectionGrid: { gap: 12, marginTop: 12 },
  connectedLabel: { color: '#475569', fontSize: 12, fontWeight: '600', marginTop: -8, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 20 },
  inviteCard: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  inviteTitle: { fontSize: 21, fontWeight: '800', color: '#0F172A' },
  inviteBody: { color: '#475569', lineHeight: 19, marginTop: 8 },
  inviteCodeLabel: { color: '#64748B', fontSize: 12, marginTop: 18 },
  inviteCode: { fontSize: 26, fontWeight: '800', letterSpacing: 2, marginTop: 4, color: '#0F172A' },
  copyButton: { backgroundColor: '#1D4ED8', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 18 },
  shareInviteButton: { borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  shareInviteText: { color: '#1D4ED8', fontWeight: '700' },
  cancelInviteText: { color: '#64748B', textAlign: 'center', marginTop: 16 },
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
