import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { FamilyCar } from '@/hooks/useAllFamilyCars';
import CollectionPhotoGallery from '@/components/CollectionPhotoGallery';
import { openVehicleSearch } from '@/utils/vehicleSearch';
import { colors, font, radius, space, cardShadow, MIN_TAP } from '@/theme/tokens';

const CARD_PADDING = space.lg;

export default function StoryCarCard({
  car,
  onPress,
  onEdit,
}: {
  car: FamilyCar;
  onPress: () => void;
  onEdit: () => void;
}) {
  // The photo gallery needs an exact pixel width (it pages horizontally).
  // Measuring the card itself, rather than guessing from the window
  // width, is what keeps the photo inside the card: the old guess
  // ignored the card's own padding, so photos overhung the right edge.
  const [innerWidth, setInnerWidth] = useState(0);
  const carName = `${car.year} ${car.make} ${car.model}`;

  return (
    <View
      style={styles.card}
      onLayout={(e) => setInnerWidth(Math.max(0, e.nativeEvent.layout.width - CARD_PADDING * 2 - 2))}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={`Open the ${carName}`} onPress={onPress}>
        {innerWidth > 0 ? (
          <CollectionPhotoGallery photos={car.photos} fallbackUrl={car.photo_url} width={innerWidth} height={190} />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}
        <Text style={styles.title}>{carName}</Text>
        {car.nickname ? <Text style={styles.nickname}>“{car.nickname}”</Text> : null}
        <View style={styles.personRow}>
          <MaterialCommunityIcons name="account" size={14} color={colors.primary} />
          <Text style={styles.person}>{car.member_display_name}</Text>
        </View>
        {car.memories ? (
          <Text style={styles.story} numberOfLines={5}>{car.memories}</Text>
        ) : null}
      </Pressable>

      {!car.memories ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Add the story of the ${carName}`} style={styles.addStory} onPress={onEdit}>
          <MaterialCommunityIcons name="pencil-plus-outline" size={18} color={colors.accent} />
          <Text style={styles.addStoryText}>Add this car’s story</Text>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit the ${carName}`} style={styles.footerLink} onPress={onEdit} hitSlop={6}>
          <MaterialCommunityIcons name="pencil" size={15} color={colors.primary} />
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`See ${carName} cars for sale`}
          style={styles.footerLink}
          hitSlop={6}
          onPress={() => void openVehicleSearch(car.make, car.model, car.year, car.trim, car.color)}
        >
          <Text style={styles.sale}>See ones like it for sale</Text>
          <MaterialCommunityIcons name="open-in-new" size={14} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: CARD_PADDING,
    marginBottom: space.lg,
    ...cardShadow,
  },
  photoPlaceholder: { height: 190, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  title: { fontFamily: font.brandFamily, color: colors.ink, fontSize: font.title, fontWeight: '800', marginTop: space.md },
  nickname: { color: colors.muted, fontSize: font.label, fontStyle: 'italic', marginTop: 2 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  person: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  story: { color: colors.text, fontSize: font.body, lineHeight: 24, marginTop: space.md },
  addStory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: MIN_TAP,
    marginTop: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  addStoryText: { color: colors.accent, fontSize: font.label, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space.lg,
    paddingTop: space.sm,
  },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: MIN_TAP },
  edit: { color: colors.primary, fontSize: font.label, fontWeight: '700' },
  sale: { color: colors.accent, fontSize: font.small, fontWeight: '600' },
});
