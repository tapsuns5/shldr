import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { filterTrips, type TripTab } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useTrips } from '@/hooks/use-trips';
import { TripCard } from '@/components/TripCard';
import { signOut } from '@/lib/auth-client';

const TABS: { value: TripTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'past', label: 'Past' },
];

export default function TripsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<TripTab>('upcoming');

  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data: trips, isLoading, isRefetching, refetch } = useTrips(accountId);

  const visibleTrips = useMemo(() => filterTrips(trips ?? [], tab), [trips, tab]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Trips" />
        <Appbar.Action icon="logout" onPress={() => signOut()} />
      </Appbar.Header>

      <View style={styles.tabs}>
        <SegmentedButtons value={tab} onValueChange={(v) => setTab(v as TripTab)} buttons={TABS} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : visibleTrips.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No {tab} trips yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => router.push(`/trips/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
