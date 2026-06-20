import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SQLiteProvider } from 'expo-sqlite';
import { Text } from 'react-native';

import { initDatabase } from './src/database/db';
import { requestPermissions, scheduleWorkoutNotifications, scheduleWaterReminders, cancelEveningReminders } from './src/notifications/scheduler';
import HomeScreen from './src/screens/HomeScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Oggi: '🏠',
  Allenamento: '💪',
  Progressi: '📊',
  Impostazioni: '⚙️',
};

function TabIcon({ name, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {TAB_ICONS[name]}
    </Text>
  );
}

function AppNavigator() {
  useEffect(() => {
    async function setupNotifications() {
      const granted = await requestPermissions();
      if (granted) {
        await scheduleWorkoutNotifications(8, 0);
        await scheduleWaterReminders();
        await cancelEveningReminders();
      }
    }
    setupNotifications();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarStyle: {
              backgroundColor: COLORS.card,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: 8,
              paddingTop: 4,
              height: 64,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            headerStyle: { backgroundColor: COLORS.bg, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          })}
        >
          <Tab.Screen name="Oggi" component={HomeScreen} options={{ title: 'Oggi' }} />
          <Tab.Screen name="Allenamento" component={WorkoutScreen} options={{ title: 'Allenamento' }} />
          <Tab.Screen name="Progressi" component={ProgressScreen} options={{ title: 'Progressi' }} />
          <Tab.Screen name="Impostazioni" component={SettingsScreen} options={{ title: 'Impostazioni' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SQLiteProvider databaseName="workout.db" onInit={initDatabase}>
      <AppNavigator />
    </SQLiteProvider>
  );
}
