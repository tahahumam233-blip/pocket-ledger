import { type Href, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef } from 'react';

import { AppTabBar } from '@/components/app-tab-bar';
import { useTheme } from '@/design';
import { clearLastNotification, useLastNotificationRoute } from '@/platform/notifications';

export const unstable_settings = { anchor: 'index' };

/** Opens the screen a tapped reminder points to, once the tabs are mounted. */
function NotificationTapHandler() {
  const router = useRouter();
  const route = useLastNotificationRoute();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!route || handled.current === route) return;
    handled.current = route;
    clearLastNotification();
    const timer = setTimeout(() => router.push(route as Href), 250);
    return () => clearTimeout(timer);
  }, [route, router]);

  return null;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <>
      <NotificationTapHandler />
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="receipts" options={{ title: 'Receipts' }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      </Tabs>
    </>
  );
}
