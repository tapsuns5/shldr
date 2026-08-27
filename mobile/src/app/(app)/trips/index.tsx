import { useMemo, useState } from 'react';
import { LayoutAnimation, View, StyleSheet } from 'react-native';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FAB, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { filterTrips, type TripTab } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useTrips } from '@/hooks/use-trips';
import { TripCard } from '@/components/TripCard';
import { NewTripSheet } from '@/components/NewTripSheet';

const TABS: { value: TripTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'past', label: 'Past' },
];

export default function TripsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TripTab>('upcoming');
  const [newTripOpen, setNewTripOpen] = useState(false);

  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data: trips, isLoading, isRefetching, refetch } = useTrips(accountId);

  const visibleTrips = useMemo(() => filterTrips(trips ?? [], tab), [trips, tab]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.tabs}>
        <SegmentedButtons
          value={tab}
          onValueChange={(value) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTab(value as TripTab);
          }}
          buttons={TABS}
        />
      </View>

      <View style={styles.content}>
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
          <FlashList
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

      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            bottom: 88 + insets.bottom,
            backgroundColor: theme.colors.primary,
          },
        ]}
        color={theme.colors.onPrimary}
        onPress={() => setNewTripOpen(true)}
        disabled={!accountId}
      />
      {newTripOpen ? (
        <NewTripSheet
          visible
          onDismiss={() => setNewTripOpen(false)}
          onCreated={(tripId) => {
            setNewTripOpen(false);
            router.push(`/trips/${tripId}`);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1 },
  tabs: { paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 176 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20 },
});
