import { useMemo, useRef } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, useTheme } from 'react-native-paper';
import { generateCurvedLine, MAP_STYLE_DARK, MAP_STYLE_LIGHT } from '@shldr/shared';
import { useTripRoute } from '@/hooks/use-trip-route';
import { PinBadge } from '@/components/map/PinBadge';
import { boundsFromPoints } from '@/lib/map-bounds';

const TYPE_COLORS: Record<string, string> = {
  flight: '#2563eb',
  hotel: '#7c3aed',
  car: '#d97706',
  rail: '#0891b2',
  cruise: '#0891b2',
  activity: '#16a34a',
  restaurant: '#dc2626',
  transport: '#0891b2',
  other: '#6b7280',
};

function buildLinesGeoJson(
  segments: { from: { lat: number; lng: number }; to: { lat: number; lng: number } }[]
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: segments.map((s) => ({
      type: 'Feature',
      properties: {},
      geometry: generateCurvedLine([s.from.lng, s.from.lat], [s.to.lng, s.to.lat]),
    })),
  };
}

export default function TripMapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scheme = useColorScheme();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: route, isLoading } = useTripRoute(tripId);
  const cameraRef = useRef<CameraRef>(null);

  const sortedLocations = useMemo(
    () => (route?.locations ? [...route.locations].sort((a, b) => a.date.localeCompare(b.date)) : []),
    [route]
  );

  const flightLines = useMemo(
    () => (route?.flights ? buildLinesGeoJson(route.flights) : null),
    [route?.flights]
  );
  const transitLines = useMemo(
    () => (route?.transits ? buildLinesGeoJson(route.transits) : null),
    [route?.transits]
  );

  const bounds = useMemo(
    () => boundsFromPoints(sortedLocations.map((l) => ({ lat: l.lat, lng: l.lng }))),
    [sortedLocations]
  );

  const mapStyle = scheme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : sortedLocations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator animating={false} />
        </View>
      ) : (
        <Map style={styles.flex} mapStyle={mapStyle}>
          <Camera
            ref={cameraRef}
            initialViewState={bounds ? { bounds, padding: { top: 60, bottom: 60, left: 40, right: 40 } } : undefined}
          />

          {flightLines && flightLines.features.length > 0 ? (
            <GeoJSONSource id="trip-flights" data={flightLines}>
              <Layer
                id="trip-flights-line"
                type="line"
                style={{ lineColor: TYPE_COLORS.flight, lineWidth: 2.5, lineDasharray: [2, 1.5] }}
              />
            </GeoJSONSource>
          ) : null}

          {transitLines && transitLines.features.length > 0 ? (
            <GeoJSONSource id="trip-transits" data={transitLines}>
              <Layer id="trip-transits-line" type="line" style={{ lineColor: TYPE_COLORS.transport, lineWidth: 2 }} />
            </GeoJSONSource>
          ) : null}

          {sortedLocations.map((location, index) => (
            <Marker key={`${location.reservationId}-${index}`} lngLat={[location.lng, location.lat]} anchor="center">
              <PinBadge label={String(index + 1)} color={TYPE_COLORS[location.type] ?? TYPE_COLORS.other} />
            </Marker>
          ))}
        </Map>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
