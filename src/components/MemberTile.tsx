import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Member } from '@/types/database';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';
import { colors, font, radius, space, cardShadow } from '@/theme/tokens';

/** How many car thumbnails fit across one tile at phone width. The old
 * tile laid out four fixed 63px thumbs (270px) inside a ~160px tile, so
 * they spilled into the neighbouring column on a real phone. Three
 * flexible thumbs always fit, whatever the screen width. */
const MAX_THUMBS = 3;

export default function MemberTile({
  member,
  cars = [],
  onPress,
  onEdit,
}: {
  member: Member;
  cars?: FamilyCar[];
  onPress: () => void;
  onEdit?: () => void;
  /** No longer used by the tile (reordering lives on the member's own
   * car screen). Kept in the type only so the retired FamilyScreen,
   * which still passes it, keeps compiling. */
  onReorder?: () => void;
}) {
  const initials = member.display_name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const shown = cars.slice(0, MAX_THUMBS);
  const hiddenCount = cars.length - shown.length;
  const carCountLabel = cars.length === 0 ? 'No cars yet' : `${cars.length} ${cars.length === 1 ? 'car' : 'cars'}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${member.display_name}, ${carCountLabel}. Open their cars.`}
    >
      <View>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${member.display_name}`}
            style={styles.editBadge}
            hitSlop={10}
            onPress={onEdit}
          >
            <MaterialCommunityIcons name="pencil" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={1}>{member.display_name}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {member.relationship ? `${member.relationship} · ${carCountLabel}` : carCountLabel}
      </Text>

      {cars.length > 0 ? (
        <View style={styles.thumbRow}>
          {shown.map((car, index) => {
            const isLastWithMore = index === shown.length - 1 && hiddenCount > 0;
            return (
              <View key={car.id} style={styles.thumbFrame}>
                {car.photo_url ? (
                  <Image source={{ uri: car.photo_url }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbFallback}>
                    <MaterialCommunityIcons name="car-side" size={18} color={colors.faint} />
                  </View>
                )}
                {isLastWithMore ? (
                  <View style={styles.moreOverlay}>
                    <Text style={styles.moreText}>+{hiddenCount}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyStrip}>
          <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
          <Text style={styles.emptyStripText}>Add a car</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    marginBottom: space.md,
    ...cardShadow,
  },
  tilePressed: { opacity: 0.85 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: space.sm },
  avatarFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: colors.primaryDark, fontSize: 24, fontWeight: '800' },
  editBadge: {
    position: 'absolute',
    right: -6,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  name: { fontFamily: font.brandFamily, fontSize: font.body, fontWeight: '700', color: colors.ink, maxWidth: '100%' },
  meta: { fontSize: font.tiny, color: colors.muted, marginTop: 2, maxWidth: '100%' },
  thumbRow: { flexDirection: 'row', gap: space.xs, marginTop: space.md, alignSelf: 'stretch' },
  thumbFrame: { flex: 1, height: 40, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: colors.white, fontWeight: '800', fontSize: font.small },
  emptyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    alignSelf: 'stretch',
    height: 40,
    marginTop: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  emptyStripText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
});
