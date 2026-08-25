import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import { buildFlightRoutesGeoJson, MAP_STYLE_DARK, MAP_STYLE_LIGHT, type MapPin } from '@shldr/shared';
import { useSession } from '@/lib/auth-client';
import { useAccounts } from '@/hooks/use-accounts';
import { useTrips } from '@/hooks/use-trips';
import { useAccountMapData } from '@/hooks/use-map-data';
import { boundsFromPoints } from '@/lib/map-bounds';
import { ShldrLogo } from '@/components/ShldrLogo';
import { SolarIcon } from '@/components/SolarIcon';
import { TripCard } from '@/components/TripCard';

function pinsGeoJson(pins: MapPin[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: pins
      .filter((pin) => pin.lat !== 0 || pin.lng !== 0)
      .map((pin) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
        properties: { id: pin.id, city: pin.city, country: pin.country, visitCount: pin.visitCount },
      })),
  };
}

type StatCardProps = {
  icon: string;
  label: string;
  value: string;
  detail: string;
  onPress: () => void;
  color: string;
};

function StatCard({ icon, label, value, detail, onPress, color }: StatCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.statAccent, { backgroundColor: color }]} />
      <View style={[styles.statIcon, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
        <SolarIcon name={icon} size={22} color={color} />
      </View>
      <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="headlineMedium" style={[styles.statValue, { color }]}>
        {value}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
        {detail}
      </Text>
    </Pressable>
  );
}

