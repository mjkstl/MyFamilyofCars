import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../assets/logo.png');

export default function AppLogoHeader({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.header, compact && styles.compactHeader]}>
      <Image
        source={logo}
        style={[styles.logo, compact && styles.compactLogo]}
        resizeMode="contain"
        accessibilityLabel="My Family of Cars logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 250,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logo: { width: 210, height: 205, maxWidth: '92%' },
  compactHeader: { minHeight: 0, paddingVertical: 0, borderBottomWidth: 0, backgroundColor: 'transparent' },
  compactLogo: { width: 170, height: 170 },
});
