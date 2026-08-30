import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import { GlassView } from 'expo-glass-effect';
import { SolarIcon } from '@/components/SolarIcon';
import { useSession } from '@/lib/auth-client';
import { useAccounts } from '@/hooks/use-accounts';
import { useRegisterPushToken } from '@/hooks/use-register-push-token';
import { AppHeader } from '@/components/AppHeader';
import * as haptics from '@/lib/haptics';

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
  const [barWidth, setBarWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => TAB_ROUTES.some((tab) => tab.name === route.name)),
    [state.routes],
  );
  const activeIndex = visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key);
  const tabWidth = visibleRoutes.length ? barWidth / visibleRoutes.length : 0;
  const maxPosition = Math.max(barWidth - tabWidth, 0);
  const supportsGlass = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

  const selectTab = useCallback((index: number) => {
    const route = visibleRoutes[index];
    if (!route || route.key === state.routes[state.index]?.key) return;
    haptics.selection();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
  }, [navigation, state.index, state.routes, visibleRoutes]);

  const settlePosition = useCallback((index: number) => {
    Animated.spring(position, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      stiffness: 320,
      damping: 26,
      mass: 0.75,
    }).start();
  }, [position, tabWidth]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      position.stopAnimation((value) => { dragStart.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      position.setValue(Math.min(Math.max(dragStart.current + gesture.dx, 0), maxPosition));
    },
    onPanResponderRelease: (_, gesture) => {
      const index = Math.min(
        Math.max(Math.round((dragStart.current + gesture.dx) / Math.max(tabWidth, 1)), 0),
        visibleRoutes.length - 1,
      );
      settlePosition(index);
      selectTab(index);
    },
    onPanResponderTerminate: () => settlePosition(Math.max(activeIndex, 0)),
  }), [activeIndex, maxPosition, position, selectTab, settlePosition, tabWidth, visibleRoutes.length]);

  useEffect(() => {
    if (tabWidth === 0 || activeIndex < 0) return;
    settlePosition(activeIndex);
  }, [activeIndex, settlePosition, tabWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bottomArea,
        {
          height: 72 + insets.bottom,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.tabBar,
          {
            bottom: Math.max(insets.bottom, 8),
            backgroundColor: theme.dark ? '#171b19' : '#eef4ef',
            borderColor: theme.dark ? '#3b413e' : '#d9dfdc',
          },
        ]}
      >
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          tintColor={theme.dark ? 'rgba(23,27,25,0.92)' : 'rgba(238,244,239,0.92)'}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeSurface,
            {
              width: tabWidth,
              transform: [{ translateX: position }],
            },
          ]}
        >
          <GlassView
            glassEffectStyle="regular"
            tintColor={theme.dark ? '#294438' : '#d2e7d8'}
            isInteractive={supportsGlass}
            style={[
              styles.glassSurface,
              { backgroundColor: supportsGlass ? 'transparent' : theme.dark ? '#294438' : '#d2e7d8' },
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
              onPress={() => selectTab(visibleRoutes.indexOf(route))}
              style={styles.tab}
            >
              <SolarIcon name={tab.icon} size={24} color={color as string} />
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            sceneStyle: { backgroundColor: 'transparent' },
          }}
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
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  activeSurface: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 28 },
  glassSurface: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
