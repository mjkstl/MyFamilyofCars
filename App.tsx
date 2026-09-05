import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from '@/navigation/RootNavigator';
import { supabaseConfigError } from '@/lib/supabase';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {supabaseConfigError ? (
          <View style={styles.errorScreen}>
            <Text style={styles.errorTitle}>Configuration error</Text>
            <Text style={styles.errorMessage}>{supabaseConfigError}</Text>
          </View>
        ) : (
          <RootNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FEF2F2',
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#B91C1C', marginBottom: 12 },
  errorMessage: { fontSize: 14, color: '#7F1D1D', lineHeight: 21, textAlign: 'center', maxWidth: 480 },
});
