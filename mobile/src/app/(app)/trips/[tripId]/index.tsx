import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { formatTrip, generateCurvedLine, MAP_STYLE_DARK, MAP_STYLE_LIGHT, type APIReservation, type TripRouteLocation } from '@shldr/shared';
import { useReservations, useTrip } from '@/hooks/use-reservations';
import { useTripRoute } from '@/hooks/use-trip-route';
import { ReservationRow } from '@/components/ReservationRow';
import { PinBadge } from '@/components/map/PinBadge';
import { boundsFromPoints } from '@/lib/map-bounds';
import { useColorMode } from '@/lib/color-mode';

const ROUTE_COLORS: Record<string, string> = {
  flight: '#2563eb', hotel: '#7c3aed', lodging: '#7c3aed', car: '#d97706', rental: '#d97706',
  rail: '#0891b2', train: '#0891b2', cruise: '#0891b2', ferry: '#0891b2', transport: '#0891b2', bus: '#0891b2',
  activity: '#16a34a', tour: '#16a34a', attraction: '#16a34a', restaurant: '#dc2626', food: '#dc2626',
  dining: '#dc2626', other: '#6b7280',
};
const ROUTE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  flight: 'airplane', hotel: 'office-building', lodging: 'office-building', car: 'car', rental: 'car',
  rail: 'train', train: 'train', cruise: 'ferry', ferry: 'ferry', transport: 'bus', bus: 'bus',
  activity: 'ticket-outline', tour: 'ticket-outline', attraction: 'ticket-outline', restaurant: 'silverware-fork-knife',
  food: 'silverware-fork-knife', dining: 'silverware-fork-knife', other: 'map-marker',
};

type RouteDay = { date: string; label: string; reservations: APIReservation[] };

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
  const groups = new globalThis.Map<string, { date: string; label: string; reservations: APIReservation[] }>();
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

// Compact detent (fraction of screen height visible as sheet)
const SHEET_COMPACT = 0.38;
const SHEET_EXPANDED = 0.82;
const HANDLE_HEIGHT = 32;

