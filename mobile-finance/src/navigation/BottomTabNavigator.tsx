import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, ReceiptText, Users, CreditCard, Settings } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransaksiScreen } from '../screens/TransaksiScreen';
import { PiutangScreen } from '../screens/PiutangScreen';
import { HutangScreen } from '../screens/HutangScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <LayoutDashboard size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransaksiTab"
        component={TransaksiScreen}
        options={{
          tabBarLabel: 'Transaksi',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <ReceiptText size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PiutangTab"
        component={PiutangScreen}
        options={{
          tabBarLabel: 'Piutang',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Users size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HutangTab"
        component={HutangScreen}
        options={{
          tabBarLabel: 'Hutang',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <CreditCard size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Pengaturan',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Settings size={size - 2} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
