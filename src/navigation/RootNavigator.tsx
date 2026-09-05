import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useFamily } from '@/hooks/useFamily';
import OnboardingScreen from '@/screens/OnboardingScreen';
import MyTreeScreen from '@/screens/MyTreeScreen';
import MemberEditScreen from '@/screens/MemberEditScreen';
import AddCarScreen from '@/screens/AddCarScreen';
import CarReorderScreen from '@/screens/CarReorderScreen';
import StorybookScreen from '@/screens/StorybookScreen';
import PrintPreviewScreen from '@/screens/PrintPreviewScreen';
import type { Car, Member } from '@/types/database';

export type TreeStackParamList = {
  TreeHome: undefined;
  MemberCarousel: { member: Member };
  // Reached via the "+" (add) or edit link (edit) on a member's carousel.
  // When `car` is present, AddCarScreen renders in edit mode for that
  // existing car instead of creating a new one.
  AddCarForMember: { member: Member; car?: Car };
};

export type StoryStackParamList = {
  Storybook: undefined;
  PrintPreview: undefined;
  MemberCarousel: { member: Member };
  AddCarForMember: { member: Member; car?: Car };
};

// ReorderCars needs to be reachable from My Tree, Family Tree, AND a
// member's carousel — three different tabs/stacks. Rather than duplicate
// it inside each nested navigator, it lives once at the ROOT level as a
// modal. React Navigation's navigate() automatically bubbles an
// unresolved route name up to parent navigators, so a plain
// navigation.navigate('ReorderCars', {member}) call from deep inside any
// tab correctly finds it here.
export type RootStackParamList = {
  MainTabs: undefined;
  ReorderCars: { member: Member };
};

const Tab = createBottomTabNavigator();
const TreeStack = createNativeStackNavigator<TreeStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const StoryStack = createNativeStackNavigator<StoryStackParamList>();

function TreeStackNavigator() {
  return (
    <TreeStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: 'Trebuchet MS', fontWeight: '800' } }}>
      <TreeStack.Screen name="TreeHome" component={MyTreeScreen} options={{ title: 'Family Tree' }} />
      <TreeStack.Screen
        name="MemberCarousel"
        component={MemberEditScreen}
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

function MainTabs({ initialRouteName }: { initialRouteName: string }) {
  return (
    <Tab.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Tree"
        component={TreeStackNavigator}
        options={{
          tabBarLabel: 'Family Tree',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="family-tree" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Story"
        component={StoryStackNavigator}
        options={{
          tabBarLabel: 'Our Story',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Add Car"
        component={AddCarScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="car" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function StoryStackNavigator() {
  return (
    <StoryStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: 'Trebuchet MS', fontWeight: '800' } }}>
      <StoryStack.Screen name="Storybook" component={StorybookScreen} options={{ title: 'Our Story' }} />
      <StoryStack.Screen name="PrintPreview" component={PrintPreviewScreen} options={{ title: 'Create a keepsake' }} />
      <StoryStack.Screen
        name="MemberCarousel"
        component={MemberEditScreen}
        options={({ route }) => ({ title: route.params.member.display_name })}
      />
      <StoryStack.Screen
        name="AddCarForMember"
        component={AddCarScreen}
        options={({ route }) => ({
          title: route.params.car
            ? `Edit ${route.params.car.year} ${route.params.car.make} ${route.params.car.model}`
            : `Add a car for ${route.params.member.display_name}`,
        })}
      />
    </StoryStack.Navigator>
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
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs">
          {() => <MainTabs initialRouteName={justOnboarded ? 'Add Car' : 'Tree'} />}
        </RootStack.Screen>
        <RootStack.Screen
          name="ReorderCars"
          component={CarReorderScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Reorder cars' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