function getGreeting() {
  const hour = dayjs().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function HomeMap({ accountId }: { accountId: string | undefined }) {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading } = useAccountMapData(accountId);
  const isDark = theme.dark;

  const flightGeoJson = useMemo(
    () => (data?.flightRoutes ? buildFlightRoutesGeoJson(data.flightRoutes) : null),
    [data?.flightRoutes]
  );
  const cityPins = useMemo(() => (data?.pins ? pinsGeoJson(data.pins) : null), [data?.pins]);
  const bounds = useMemo(
    () => (data ? boundsFromPoints(data.pins.map((pin) => ({ lat: pin.lat, lng: pin.lng })), 2) : null),
    [data]
  );

  return (
    <View style={[styles.mapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.mapViewport}>
        {isLoading || !data ? (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
            <ActivityIndicator />
          </View>
        ) : (
          <Map style={StyleSheet.absoluteFill} mapStyle={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}>
            <Camera initialViewState={bounds ? { bounds, padding: { top: 30, bottom: 30, left: 20, right: 20 } } : undefined} />
            {flightGeoJson && flightGeoJson.features.length > 0 ? (
              <GeoJSONSource id="home-flight-arcs" data={flightGeoJson}>
                <Layer id="home-flight-arcs-line" type="line" style={{ lineColor: theme.colors.primary, lineWidth: 1.5, lineOpacity: 0.7 }} />
              </GeoJSONSource>
            ) : null}
            {cityPins && cityPins.features.length > 0 ? (
              <GeoJSONSource id="home-city-pins" data={cityPins}>
                <Layer
                  id="home-city-pins-circle"
                  type="circle"
                  style={{ circleColor: theme.colors.primary, circleRadius: 7, circleStrokeWidth: 2, circleStrokeColor: '#ffffff', circleOpacity: 0.9 }}
                />
              </GeoJSONSource>
            ) : null}
          </Map>
        )}
        <Pressable onPress={() => router.push('/maps')} style={styles.openMapButton}>
          <SolarIcon name="map-line-duotone" size={16} color={theme.colors.primary} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>Open full map</Text>
          <SolarIcon name="alt-arrow-right-line-duotone" size={16} color={theme.colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapStats}>
        <MapStat icon="flag-line-duotone" value={data?.stats.countriesCount ?? 0} label="countries" />
        <MapStat icon="map-point-line-duotone" value={data?.stats.citiesCount ?? 0} label="cities" />
        <MapStat icon="plain-2-line-duotone" value={data?.stats.flightsCount ?? 0} label="flights" />
      </ScrollView>
    </View>
  );
}

function MapStat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.mapStat, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
      <SolarIcon name={icon} size={15} color={theme.colors.primary} />
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data: trips, isLoading } = useTrips(accountId);
  const allTrips = trips ?? [];
  const today = dayjs().startOf('day');
  const activeTrips = allTrips.filter((trip) => !dayjs(trip.startDate).isAfter(today) && !dayjs(trip.endDate).isBefore(today));
  const upcomingTrips = allTrips.filter((trip) => dayjs(trip.startDate).isAfter(today));
  const nextTrip = [...upcomingTrips].sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())[0];
  const daysUntilNext = nextTrip ? dayjs(nextTrip.startDate).startOf('day').diff(today, 'day') : null;
  const firstName = session?.user?.name?.split(' ')[0] || 'Traveler';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerDecorTop} />
          <View style={styles.bannerDecorBottom} />
          <View style={styles.bannerContent}>
            <ShldrLogo height={15} width={37} style={styles.logo} />
            <Text variant="headlineMedium" style={styles.bannerTitle}>{getGreeting()}, {firstName}</Text>
            <Text variant="bodyMedium" style={styles.bannerSubtitle}>Let&apos;s make your next trip unforgettable.</Text>
          </View>
          <View style={styles.bannerIcon}><SolarIcon name="map-line-duotone" size={30} color="#ffffff" /></View>
        </View>

        <HomeMap accountId={accountId} />

        <Text variant="titleLarge" style={styles.sectionTitle}>Your travel at a glance</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="suitcase-line-duotone" label="Active trips" value={String(activeTrips.length)} detail={`${activeTrips.length} in progress`} color="#356a4c" onPress={() => router.push('/trips')} />
          <StatCard icon="plain-2-line-duotone" label="Upcoming trips" value={String(upcomingTrips.length)} detail={`${upcomingTrips.length} planned`} color="#74c7a1" onPress={() => router.push('/trips')} />
          <StatCard icon="clock-circle-line-duotone" label="Next adventure" value={nextTrip ? (daysUntilNext === 0 ? 'Today' : `${daysUntilNext}d`) : '—'} detail={nextTrip?.title || 'No upcoming trips'} color="#285b48" onPress={() => nextTrip && router.push(`/trips/${nextTrip.id}`)} />
          <StatCard icon="map-point-line-duotone" label="Total trips" value={String(allTrips.length)} detail="All-time trips" color="#356a4c" onPress={() => router.push('/trips')} />
        </View>

        <Text variant="titleLarge" style={styles.sectionTitle}>Upcoming trips</Text>
        {isLoading ? <ActivityIndicator /> : upcomingTrips.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No upcoming trips yet.</Text>
        ) : upcomingTrips.slice(0, 3).map((trip) => (
          <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/trips/${trip.id}`)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 116 },
  banner: { minHeight: 174, borderRadius: 22, overflow: 'hidden', backgroundColor: '#356a4c', marginBottom: 18, position: 'relative' },
  bannerContent: { padding: 22, zIndex: 1 },
  logo: { marginBottom: 10 },
  bannerTitle: { color: '#ffffff', fontWeight: '800', marginBottom: 7 },
  bannerSubtitle: { color: '#d9eee3' },
  bannerIcon: { position: 'absolute', right: 22, top: 54, width: 58, height: 58, borderRadius: 29, backgroundColor: '#ffffff22', borderWidth: 1, borderColor: '#ffffff35', alignItems: 'center', justifyContent: 'center' },
  bannerDecorTop: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -48, top: -74, backgroundColor: '#ffffff12' },
  bannerDecorBottom: { position: 'absolute', width: 130, height: 130, borderRadius: 65, left: -58, bottom: -80, backgroundColor: '#ffffff0c' },
  mapCard: { borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, marginBottom: 22 },
  mapViewport: { height: 238, position: 'relative' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  openMapButton: { position: 'absolute', top: 12, right: 12, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: '#ffffffee', flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapStats: { gap: 8, padding: 11 },
  mapStat: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 11 },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48.4%', minHeight: 154, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, overflow: 'hidden' },
  statAccent: { position: 'absolute', top: 0, left: 14, right: 14, height: 3 },
  statIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 5, marginBottom: 11 },
  statLabel: { textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: '700', marginBottom: 2 },
  statValue: { fontWeight: '800', lineHeight: 34 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
