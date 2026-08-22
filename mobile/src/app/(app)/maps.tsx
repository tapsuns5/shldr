import { useMemo } from 'react';
import { View, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, useTheme } from 'react-native-paper';
import { buildFlightRoutesGeoJson, MAP_STYLE_DARK, MAP_STYLE_LIGHT } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useAccountMapData } from '@/hooks/use-map-data';
import { PinBadge } from '@/components/map/PinBadge';
import { StatChip } from '@/components/map/StatChip';
import { boundsFromPoints } from '@/lib/map-bounds';

export default function TravelMapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scheme = useColorScheme();

  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data, isLoading } = useAccountMapData(accountId);

  const flightGeoJson = useMemo(
    () => (data?.flightRoutes ? buildFlightRoutesGeoJson(data.flightRoutes) : null),
    [data?.flightRoutes]
  );

  const bounds = useMemo(() => {
    if (!data) return null;
    const points = [
      ...data.pins.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...data.wishlist.filter((w) => w.lat != null && w.lng != null).map((w) => ({ lat: w.lat!, lng: w.lng! })),
    ];
    return boundsFromPoints(points, 2);
  }, [data]);

  const mapStyle = scheme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  const pinColor = scheme === 'dark' ? '#60a5fa' : '#2563eb';
  const wishlistColor = scheme === 'dark' ? '#f472b6' : '#db2777';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Travel map" />
      </Appbar.Header>

      {isLoading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <Map style={styles.flex} mapStyle={mapStyle}>
            <Camera initialViewState={bounds ? { bounds, padding: { top: 60, bottom: 60, left: 40, right: 40 } } : undefined} />

            {flightGeoJson && flightGeoJson.features.length > 0 ? (
              <GeoJSONSource id="flight-arcs" data={flightGeoJson}>
                <Layer id="flight-arcs-line" type="line" style={{ lineColor: pinColor, lineWidth: 1.5, lineOpacity: 0.65 }} />
              </GeoJSONSource>
            ) : null}

            {data.pins
              .filter((p) => p.lat !== 0 || p.lng !== 0)
              .map((pin) => (
                <Marker key={pin.id} lngLat={[pin.lng, pin.lat]} anchor="center">
                  <PinBadge label={String(pin.visitCount)} color={pinColor} size={pin.visitCount > 1 ? 30 : 24} />
                </Marker>
              ))}

            {data.wishlist
              .filter((w) => w.lat != null && w.lng != null && !w.visited)
              .map((w) => (
                <Marker key={w.id} lngLat={[w.lng!, w.lat!]} anchor="center">
                  <PinBadge label="★" color={wishlistColor} size={22} />
                </Marker>
              ))}
          </Map>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stats}>
            <StatChip label="Countries" value={data.stats.countriesCount} />
            <StatChip label="Cities" value={data.stats.citiesCount} />
            <StatChip label="Trips" value={data.stats.tripsCount} />
            <StatChip label="Flights" value={data.stats.flightsCount} />
            <StatChip label="Miles flown" value={data.stats.distanceMiles.toLocaleString()} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stats: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
});
