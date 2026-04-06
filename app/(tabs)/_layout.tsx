import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: '#687076',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#131313',
          borderTopColor: '#1c1c1c',
          borderTopWidth: 1,
          paddingVertical: 8,
          ...Platform.select({
            ios: {
              position: 'absolute',
              height: 80,
            },
            default: {
              height: 60,
            },
          }),
        },
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontSize: 10,
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="terminal" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="hardware-chip" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
