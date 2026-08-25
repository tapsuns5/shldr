import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Chip, Divider, Text, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import { formatTrip, type APIReservation } from '@shldr/shared';
import { useReservations, useTrip } from '@/hooks/use-reservations';
import { ReservationRow } from '@/components/ReservationRow';
import { API_URL } from '@/lib/config';

function TripHeroImage({ location, fallbackImage }: { location: string; fallbackImage: string | null }) {
  const theme = useTheme();
  const [useCoverImage, setUseCoverImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const locationImage = location
    ? `${API_URL}/api/location-photo?location=${encodeURIComponent(location)}`
    : null;
  const imageUri = imageFailed ? null : useCoverImage ? fallbackImage : locationImage || fallbackImage;

  if (!imageUri) {
    return (
      <View style={[styles.hero, styles.heroFallback, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {location.slice(0, 1).toUpperCase() || '?'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={styles.hero}
      resizeMode="cover"
      onError={() => {
        if (!useCoverImage && locationImage && fallbackImage) {
          setUseCoverImage(true);
        } else {
          setImageFailed(true);
        }
      }}
    />
  );
}

function effectiveReservationTime(reservation: APIReservation, reservations: APIReservation[]) {
  const baseTime = dayjs(reservation.startDateTime).valueOf();
  if (reservation.type !== 'hotel') return baseTime;

  const reservationDay = dayjs(reservation.startDateTime).format('YYYY-MM-DD');
  let latestArrival = 0;
  for (const item of reservations) {
    if (dayjs(item.startDateTime).format('YYYY-MM-DD') !== reservationDay) continue;
    if (item.type === 'flight') {
      const arrival = item.endDateTime
        ? dayjs(item.endDateTime).valueOf()
        : dayjs(item.startDateTime).add(2, 'hour').valueOf();
      latestArrival = Math.max(latestArrival, arrival);
    } else if (item.type === 'car' || item.type === 'transport') {
      latestArrival = Math.max(latestArrival, dayjs(item.startDateTime).valueOf());
    }
  }

  return latestArrival > 0 && baseTime <= latestArrival ? latestArrival + 60 * 1000 : baseTime;
}

function groupReservations(reservations: APIReservation[], startDate: string, endDate: string) {
  const groups = new Map<string, { date: string; label: string; reservations: APIReservation[] }>();
  let date = dayjs(startDate).startOf('day');
  const lastDate = dayjs(endDate).startOf('day');

  while (date.isValid() && lastDate.isValid() && !date.isAfter(lastDate, 'day')) {
    const key = date.format('YYYY-MM-DD');
    groups.set(key, { date: key, label: date.format('ddd, MMM D YYYY'), reservations: [] });
    date = date.add(1, 'day');
  }

  for (const reservation of reservations) {
    const reservationDate = dayjs(reservation.startDateTime);
    const key = reservationDate.isValid() ? reservationDate.format('YYYY-MM-DD') : 'unknown';
    const existing = groups.get(key);
    if (existing) {
      existing.reservations.push(reservation);
    } else {
      groups.set(key, {
        date: key,
        label: reservationDate.isValid() ? reservationDate.format('ddd, MMM D YYYY') : 'Date not set',
        reservations: [reservation],
      });
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    reservations: group.reservations.sort(
      (a, b) => effectiveReservationTime(a, reservations) - effectiveReservationTime(b, reservations)
    ),
  }));
}

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useReservations(tripId);
  const uiTrip = trip ? formatTrip(trip) : undefined;
  const reservationGroups = useMemo(
    () => (reservations && uiTrip ? groupReservations(reservations, uiTrip.startDate, uiTrip.endDate) : []),
    [reservations, uiTrip]
  );
  const heroLocation = uiTrip?.destinations[0]?.location || uiTrip?.location || '';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {tripLoading || !uiTrip ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            {uiTrip.title}, {uiTrip.monthYear}
          </Text>
          <Text variant="bodyLarge" style={[styles.location, { color: theme.colors.onSurfaceVariant }]}>
            {uiTrip.location || 'No destination set'}
          </Text>

          {uiTrip.destinations.length > 0 && (
            <View style={styles.chips}>
              {uiTrip.destinations.map((destination) => (
                <Chip key={destination.location} icon="map-marker-outline" compact>
                  {destination.location}
                </Chip>
              ))}
            </View>
          )}

          <Text variant="bodyMedium" style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
            {uiTrip.date} ({uiTrip.duration})
          </Text>

          <TripHeroImage location={heroLocation} fallbackImage={uiTrip.image} />

          <Text variant="titleLarge" style={styles.sectionTitle}>
            Trip Route
          </Text>
          <View style={[styles.routeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {uiTrip.destinations.length > 0
                ? uiTrip.destinations.map((destination) => destination.location).join('  →  ')
                : uiTrip.location || 'No destination set'}
            </Text>
          </View>

          <Text variant="titleLarge" style={styles.sectionTitle}>
            Itinerary
          </Text>
          {reservationsLoading ? (
            <View style={styles.centerSmall}>
              <ActivityIndicator />
            </View>
          ) : reservationGroups.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No reservations yet.</Text>
          ) : (
            reservationGroups.map((group, index) => (
              <View key={group.date} style={styles.dayGroup}>
                <View style={[styles.dayHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Pressable
                    style={styles.dayButton}
                    onPress={() => router.push(`/trips/${tripId}/day/${group.date}`)}
                  >
                    <Text variant="titleMedium" style={styles.dayLabel}>
                      {group.label}  ›
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/trips/${tripId}/plan?date=${group.date}`)}>
                    <Text style={{ color: theme.colors.primary }}>＋ Add a Plan</Text>
                  </Pressable>
                </View>
                <View style={styles.timeline}>
                  <View style={styles.timelineLine} />
                  {group.reservations.map((reservation) => (
                    <View key={reservation.id} style={styles.timelineItem}>
                      <ReservationRow reservation={reservation} />
                    </View>
                  ))}
                </View>
                {index < reservationGroups.length - 1 && <Divider />}
              </View>
            ))
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
  centerSmall: { paddingVertical: 24, alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  location: { lineHeight: 26, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  date: { marginBottom: 20 },
  hero: { width: '100%', height: 220, borderRadius: 20, marginBottom: 26 },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  routeCard: { borderRadius: 16, padding: 16, marginBottom: 28 },
  dayGroup: { marginBottom: 12 },
  dayHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayLabel: { fontWeight: '700' },
  dayButton: { flex: 1 },
  timeline: { position: 'relative', marginLeft: 6 },
  timelineLine: { position: 'absolute', top: 0, bottom: 0, left: 82, width: 2, backgroundColor: '#d0d0d0' },
  timelineItem: { marginBottom: 2 },
});
