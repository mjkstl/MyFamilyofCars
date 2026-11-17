import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator, SafeAreaView, Pressable, TextInput, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';

import { useFamily } from '@/hooks/useFamily';
import { useMembers } from '@/hooks/useMembers';
import { useAllFamilyCars } from '@/hooks/useAllFamilyCars';
import MemberTile from '@/components/MemberTile';
import MemberEditModal from '@/components/MemberEditModal';
import AddFamilyMemberModal from '@/components/AddFamilyMemberModal';
import AppLogoHeader from '@/components/AppLogoHeader';
import CollectionCarRow from '@/components/CollectionCarRow';
import ConfirmModal from '@/components/ConfirmModal';
import type { TreeStackParamList, RootStackParamList } from '@/navigation/RootNavigator';
import type { CarStatus, Member } from '@/types/database';
import { CARS_COLLECTION_CONFIG } from '@/config/collectionTypes';
import { trackEvent } from '@/services/analytics';
import { buildInviteUrl, shareInvite } from '@/utils/inviteLink';
import { colors, font, radius, space, MIN_TAP } from '@/theme/tokens';

// ReorderCars lives on the root stack, one level above this screen's own
// TreeStack — composing both param lists lets navigation.navigate(...)
// reach it with full type-checking, matching how it actually resolves at
// runtime (React Navigation bubbles unresolved route names upward).
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<TreeStackParamList, 'TreeHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function MyTreeScreen() {
  const navigation = useNavigation<Nav>();
  const { family, currentMember, rotateInvite } = useFamily();
  const { members, loading, addMemberWithInference, updateMember } = useMembers(family?.id);
  const { cars: allCars, refresh: refreshCars } = useAllFamilyCars(family?.id);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CarStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [savingNewMember, setSavingNewMember] = useState(false);
  // Errors render ON SCREEN rather than through Alert.alert(): an Alert
  // shows nothing at all on React Native Web, so a failure there used to
  // be completely invisible.
  const [screenError, setScreenError] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void refreshCars();
    }, [refreshCars]),
  );

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

  const carsByMember = (memberId: string) => allCars.filter((c) => c.member_id === memberId);

  // The Add Car tab lives on the tab navigator, one level above this
  // screen's stack — getParent() is that tab navigator.
  const goToAddCar = () => navigation.getParent()?.navigate('Add Car' as never);

  const openInvite = () => {
    if (!family?.invite_token) {
      setScreenError('Your family invite is not ready yet. Close and reopen the app, then try again.');
      return;
    }
    setInviteNotice(null);
    setInviteOpen(true);
    // Analytics must never block or break the invite itself.
    void trackEvent('invite_opened', {}, family.id).catch(() => undefined);
    if (allCars.some((car) => car.photo_url || car.memories)) {
      void trackEvent('activation_completed', {}, family.id).catch(() => undefined);
    }
  };

  const handleShareInvite = async () => {
    if (!family?.invite_token) return;
    try {
      const result = await shareInvite(family.invite_token);
      if (result === 'copied') setInviteNotice('Invite link copied — paste it into a text or email.');
    } catch (err) {
      setInviteNotice(`Couldn’t share the invite: ${describeError(err)}`);
    }
  };

  const handleCopyInvite = async () => {
    if (!family?.invite_token) return;
    try {
      await Clipboard.setStringAsync(buildInviteUrl(family.invite_token));
      setInviteNotice('Invite link copied — paste it into a text or email.');
    } catch (err) {
      setInviteNotice(`Couldn’t copy the link: ${describeError(err)}`);
    }
  };

  const confirmRotateInvite = async () => {
    if (!family) return;
    setRotating(true);
    setRotateError(null);
    try {
      await rotateInvite(family.id);
      setRotateConfirmOpen(false);
      setInviteNotice('Done — the old link no longer works. Share the new one below.');
    } catch (err) {
      setRotateError(describeError(err));
    } finally {
      setRotating(false);
    }
  };

  const handleSaveMember = async (displayName: string, avatarUri: string | null) => {
    if (!editingMember) return;
    setSavingMember(true);
    try {
      await updateMember(editingMember.id, displayName, avatarUri);
      setEditingMember(null);
    } catch (err) {
      setEditingMember(null);
      setScreenError(`Couldn’t save that family member: ${describeError(err)}`);
    } finally {
      setSavingMember(false);
    }
  };

  const handleAddMember = async (displayName: string, relationship: string) => {
    if (!family || !currentMember) return;
    setSavingNewMember(true);
    try {
      await addMemberWithInference({
        displayName,
        relationshipLabel: relationship,
        enteredByMemberId: currentMember.id,
      });
      setAddMemberOpen(false);
    } catch (err) {
      setAddMemberOpen(false);
      setScreenError(`Couldn’t add that family member: ${describeError(err)}`);
    } finally {
      setSavingNewMember(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const memberCountLabel = `${members.length} ${members.length === 1 ? 'family member' : 'family members'}`;
  const carCountLabel = `${allCars.length} ${allCars.length === 1 ? 'car' : 'cars'}`;

  const header = (
    <View>
      {/* Identity strip: a small logo beside the family name, so the
          first screenful belongs to the family rather than to a 250px
          banner. */}
      <View style={styles.identityRow}>
        <AppLogoHeader small />
        <View style={styles.identityText}>
          <Text style={styles.familyName} numberOfLines={2} accessibilityRole="header">{family?.name}</Text>
          <Text style={styles.counts} accessibilityLabel={`${memberCountLabel} and ${carCountLabel}`}>
            {memberCountLabel} · {carCountLabel}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.settingsButton}
          hitSlop={6}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {screenError ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>{screenError}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={10} onPress={() => setScreenError(null)}>
            <MaterialCommunityIcons name="close" size={18} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}

      {/* One primary action (invite — the growth loop) and one secondary. */}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" style={[styles.actionButton, styles.actionPrimary]} onPress={openInvite}>
          <MaterialCommunityIcons name="account-multiple-plus" size={18} color={colors.white} />
          <Text style={styles.actionPrimaryText} numberOfLines={1}>Invite family</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={[styles.actionButton, styles.actionSecondary]} onPress={() => setAddMemberOpen(true)}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={styles.actionSecondaryText} numberOfLines={1}>Add member</Text>
        </Pressable>
      </View>

      {allCars.length === 0 ? (
        <View style={styles.firstCarCard}>
          <Text style={styles.firstCarTitle}>Start with one car</Text>
          <Text style={styles.firstCarBody}>
            Your first car, the family wagon, the one that got away — add it and the tree starts to grow.
          </Text>
          <Pressable accessibilityRole="button" style={styles.firstCarButton} onPress={goToAddCar}>
            <Text style={styles.actionPrimaryText}>Add your first car</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle} accessibilityRole="header">Family</Text>
    </View>
  );

  const footer =
    allCars.length > 0 ? (
      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">All cars</Text>
        <View style={styles.filterRow}>
          {CARS_COLLECTION_CONFIG.filters.map(({ value, label }) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === value }}
              onPress={() => setStatusFilter(value)}
              hitSlop={6}
              style={[styles.filterButton, statusFilter === value && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, statusFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {allCars.length >= 8 && (
          <TextInput
            accessibilityLabel="Search cars or people"
            value={search}
            onChangeText={setSearch}
            placeholder="Search cars or people"
            placeholderTextColor={colors.faint}
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
                  accessibilityRole="button"
                  accessibilityLabel={`View ${car.year} ${car.make} ${car.model} for ${car.member_display_name}`}
                  onPress={() => member && navigation.navigate('MemberCarousel', { member })}
                >
                  <CollectionCarRow car={car} memberName={car.member_display_name} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    ) : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        style={styles.listFrame}
        data={members}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <MemberTile
            member={item}
            cars={carsByMember(item.id)}
            onPress={() => navigation.navigate('MemberCarousel', { member: item })}
            onEdit={() => setEditingMember(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No family members yet — tap “Add member” above to add someone.</Text>
        }
      />

      <MemberEditModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSaveMember}
        saving={savingMember}
      />
      <AddFamilyMemberModal
        visible={addMemberOpen}
        saving={savingNewMember}
        onClose={() => setAddMemberOpen(false)}
        onSave={handleAddMember}
      />

      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.inviteCard} accessibilityViewIsModal>
            <Text style={styles.inviteTitle} accessibilityRole="header">Invite your family</Text>
            <Text style={styles.inviteBody}>
              Send this link to a relative. Opening it lets them join and add the cars they’ve owned. Your family stays private — only people you invite can see it.
            </Text>

            <Pressable accessibilityRole="button" style={styles.invitePrimary} onPress={() => void handleShareInvite()}>
              <MaterialCommunityIcons name="share-variant" size={18} color={colors.white} />
              <Text style={styles.actionPrimaryText}>Share invite link</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.inviteSecondary} onPress={() => void handleCopyInvite()}>
              <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
              <Text style={styles.actionSecondaryText}>Copy link</Text>
            </Pressable>

            {inviteNotice ? <Text style={styles.inviteNotice} accessibilityRole="alert">{inviteNotice}</Text> : null}

            {/* The raw token is a 48-character string nobody should have
                to type, so it is a small fallback rather than the
                headline. It stays selectable for copy/paste. */}
            <Text style={styles.inviteCodeLabel}>Or paste this invite code on the “Join a family” screen</Text>
            <Text style={styles.inviteCode} selectable>{family?.invite_token}</Text>

            <Pressable
              accessibilityRole="button"
              style={styles.rotateInviteButton}
              onPress={() => {
                setRotateError(null);
                setRotateConfirmOpen(true);
              }}
            >
              <Text style={styles.rotateInviteText}>Reset invite link</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.closeInviteButton} onPress={() => setInviteOpen(false)}>
              <Text style={styles.cancelInviteText}>Close</Text>
            </Pressable>
          </View>
        </View>

        {/* Rendered INSIDE the invite modal so it stacks above it on iOS,
            where two sibling modals cannot be shown at the same time. */}
        <ConfirmModal
          visible={rotateConfirmOpen}
          title="Reset the invite link?"
          body="Anyone holding the old link or code will no longer be able to join with it. People who already joined are not affected. This can’t be undone."
          confirmLabel="Reset link"
          destructive
          busy={rotating}
          error={rotateError}
          onConfirm={() => void confirmRotateInvite()}
          onCancel={() => setRotateConfirmOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  // maxWidth keeps the layout phone-shaped on desktop web / tablets.
  listFrame: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  list: { padding: space.lg, paddingBottom: space.xxl },
  row: { justifyContent: 'space-between' },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  identityText: { flex: 1 },
  settingsButton: { width: MIN_TAP, height: MIN_TAP, borderRadius: MIN_TAP / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  familyName: { fontFamily: font.brandFamily, fontSize: font.display, fontWeight: '800', color: colors.ink },
  counts: { color: colors.muted, fontSize: font.small, fontWeight: '600', marginTop: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: font.small, lineHeight: 19 },

  actionRow: { flexDirection: 'row', gap: space.md, marginBottom: space.xl },
  actionButton: {
    flex: 1,
    minHeight: MIN_TAP + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    // Kept tight so both labels stay on one line on a 320pt-wide phone.
    paddingHorizontal: space.sm,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: { color: colors.white, fontWeight: '700', fontSize: font.label },
  actionSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  actionSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: font.label },

  firstCarCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  firstCarTitle: { fontSize: font.heading, fontWeight: '800', color: colors.ink },
  firstCarBody: { fontSize: font.label, color: colors.text, lineHeight: 20, marginTop: space.xs },
  firstCarButton: {
    minHeight: MIN_TAP,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
  },

  sectionTitle: { fontSize: font.heading, fontWeight: '800', color: colors.ink, marginBottom: space.md },

  collectionSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.xl, marginTop: space.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  filterButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
    backgroundColor: colors.surface,
    fontSize: font.body,
    color: colors.ink,
  },
  emptyCollection: { color: colors.muted, paddingVertical: space.lg },
  collectionGrid: { gap: space.md, marginTop: space.md },
  empty: { textAlign: 'center', color: colors.muted, marginTop: space.xl, marginBottom: space.xl },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  inviteCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, width: '100%', maxWidth: 420 },
  inviteTitle: { fontSize: font.title, fontWeight: '800', color: colors.ink },
  inviteBody: { color: colors.text, fontSize: font.label, lineHeight: 20, marginTop: space.sm },
  invitePrimary: {
    minHeight: MIN_TAP + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: space.xl,
  },
  inviteSecondary: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginTop: space.sm,
  },
  inviteNotice: { color: colors.success, fontSize: font.small, fontWeight: '600', marginTop: space.md, lineHeight: 18 },
  inviteCodeLabel: { color: colors.muted, fontSize: font.tiny, marginTop: space.xl },
  inviteCode: {
    fontSize: font.tiny,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: space.sm,
    marginTop: space.xs,
    lineHeight: 18,
  },
  rotateInviteButton: { minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', marginTop: space.md },
  rotateInviteText: { color: colors.danger, fontWeight: '600', fontSize: font.small },
  closeInviteButton: { minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  cancelInviteText: { color: colors.muted, fontSize: font.label, fontWeight: '600' },
});
