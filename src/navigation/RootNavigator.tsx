import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useFamily } from '@/hooks/useFamily';
import OnboardingScreen from '@/screens/OnboardingScreen';
import TreeScreen from '@/screens/TreeScreen';
import MemberCarouselScreen from '@/screens/MemberCarouselScreen';
import AddCarScreen from '@/screens/AddCarScreen';
import FamilyScreen from '@/screens/FamilyScreen';
import type { Member } from '@/types/database';

export type TreeStackParamList = {
  TreeHome: undefined;
  MemberCarousel: { member: Member };
};

const Tab = createBottomTabNavigator();
const TreeStack = createNativeStackNavigator<TreeStackParamList>();

function TreeStackNavigator() {
  return (
    <TreeStack.Navigator>
      <TreeStack.Screen name="TreeHome" component={TreeScreen} options={{ title: 'Family Tree' }} />
      <TreeStack.Screen
        name="MemberCarousel"
        component={MemberCarouselScreen}
        options={({ route }) => ({ title: route.params.member.display_name })}
      />
    </TreeStack.Navigator>
  );
}

export default function RootNavigator() {
  const { loading, family, currentMember, refresh } = useFamily();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!family || !currentMember) {
    return <OnboardingScreen onComplete={refresh} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Tree" component={TreeStackNavigator} />
        <Tab.Screen name="Add Car" component={AddCarScreen} />
        <Tab.Screen name="Family" component={FamilyScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
