import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '@/theme/tokens';

const logo = require('../../assets/logo.png');

/**
 * The brand mark (a road that branches into a family tree), with an
 * optional "My Family of Cars" wordmark beneath it.
 *
 *   default  — 112px mark, for a screen whose whole job is the brand
 *   compact  — 84px mark (onboarding, success moments)
 *   small    — 56px mark for the top of a working screen, where the
 *              content, not the logo, should own the first screenful
 *
 * The wordmark is real text rather than part of the image, so it stays
 * sharp at any size, respects the user's text-size setting and is read
 * out by screen readers.
 */
export default function AppLogoHeader({
  compact = false,
  small = false,
  withWordmark = false,
}: {
  compact?: boolean;
  small?: boolean;
  withWordmark?: boolean;
}) {
  const size = small ? 56 : compact ? 84 : 112;
  return (
    <View style={styles.header}>
      <Image
        source={logo}
        style={{ width: size, height: size }}
        resizeMode="contain"
        // With the wordmark shown, the text names the app — hiding the
        // image from screen readers avoids announcing it twice.
        accessible={!withWordmark}
        accessibilityLabel="My Family of Cars"
      />
      {withWordmark ? (
        <Text style={styles.wordmark} accessibilityRole="header">
          My Family of Cars
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: font.brandFamily,
    fontSize: font.title,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: space.sm,
    letterSpacing: 0.2,
  },
});
