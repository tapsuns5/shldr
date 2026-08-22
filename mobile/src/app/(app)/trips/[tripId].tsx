import { View, StyleSheet, FlatList } from 'react-native';
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

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={uiTrip?.title ?? 'Trip'} />
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
          ) : !reservations || reservations.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No reservations yet.</Text>
            </View>
          ) : (
            <FlatList
              data={[...reservations].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))}
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
