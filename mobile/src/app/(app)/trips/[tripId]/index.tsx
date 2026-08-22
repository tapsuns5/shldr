import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper';
import { formatTrip } from '@shldr/shared';
import { useReservations, useTrip } from '@/hooks/use-reservations';
import { ReservationRow } from '@/components/ReservationRow';

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useReservations(tripId);

  const uiTrip = trip ? formatTrip(trip) : undefined;
  const sortedReservations = reservations
    ? [...reservations].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
    : [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={uiTrip?.title ?? 'Trip'} />
        <Appbar.Action icon="file-document-outline" onPress={() => router.push(`/trips/${tripId}/documents`)} />
        <Appbar.Action icon="share-variant" onPress={() => router.push(`/trips/${tripId}/share`)} />
      </Appbar.Header>

      {tripLoading || !uiTrip ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text variant="titleMedium">{uiTrip.location || 'No destination set'}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {uiTrip.date} · {uiTrip.duration}
            </Text>
          </View>

          {reservationsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : sortedReservations.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No reservations yet.</Text>
            </View>
          ) : (
            <FlashList
              data={sortedReservations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReservationRow reservation={item} />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 16, gap: 2 },
});