export default function TripDetailScreen() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useReservations(tripId);
  const { data: route } = useTripRoute(tripId);
  const uiTrip = trip ? formatTrip(trip) : undefined;
  const reservationGroups = useMemo(
    () => (reservations && uiTrip ? groupReservations(reservations, uiTrip.startDate, uiTrip.endDate) : []),
    [reservations, uiTrip]
  );

  // Day filter state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const filteredGroups = selectedDay
    ? reservationGroups.filter((g) => g.date === selectedDay)
    : reservationGroups;

  // Map data — filter by selected day
  const allLocations = useMemo(
    () => [...(route?.locations ?? [])].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))),
    [route?.locations],
  );
  const selectedReservationIds = useMemo(
    () => new Set(
      reservationGroups
        .find((g) => g.date === selectedDay)
        ?.reservations.map((r) => r.id) ?? []
    ),
    [reservationGroups, selectedDay],
  );
  const activeLocations = selectedDay
    ? allLocations.filter((loc) => selectedReservationIds.has(loc.reservationId) || String(loc.date ?? '') === selectedDay)
    : allLocations;

  const bounds = useMemo(() => boundsFromPoints(activeLocations), [activeLocations]);
  const lineSets = useMemo(() => {
    const include = (date: string, reservationId: string) =>
      !selectedDay || selectedReservationIds.has(reservationId) || String(date ?? '') === selectedDay;
    const flightSegments = (route?.flights ?? []).filter((s) => include(s.date, s.reservationId));
    const transitSegments = (route?.transits ?? []).filter((s) => include(s.date, s.reservationId));
    const localFeatures = activeLocations.slice(0, -1).flatMap((from, index) => {
      const to = activeLocations[index + 1];
      const distance = Math.hypot(to.lng - from.lng, to.lat - from.lat);
      return distance <= 0.5 ? [{ type: 'Feature' as const, properties: {}, geometry: generateCurvedLine([from.lng, from.lat], [to.lng, to.lat], 0.04) }] : [];
    });
    const make = (segments: typeof flightSegments) => segments.length ? ({ type: 'FeatureCollection' as const, features: segments.map((segment) => ({ type: 'Feature' as const, properties: {}, geometry: generateCurvedLine([segment.from.lng, segment.from.lat], [segment.to.lng, segment.to.lat]) })) }) : null;
    return {
      local: localFeatures.length ? { type: 'FeatureCollection' as const, features: localFeatures } : null,
      outbound: make(flightSegments.filter((s) => !('isReturnHome' in s && s.isReturnHome))),
      returns: make(flightSegments.filter((s) => 'isReturnHome' in s && s.isReturnHome)),
      transit: make(transitSegments),
    };
  }, [activeLocations, route, selectedDay, selectedReservationIds]);

  // Visible flight/transit segments for arrow markers
  const visibleSegments = useMemo(() => {
    const include = (date: string, reservationId: string) =>
      !selectedDay || selectedReservationIds.has(reservationId) || String(date ?? '') === selectedDay;
    return [
      ...(route?.flights ?? []).filter((s) => include(s.date, s.reservationId)),
      ...(route?.transits ?? []).filter((s) => include(s.date, s.reservationId)),
    ];
  }, [route, selectedDay, selectedReservationIds]);

  // Sheet drag logic
  const compactTop = windowHeight * (1 - SHEET_COMPACT);
  const expandedTop = windowHeight * (1 - SHEET_EXPANDED);
  const sheetY = useRef(new Animated.Value(compactTop)).current;
  const dragStartY = useRef(compactTop);
  const lastY = useRef(compactTop);
  const currentSnap = useRef(compactTop);

  const snapSheet = useCallback((toValue: number) => {
    currentSnap.current = toValue;
    Animated.spring(sheetY, { toValue, useNativeDriver: false, stiffness: 300, damping: 30 }).start();
  }, [sheetY]);

  const sheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      sheetY.stopAnimation((value) => {
        dragStartY.current = value;
        lastY.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => {
      const newY = Math.min(Math.max(dragStartY.current + gesture.dy, expandedTop), windowHeight - HANDLE_HEIGHT);
      sheetY.setValue(newY);
      lastY.current = newY;
    },
    onPanResponderRelease: (_, gesture) => {
      const position = lastY.current;
      const mid = (compactTop + expandedTop) / 2;
      // Fast swipe up → expand
      if (gesture.vy < -0.5) { snapSheet(expandedTop); return; }
      // Fast swipe down → compact
      if (gesture.vy > 0.5) { snapSheet(compactTop); return; }
      // Settle to nearest
      snapSheet(position < mid ? expandedTop : compactTop);
    },
  }), [sheetY, compactTop, expandedTop, windowHeight, snapSheet]);

  if (tripLoading || !uiTrip) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}><ActivityIndicator /></View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {/* Full-screen map */}
      <Map style={StyleSheet.absoluteFill} mapStyle={mode === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}>
        <Camera
          key={selectedDay ?? 'all-days'}
          initialViewState={bounds ? { bounds, padding: { top: 80 + insets.top, bottom: windowHeight * SHEET_COMPACT + 20, left: 30, right: 30 } } : undefined}
        />
        {lineSets.local && <GeoJSONSource id="td-local" data={lineSets.local}><Layer id="td-local-line" type="line" style={{ lineColor: '#2563eb', lineWidth: 2.5, lineOpacity: 0.5 }} /></GeoJSONSource>}
        {lineSets.outbound && <GeoJSONSource id="td-outbound" data={lineSets.outbound}><Layer id="td-outbound-line" type="line" style={{ lineColor: '#2563eb', lineWidth: 3, lineDasharray: [5, 4], lineOpacity: 0.85 }} /></GeoJSONSource>}
        {lineSets.returns && <GeoJSONSource id="td-returns" data={lineSets.returns}><Layer id="td-returns-line" type="line" style={{ lineColor: '#356a4c', lineWidth: 3.5, lineDasharray: [6, 4], lineOpacity: 0.9 }} /></GeoJSONSource>}
        {lineSets.transit && <GeoJSONSource id="td-transit" data={lineSets.transit}><Layer id="td-transit-line" type="line" style={{ lineColor: '#8b5cf6', lineWidth: 2.5, lineDasharray: [3, 2], lineOpacity: 0.8 }} /></GeoJSONSource>}
        {visibleSegments.map((segment, index) => {
          const isReturn = 'isReturnHome' in segment && segment.isReturnHome;
          const isTransit = 'type' in segment;
          const color = isReturn ? '#356a4c' : isTransit ? '#8b5cf6' : '#2563eb';
          const arrowIcon: keyof typeof MaterialCommunityIcons.glyphMap = isReturn ? 'chevron-double-right' : isTransit ? 'chevron-right' : 'airplane';
          const angle = Math.atan2(segment.to.lat - segment.from.lat, segment.to.lng - segment.from.lng) * 180 / Math.PI;
          return <Marker key={`arrow-${segment.reservationId}-${index}`} lngLat={[(segment.from.lng + segment.to.lng) / 2, (segment.from.lat + segment.to.lat) / 2]} anchor="center"><MaterialCommunityIcons name={arrowIcon} size={22} color={color} style={{ transform: [{ rotate: `${angle}deg` }] }} /></Marker>;
        })}
        {activeLocations.map((location, index) => {
          const type = String(location.type ?? 'other').toLowerCase();
          return (
            <Marker key={`loc-${location.reservationId}-${index}`} lngLat={[location.lng, location.lat]}>
              <PinBadge
                label={selectedDay ? '' : String(index + 1)}
                icon={selectedDay ? ROUTE_ICONS[type] ?? 'map-marker' : undefined}
                color={ROUTE_COLORS[type] ?? '#2563eb'}
                size={28}
              />
            </Marker>
          );
        })}
      </Map>

      {/* Top overlay: back button + trip name */}
      <View style={[styles.topOverlay, { paddingTop: insets.top }]}>
        <IconButton
          icon={() => <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />}
          onPress={() => router.navigate('/trips')}
          style={styles.backButton}
          accessibilityLabel="Back"
        />
        <View style={styles.topInfo}>
          <Text variant="titleMedium" style={styles.topTitle} numberOfLines={1}>{uiTrip.title}</Text>
          <Text variant="bodySmall" style={styles.topSubtitle}>{uiTrip.date} · {uiTrip.duration}</Text>
        </View>
      </View>

      {/* Bottom sheet: itinerary */}
      <Animated.View style={[styles.sheet, { top: sheetY, backgroundColor: theme.colors.surface }]}>
        <View {...sheetPan.panHandlers} style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.colors.outline }]} />
        </View>
        <View style={styles.sheetHeaderRow}>
          <Text variant="titleLarge" style={styles.sheetTitle}>{uiTrip.title}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{uiTrip.destinations.map((d) => d.location).join(' → ')}</Text>
        </View>

        {/* Day filter chips */}
        <View style={styles.dayChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
            <Pressable
              style={[styles.chip, !selectedDay && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={{ color: !selectedDay ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 13 }}>All days</Text>
            </Pressable>
            {reservationGroups.map((group, index) => (
              <Pressable
                key={group.date}
                style={[styles.chip, selectedDay === group.date && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                onPress={() => setSelectedDay(selectedDay === group.date ? null : group.date)}
              >
                <Text style={{ color: selectedDay === group.date ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 13 }}>Day {index + 1}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Divider />

        {/* Itinerary content */}
        <ScrollView style={styles.itineraryScroll} contentContainerStyle={styles.itineraryContent} showsVerticalScrollIndicator={false}>
          {reservationsLoading ? (
            <View style={styles.centerSmall}><ActivityIndicator /></View>
          ) : filteredGroups.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 20 }}>No reservations yet.</Text>
          ) : (
            filteredGroups.map((group, gIndex) => (
              <View key={group.date} style={styles.dayGroup}>
                <Pressable
                  style={[styles.dayHeader, { backgroundColor: theme.colors.surfaceVariant }]}
                  onPress={() => router.push(`/trips/${tripId}/day/${group.date}`)}
                >
                  <Text variant="titleSmall" style={styles.dayLabel}>{group.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
                {group.reservations.map((reservation) => (
                  <View key={reservation.id} style={styles.reservationItem}>
                    <ReservationRow reservation={reservation} />
                  </View>
                ))}
                {gIndex < filteredGroups.length - 1 && <Divider style={{ marginVertical: 8 }} />}
              </View>
            ))
          )}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerSmall: { paddingVertical: 24, alignItems: 'center' },

  // Top overlay
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  backButton: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22 },
  topInfo: { flex: 1, marginLeft: 4 },
  topTitle: { color: '#fff', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  topSubtitle: { color: 'rgba(255,255,255,0.85)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // Bottom sheet
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 12 },
  sheetHandle: { paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  handleBar: { width: 40, height: 5, borderRadius: 3 },
  sheetHeaderRow: { paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { fontWeight: '700', marginBottom: 2 },

  // Day chips
  dayChipsRow: { height: 48 },
  dayChips: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, height: 48 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(150,150,150,0.3)' },

  // Itinerary
  itineraryScroll: { flex: 1 },
  itineraryContent: { paddingHorizontal: 16, paddingTop: 12 },
  dayGroup: { marginBottom: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 6 },
  dayLabel: { fontWeight: '700' },
  reservationItem: { marginBottom: 2 },
});
