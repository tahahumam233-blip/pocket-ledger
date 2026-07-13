import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { typography } from '@/design/typography';
import { useAppTheme } from '@/hooks/use-app-theme';

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  size: number;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
};

function TabIcon({ color, focused, size, active, inactive }: TabIconProps) {
  return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
}

export default function MainTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: typography.caption,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: (props) => <TabIcon {...props} active="home" inactive="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: (props) => <TabIcon {...props} active="list" inactive="list-outline" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: (props) => (
            <TabIcon {...props} active="bar-chart" inactive="bar-chart-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: (props) => (
            <TabIcon {...props} active="settings" inactive="settings-outline" />
          ),
        }}
      />
    </Tabs>
  );
}
