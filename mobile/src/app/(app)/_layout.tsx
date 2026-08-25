import { useEffect, useRef } from 'react';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import { GlassView } from 'expo-glass-effect';
import { SolarIcon } from '@/components/SolarIcon';
import { useSession } from '@/lib/auth-client';
import { useAccounts } from '@/hooks/use-accounts';
import { useRegisterPushToken } from '@/hooks/use-register-push-token';
import { AppHeader } from '@/components/AppHeader';

type TabRoute = { key: string; name: string; params?: object };
type TabBarProps = {
  state: { routes: TabRoute[]; index: number };
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const TAB_ROUTES = [
  { name: 'home', label: 'Home', icon: 'home-line-duotone' },
  { name: 'trips/index', label: 'Trips', icon: 'suitcase-line-duotone' },
  { name: 'maps', label: 'Maps', icon: 'map-line-duotone' },
  { name: 'documents', label: 'Docs', icon: 'folder-with-files-line-duotone' },
];

function BottomTabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.max(windowWidth - 24, 0);
  const position = useRef(new Animated.Value(0)).current;
  const visibleRoutes = state.routes.filter((route) => TAB_ROUTES.some((tab) => tab.name === route.name));
  const activeIndex = visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key);
  const supportsGlass = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

  useEffect(() => {
    if (barWidth === 0 || activeIndex < 0) return;
    Animated.spring(position, {
      toValue: activeIndex * (barWidth / visibleRoutes.length),
      useNativeDriver: true,
      stiffness: 280,
      damping: 22,
      mass: 0.8,
    }).start();
  }, [activeIndex, barWidth, position, visibleRoutes.length]);

  return (
    <View style={[
        styles.tabBar,
        {
          bottom: Math.max(insets.bottom, 8),
          backgroundColor: supportsGlass ? 'transparent' : theme.colors.surface,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeSurface,
          {
            width: visibleRoutes.length ? barWidth / visibleRoutes.length : 0,
            transform: [{ translateX: position }],
          },
        ]}
      >
        <GlassView
          glassEffectStyle="regular"
          tintColor={theme.dark ? '#1d3428' : '#d2e7d8'}
          isInteractive={supportsGlass}
          style={[
            styles.glassSurface,
            { backgroundColor: supportsGlass ? 'transparent' : theme.dark ? '#1d3428' : '#d2e7d8' },
          ]}
        />
      </Animated.View>
      {visibleRoutes.map((route) => {
        const tab = TAB_ROUTES.find((item) => item.name === route.name);
        if (!tab) return null;
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? theme.colors.primary : theme.colors.onSurfaceVariant;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={styles.tab}
          >
            <SolarIcon name={tab.icon} size={24} color={color as string} />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: accounts, isPending: accountsPending } = useAccounts({ enabled: Boolean(session) });
  const pathname = usePathname();

  // Deferred until the user has an account (post-onboarding) rather than
  // asking for permission on first launch, per docs/mobile-app-plan.md §7.
  useRegisterPushToken(Boolean(session) && Boolean(accounts && accounts.length > 0));

  if (sessionPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  // New sign-ups have no account yet — everything past this layout assumes one.
  if (!accountsPending && accounts && accounts.length === 0 && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={styles.app}>
      <AppHeader />
      <View style={styles.tabContent}>
        <Tabs
          tabBar={(props) => <BottomTabBar {...(props as unknown as TabBarProps)} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="trips/index" options={{ title: 'Trips' }} />
          <Tabs.Screen name="maps" options={{ title: 'Maps' }} />
          <Tabs.Screen name="documents" options={{ title: 'Docs' }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  tabContent: { flex: 1 },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d9dfdc',
    paddingTop: 4,
  },
  activeSurface: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 26 },
  glassSurface: { flex: 1, borderRadius: 26, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
