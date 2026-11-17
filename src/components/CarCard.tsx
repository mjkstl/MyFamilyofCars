import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Car, CarFact } from '@/types/database';
import { getColorHex } from '@/utils/carColors';
import { openVehicleSearch } from '@/utils/vehicleSearch';
import { CAR_STATUS_META } from '@/config/carStatus';
import { colors, font, radius, space, cardShadow, MIN_TAP } from '@/theme/tokens';

/**
 * One car, shown large — the page of a member's swipeable car screen.
 *
 * Layout order follows what a family member cares about: the photo
 * first and big, then which car it is, then the story. Actions sit at
 * the bottom, with the outbound "for sale" search last and quietest.
 *
 * `width` comes from the screen (not a module-level Dimensions read) so
 * the card resizes correctly on rotation, on tablets and on web.
 */
export default function CarCard({
  car,
  fact,
  width,
  onEdit,
  onDelete,
}: {
  car: Car;
  fact: CarFact | null;
  width: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [factExpanded, setFactExpanded] = useState(false);
  const status = CAR_STATUS_META[car.status];
  const carName = `${car.year} ${car.make} ${car.model}`;

  return (
    <View style={[styles.card, { width }]}>
      {car.photo_url ? (
        <Image
          source={{ uri: car.photo_url }}
          style={styles.photo}
          resizeMode="contain"
          accessibilityLabel={`Photo of the ${carName}`}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add a photo of the ${carName}`}
          style={[styles.photo, styles.photoFallback]}
          onPress={onEdit}
          disabled={!onEdit}
        >
          <MaterialCommunityIcons name="image-plus" size={30} color={colors.primary} />
          <Text style={styles.photoFallbackText}>{onEdit ? 'Add a photo' : 'No photo yet'}</Text>
        </Pressable>
      )}

      {car.photo_quality_status === 'flagged' && (
        <View style={styles.flagBanner}>
          <Text style={styles.flagBannerText}>This photo may not show a vehicle — edit the car to replace it.</Text>
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">{carName}</Text>
      {car.nickname ? <Text style={styles.nickname}>“{car.nickname}”</Text> : null}

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons name={status.icon} size={13} color={status.fg} />
          <Text style={[styles.statusBadgeText, { color: status.fg }]}>{status.label}</Text>
        </View>
        {car.color ? (
          <View style={styles.colorRow}>
            <View style={[styles.swatch, { backgroundColor: getColorHex(car.color) }]} />
            <Text style={styles.metaText}>{car.color}</Text>
          </View>
        ) : null}
        {car.trim ? <Text style={styles.metaText}>{car.trim}</Text> : null}
      </View>

      {car.memories ? (
        <View style={styles.storyBox}>
          <Text style={styles.storyLabel}>The story</Text>
          <Text style={styles.storyText}>{car.memories}</Text>
        </View>
      ) : onEdit ? (
        <Pressable accessibilityRole="button" style={styles.addStory} onPress={onEdit}>
          <MaterialCommunityIcons name="pencil-plus-outline" size={18} color={colors.accent} />
          <Text style={styles.addStoryText}>Add this car’s story</Text>
        </Pressable>
      ) : null}

      {car.fun_fact ? (
        <View style={styles.funFactBox}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.funFactText}>{car.fun_fact}</Text>
        </View>
      ) : null}

      {fact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: factExpanded }}
          style={styles.factBox}
          onPress={() => setFactExpanded((v) => !v)}
        >
          <Text style={styles.factLabel}>Did you know?</Text>
          <Text style={styles.factText} numberOfLines={factExpanded ? undefined : 2}>
            {fact.fact_text}
          </Text>
        </Pressable>
      ) : null}

      {(onEdit || onDelete) && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit the ${carName}`} style={styles.editButton} onPress={onEdit}>
              <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete the ${carName}`} style={styles.deleteButton} onPress={onDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`See ${carName} cars for sale`}
        style={styles.saleLink}
        onPress={() => void openVehicleSearch(car.make, car.model, car.year, car.trim, car.color)}
      >
        <Text style={styles.saleLinkText}>See ones like it for sale</Text>
        <MaterialCommunityIcons name="open-in-new" size={14} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    ...cardShadow,
  },
  photo: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginBottom: space.lg },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  photoFallbackText: { color: colors.primary, fontSize: font.label, fontWeight: '700' },
  flagBanner: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: space.sm, marginBottom: space.md },
  flagBannerText: { color: colors.accent, fontSize: font.small },
  title: { fontFamily: font.brandFamily, fontSize: font.title, fontWeight: '800', color: colors.ink },
  nickname: { fontSize: font.label, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md, marginTop: space.md },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.pill,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  statusBadgeText: { fontSize: font.tiny, fontWeight: '700' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.borderStrong },
  metaText: { fontSize: font.small, color: colors.text },
  storyBox: { marginTop: space.lg, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md },
  storyLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.accent, marginBottom: space.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  storyText: { fontSize: font.body, color: colors.ink, lineHeight: 23 },
  addStory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: MIN_TAP,
    marginTop: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  addStoryText: { color: colors.accent, fontSize: font.label, fontWeight: '700' },
  funFactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginTop: space.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  funFactText: { flex: 1, fontSize: font.small, color: colors.primaryDark, lineHeight: 19 },
  factBox: { marginTop: space.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md },
  factLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.muted, marginBottom: space.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  factText: { fontSize: font.small, color: colors.text, lineHeight: 19 },
  actionsRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  editButton: {
    flex: 1,
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  editButtonText: { color: colors.primary, fontSize: font.label, fontWeight: '700' },
  deleteButton: {
    flex: 1,
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
  },
  deleteButtonText: { color: colors.danger, fontSize: font.label, fontWeight: '700' },
  saleLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: MIN_TAP, marginTop: space.sm },
  saleLinkText: { color: colors.accent, fontSize: font.small, fontWeight: '600' },
});
