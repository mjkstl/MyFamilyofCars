import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFamily } from '@/hooks/useFamily';
import OnboardingScreen from '@/screens/OnboardingScreen';
import TreeScreen from '@/screens/TreeScreen';
import MemberCarouselScreen from '@/screens/MemberCarouselScreen';
import AddCarScreen from '@/screens/AddCarScreen';
import FamilyScreen from '@/screens/FamilyScreen';
import type { Car, Member } from '@/types/database';

export type TreeStackParamList = {
  TreeHome: undefined;
  MemberCarousel: { member: Member };
  // Reached via the "+" (add) or edit link (edit) on a member's carousel.
  // When `car` is present, AddCarScreen renders in edit mode for that
  // existing car instead of creating a new one.
  AddCarForMember: { member: Member; car?: Car };
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
      <TreeStack.Screen
        name="AddCarForMember"
        component={AddCarScreen}
        options={({ route }) => ({
          title: route.params.car
            ? `Edit ${route.params.car.year} ${route.params.car.make} ${route.params.car.model}`
            : `Add a car for ${route.params.member.display_name}`,
        })}
      />
    </TreeStack.Navigator>
  );
}

export default function RootNavigator() {
  const { loading, family, currentMember, refresh } = useFamily();
  // Set the moment onboarding completes; keeps the app open straight to
  // Add Car for a first-time family/member instead of landing on a
  // tree that (for a brand-new family) has no cars in it yet.
  const [justOnboarded, setJustOnboarded] = useState(false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!family || !currentMember) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setJustOnboarded(true);
          refresh();
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName={justOnboarded ? 'Add Car' : 'Tree'}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="Tree"
          component={TreeStackNavigator}
          options={{
            tabBarLabel: 'My Tree',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="family-tree" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Add Car"
          component={AddCarScreen}
          options={{
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="car" color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Family"
          component={FamilyScreen}
          options={{
            tabBarLabel: 'Family Tree',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
