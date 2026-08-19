import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const logo = require('../../assets/logo.png');

export default function AppLogoHeader() {
  return (
    <View style={styles.header}>
      <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="My Family of Cars logo" />
      <Text style={styles.banner}>
        Create your family, add your wheels, and share with your friends & family to create your Family of Cars!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 500,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logo: { width: 420, height: 410, maxWidth: '92%' },
  banner: { maxWidth: 720, paddingHorizontal: 20, color: '#0F172A', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
});
