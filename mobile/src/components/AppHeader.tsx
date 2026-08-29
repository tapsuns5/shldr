import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Avatar, Badge, Button, Divider, IconButton, List, RadioButton, Text, useTheme } from 'react-native-paper';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession, signOut } from '@/lib/auth-client';
import { useColorMode } from '@/lib/color-mode';
import { useAccounts } from '@/hooks/use-accounts';
import { useGmailAccounts, useConnectGmail, useTripitFeed } from '@/hooks/use-integrations';
import { apiClient } from '@/lib/api-client';
import { BottomSheet } from './BottomSheet';
import { ShldrLogo } from './ShldrLogo';
import { SolarIcon } from './SolarIcon';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  tripId: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationResponse = { notifications: Notification[]; unreadCount: number };

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SheetBack({ onPress, title }: { onPress: () => void; title: string }) {
  const theme = useTheme();
  return (
    <Pressable style={styles.sheetBack} onPress={onPress}>
      <SolarIcon name="arrow-left-line-duotone" size={22} color={theme.colors.onSurface} />
      <Text variant="titleMedium">{title}</Text>
    </Pressable>
  );
}

function PreferencesSheet({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { preference, setPreference } = useColorMode();
  const options = [
    { value: 'system', label: 'Match system' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ] as const;
  return (
    <>
      <SheetBack onPress={onBack} title="Preferences" />
      <Text variant="headlineSmall" style={styles.sheetTitle}>Preferences</Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>Choose how SHLDR looks on this device.</Text>
      <RadioButton.Group value={preference} onValueChange={(value) => setPreference(value as typeof preference)}>
        {options.map((option) => <List.Item key={option.value} title={option.label} onPress={() => setPreference(option.value)} right={() => <RadioButton value={option.value} />} />)}
      </RadioButton.Group>
    </>
  );
}

function IntegrationsSheet({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data: gmailAccounts, isLoading: gmailLoading } = useGmailAccounts(accountId);
  const { data: tripitFeed, isLoading: tripitLoading } = useTripitFeed(accountId);
  const connectGmail = useConnectGmail(accountId);
  return (
    <>
      <SheetBack onPress={onBack} title="Integrations" />
      <Text variant="headlineSmall" style={styles.sheetTitle}>Integrations</Text>
      <Text style={[styles.sheetDescription, { color: theme.colors.onSurfaceVariant }]}>Automatically import reservations from confirmation emails and TripIt.</Text>
      <Text variant="labelLarge" style={styles.sectionLabel}>Gmail</Text>
      {gmailLoading ? <ActivityIndicator /> : gmailAccounts?.length ? gmailAccounts.map((account) => <List.Item key={account.id} title={account.email} description={account.status} />) : <Button mode="outlined" onPress={() => connectGmail.mutate()} loading={connectGmail.isPending}>Connect Gmail</Button>}
      <Text variant="labelLarge" style={styles.sectionLabel}>TripIt</Text>
      <List.Item title={tripitLoading ? 'Loading…' : tripitFeed ? 'TripIt connected' : 'TripIt not connected'} description={tripitFeed?.icalUrl ?? 'Manage your TripIt feed in settings'} />
    </>
  );
}

export function AppHeader() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const rootRoutes = ['/home', '/trips', '/maps', '/documents'];
  const isRootRoute = rootRoutes.includes(pathname);
  const screenTitles: Record<string, string> = {
    '/settings': 'Settings',
    '/settings/account': 'Account',
    '/settings/integrations': 'Integrations',
    '/settings/preferences': 'Preferences',
    '/trips/new': 'New trip',
    '/documents': 'Docs',
  };
  const screenTitle = screenTitles[pathname] ?? (pathname.includes('/day/') ? 'Trip day' : pathname.includes('/plan') ? 'Add a Plan' : pathname.includes('/map') ? 'Travel map' : pathname.includes('/share') ? 'Share trip' : pathname.includes('/trips/') ? 'Trip details' : 'SHLDR');
  const isTripDetail = /^\/trips\/[^/]+(?:\/index)?\/?$/.test(pathname);
  const isSettingsRoute = pathname.startsWith('/settings');
  const { width } = useWindowDimensions();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };
  const [accountOpen, setAccountOpen] = useState(false);
  const [sheetSection, setSheetSection] = useState<'menu' | 'account' | 'integrations' | 'preferences'>('menu');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationResponse>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<NotificationResponse>('/api/notifications');
      setNotificationData(data);
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  const markRead = async (id: string) => {
    setNotificationData((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item),
    }));
    await apiClient.patch(`/api/notifications/${id}`, {});
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) await markRead(notification.id);
    setNotificationsOpen(false);
    if (notification.link) router.push(notification.link as never);
    else if (notification.tripId) router.push(`/trips/${notification.tripId}`);
  };

  return (
    <>
      <View
        style={[
          styles.header,
          isTripDetail && styles.hiddenTripDetailHeader,
          { height: 64 + insets.top, paddingTop: insets.top, backgroundColor: isTripDetail ? 'transparent' : theme.colors.surface },
        ]}
      >
        {isRootRoute ? (
          <>
            <IconButton
              icon={() => <SolarIcon name="user-line-duotone" size={25} color={theme.colors.onSurface} />}
              onPress={() => { setSheetSection('menu'); setAccountOpen(true); }}
              accessibilityLabel="Account"
            />
            <ShldrLogo height={28} />
            <View style={styles.actions}>
              <View>
                <IconButton
                  icon={() => <SolarIcon name="bell-line-duotone" size={25} color={theme.colors.onSurface} />}
                  onPress={() => {
                    setNotificationsOpen(true);
                    loadNotifications();
                  }}
                  accessibilityLabel="Notifications"
                />
                {notificationData.unreadCount > 0 && (
                  <Badge size={17} style={styles.badge}>{notificationData.unreadCount > 99 ? '99+' : notificationData.unreadCount}</Badge>
                )}
              </View>
            </View>
          </>
        ) : (
          <>
            <IconButton
              icon={() => <SolarIcon name="arrow-left-line-duotone" size={28} color={isTripDetail ? '#ffffff' : theme.colors.onSurface} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
              style={isTripDetail ? [styles.tripDetailBackButton, { top: insets.top + 6, left: 8 }] : undefined}
            />
            {!isTripDetail && <Text variant="titleLarge" style={styles.screenTitle} numberOfLines={1}>{screenTitle}</Text>}
            {isSettingsRoute ? (
              <IconButton
                icon={() => <SolarIcon name="logout-2-line-duotone" size={25} color={theme.colors.onSurface} />}
                onPress={handleLogout}
                accessibilityLabel="Log out"
              />
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </>
        )}
      </View>

      <BottomSheet visible={accountOpen} onDismiss={() => setAccountOpen(false)} detents={[0.58, 0.88]} initialDetentIndex={0}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {sheetSection === 'menu' ? (
                <>
                  <View style={styles.sheetHeaderRow}>
                    <Text variant="headlineSmall" style={styles.sheetTitle}>Account</Text>
                    <IconButton
                      icon={() => <SolarIcon name="logout-2-line-duotone" size={25} color={theme.colors.onSurface} />}
                      onPress={handleLogout}
                      accessibilityLabel="Log out"
                    />
                  </View>
                  <Text variant="titleMedium">{session?.user.name ?? 'Traveler'}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{session?.user.email}</Text>
            <Divider style={styles.divider} />
            <Pressable
              style={styles.sheetRow}
              onPress={() => setSheetSection('account')}
            >
              <SolarIcon name="user-line-duotone" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium">Account settings</Text>
              <SolarIcon name="alt-arrow-right-line-duotone" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Divider style={styles.divider} />
            <Text variant="labelLarge" style={styles.sectionLabel}>Integrations</Text>
            <Pressable style={styles.sheetRow} onPress={() => setSheetSection('integrations')}>
              <SolarIcon name="link-line-duotone" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium">Gmail and TripIt</Text>
              <SolarIcon name="alt-arrow-right-line-duotone" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Text variant="labelLarge" style={styles.sectionLabel}>Preferences</Text>
            <Pressable style={styles.sheetRow} onPress={() => setSheetSection('preferences')}>
              <SolarIcon name="settings-bold-duotone" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium">Appearance</Text>
              <SolarIcon name="alt-arrow-right-line-duotone" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
                </>
              ) : sheetSection === 'account' ? (
                <>
                  <View style={styles.sheetHeaderRow}>
                    <Pressable style={styles.sheetBack} onPress={() => setSheetSection('menu')}>
                      <SolarIcon name="arrow-left-line-duotone" size={22} color={theme.colors.onSurface} />
                      <Text variant="titleMedium">Account</Text>
                    </Pressable>
                    <IconButton
                      icon={() => <SolarIcon name="logout-2-line-duotone" size={25} color={theme.colors.onSurface} />}
                      onPress={handleLogout}
                      accessibilityLabel="Log out"
                    />
                  </View>
                  <View style={styles.accountProfile}>
                    <Avatar.Text size={64} label={(session?.user.name ?? 'T').slice(0, 1).toUpperCase()} />
                    <View>
                      <Text variant="titleLarge" style={styles.sheetTitle}>{session?.user.name ?? 'Traveler'}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>{session?.user.email}</Text>
                    </View>
                  </View>
                  <Divider style={styles.divider} />
                  <Text variant="labelLarge" style={styles.sectionLabel}>Account information</Text>
                  <Text variant="titleMedium" style={styles.accountFieldLabel}>Name</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{session?.user.name ?? 'Not set'}</Text>
                  <Text variant="titleMedium" style={styles.accountFieldLabel}>Email</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{session?.user.email ?? 'Not set'}</Text>
                </>
              ) : sheetSection === 'integrations' ? (
                <IntegrationsSheet onBack={() => setSheetSection('menu')} />
              ) : (
                <PreferencesSheet onBack={() => setSheetSection('menu')} />
              )}
        </ScrollView>
      </BottomSheet>

      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable style={styles.popoverBackdrop} onPress={() => setNotificationsOpen(false)}>
          <Pressable
            style={[styles.popover, { backgroundColor: theme.colors.surface, width: Math.min(width - 32, 360) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.popoverHeader}>
              <Text variant="titleLarge" style={styles.sheetTitle}>Notifications{notificationData.unreadCount ? ` (${notificationData.unreadCount})` : ''}</Text>
              <IconButton icon={() => <SolarIcon name="close-circle-line-duotone" size={22} color={theme.colors.onSurfaceVariant} />} onPress={() => setNotificationsOpen(false)} />
            </View>
            {notificationData.unreadCount > 0 && (
              <Pressable onPress={async () => { await apiClient.post('/api/notifications/mark-all-read', {}); setNotificationData((current) => ({ ...current, unreadCount: 0, notifications: current.notifications.map((item) => ({ ...item, read: true })) })); }}>
                <Text style={[styles.markAll, { color: theme.colors.primary }]}>Mark all read</Text>
              </Pressable>
            )}
            <Divider />
            {loading ? (
              <Text style={styles.empty}>Loading notifications…</Text>
            ) : notificationData.notifications.length === 0 ? (
              <Text style={styles.empty}>No notifications</Text>
            ) : (
              <ScrollView style={styles.notificationList}>
                {notificationData.notifications.map((notification) => (
                  <Pressable key={notification.id} style={[styles.notification, !notification.read && { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => handleNotificationPress(notification)}>
                    <View style={styles.notificationTitle}>
                      {!notification.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
                      <Text variant="titleSmall" numberOfLines={2}>{notification.title}</Text>
                    </View>
                    {notification.body ? <Text numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>{notification.body}</Text> : null}
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{timeAgo(notification.createdAt)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d9dfdc', zIndex: 10 },
  hiddenTripDetailHeader: { display: 'none' },
  tripDetailBackButton: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 24, zIndex: 2 },
  screenTitle: { flex: 1, textAlign: 'center', fontWeight: '600' },
  headerSpacer: { width: 48 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  badge: { position: 'absolute', top: 4, right: 3, backgroundColor: '#c62828' },
  sheetContent: { padding: 24, paddingTop: 8, paddingBottom: 40 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetBack: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountProfile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  accountFieldLabel: { marginTop: 22, marginBottom: 2 },
  sheetTitle: { fontWeight: '700' },
  sheetDescription: { marginBottom: 16 },
  divider: { marginVertical: 20 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  sectionLabel: { color: '#6b756f', marginBottom: 4 },
  popoverBackdrop: { flex: 1, backgroundColor: 'transparent' },
  popover: { position: 'absolute', top: 76, right: 16, maxHeight: 480, borderRadius: 18, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, overflow: 'hidden' },
  popoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 18 },
  markAll: { alignSelf: 'flex-end', marginRight: 18, marginBottom: 10 },
  notificationList: { maxHeight: 380 },
  notification: { padding: 16, gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d9dfdc' },
  notificationTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  empty: { padding: 32, textAlign: 'center' },
});
