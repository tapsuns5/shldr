import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Text, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
import { formatTrip } from '@shldr/shared';
import { useReservations, useTrip } from '@/hooks/use-reservations';
import { ReservationRow } from '@/components/ReservationRow';

export default function TripDayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId, date } = useLocalSearchParams<{ tripId: string; date: string }>();
  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useReservations(tripId);
  const day = dayjs.utc(date);
  const dayReservations = useMemo(
    () => (reservations ?? []).filter((reservation) => {
      const rDate = reservation.source === 'email_import'
        ? dayjs.utc(reservation.startDateTime)
        : dayjs(reservation.startDateTime);
      return rDate.isSame(day, 'day');
    }),
    [reservations, day]
  );
  const uiTrip = trip ? formatTrip(trip) : undefined;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {tripLoading || reservationsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            {day.isValid() ? day.format('ddd, MMM D YYYY') : 'Trip day'}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {uiTrip?.location || 'No destination set'}
          </Text>
          <Button
            mode="outlined"
            icon="plus"
            style={styles.addButton}
            onPress={() => router.push(`/trips/${tripId}/plan?date=${date}`)}
          >
            Add a Plan
          </Button>

          {dayReservations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No plans for this day.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {dayReservations.map((reservation) => (
                <View key={reservation.id} style={styles.item}>
                  <ReservationRow reservation={reservation} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 6 },
  addButton: { alignSelf: 'flex-start', marginTop: 20, marginBottom: 20 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  timeline: { position: 'relative', marginTop: 8, marginLeft: 6 },
  timelineLine: { position: 'absolute', top: 0, bottom: 0, left: 82, width: 2, backgroundColor: '#d0d0d0' },
  item: { marginBottom: 2 },
});
