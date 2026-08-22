import { useMemo, useState } from 'react';
import { View, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, FAB, useTheme } from 'react-native-paper';
import { buildFlightRoutesGeoJson, MAP_STYLE_DARK, MAP_STYLE_LIGHT, type MapPin, type WishlistDestination } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useAccountMapData } from '@/hooks/use-map-data';
import { StatChip } from '@/components/map/StatChip';
import { PinBadge } from '@/components/map/PinBadge';
import { AddWishlistDialog } from '@/components/map/AddWishlistDialog';
import { WishlistListDialog } from '@/components/map/WishlistListDialog';
import { WishlistItemDialog } from '@/components/map/WishlistItemDialog';
import { boundsFromPoints } from '@/lib/map-bounds';

function pinsGeoJson(pins: MapPin[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: pins
      .filter((p) => p.lat !== 0 || p.lng !== 0)
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, city: p.city, country: p.country, visitCount: p.visitCount },
      })),
  };
}

export default function TravelMapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scheme = useColorScheme();

  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data, isLoading } = useAccountMapData(accountId);

  const [addVisible, setAddVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<WishlistDestination | null>(null);

  const flightGeoJson = useMemo(
    () => (data?.flightRoutes ? buildFlightRoutesGeoJson(data.flightRoutes) : null),
    [data?.flightRoutes]
  );

  const cityPins = useMemo(() => (data?.pins ? pinsGeoJson(data.pins) : null), [data?.pins]);

  const bounds = useMemo(() => {
    if (!data) return null;
    const points = [
      ...data.pins.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...data.wishlist.filter((w) => w.lat != null && w.lng != null).map((w) => ({ lat: w.lat!, lng: w.lng! })),
    ];
    return boundsFromPoints(points, 2);
  }, [data]);

  const isDark = scheme === 'dark';
  const mapStyle = isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  const pinColor = isDark ? '#60a5fa' : '#2563eb';
  const pinBorder = isDark ? '#1e3a5f' : '#ffffff';
  const visitedColor = isDark ? '#60a5fa' : '#2563eb';
  const bucketColor = isDark ? '#fbbf24' : '#f59e0b';

  if (isLoading || !data || !accountId) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Travel map" />
        </Appbar.Header>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Travel map" />
        <Appbar.Action icon="heart-outline" onPress={() => setListVisible(true)} />
      </Appbar.Header>

      <Map style={styles.flex} mapStyle={mapStyle}>
        <Camera initialViewState={bounds ? { bounds, padding: { top: 60, bottom: 60, left: 40, right: 40 } } : undefined} />

        {flightGeoJson && flightGeoJson.features.length > 0 ? (
          <GeoJSONSource id="flight-arcs" data={flightGeoJson}>
            <Layer id="flight-arcs-line" type="line" style={{ lineColor: pinColor, lineWidth: 1.5, lineOpacity: 0.65 }} />
          </GeoJSONSource>
        ) : null}

        {/* City pins, clustered at low zoom — mirrors components/map/layers/MarkerLayer.tsx on web. */}
        {cityPins && cityPins.features.length > 0 ? (
          <GeoJSONSource id="city-pins" data={cityPins} cluster clusterMaxZoom={8} clusterRadius={40}>
            <Layer
              id="pin-clusters"
              type="circle"
              filter={['has', 'point_count']}
              style={{
                circleColor: [
                  'step',
                  ['get', 'point_count'],
                  isDark ? '#3b82f6' : '#2563eb',
                  5,
                  isDark ? '#8b5cf6' : '#7c3aed',
                  10,
                  isDark ? '#ec4899' : '#db2777',
                ],
                circleRadius: ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
                circleOpacity: 0.85,
                circleStrokeWidth: 2,
                circleStrokeColor: pinBorder,
              }}
            />
            <Layer
              id="pin-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              style={{ textField: '{point_count_abbreviated}', textSize: 12, textColor: '#ffffff' }}
            />
            <Layer
              id="pin-unclustered"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              style={{
                circleColor: pinColor,
                circleRadius: ['interpolate', ['linear'], ['get', 'visitCount'], 1, 6, 3, 9, 5, 12],
                circleStrokeWidth: 2,
                circleStrokeColor: pinBorder,
                circleOpacity: 0.9,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {data.wishlist
          .filter((w) => w.type === 'city' && w.lat != null && w.lng != null)
          .map((w) => (
            <Marker key={w.id} lngLat={[w.lng!, w.lat!]} anchor="center" onPress={() => setSelectedWishlist(w)}>
              <PinBadge label="" color={w.visited ? visitedColor : bucketColor} size={16} />
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

      <FAB icon="star-plus-outline" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color={theme.colors.onPrimary} onPress={() => setAddVisible(true)} />

      <AddWishlistDialog visible={addVisible} onDismiss={() => setAddVisible(false)} accountId={accountId} />
      <WishlistListDialog
        visible={listVisible}
        onDismiss={() => setListVisible(false)}
        accountId={accountId}
        items={data.wishlist}
        onAddPress={() => {
          setListVisible(false);
          setAddVisible(true);
        }}
      />
      {selectedWishlist ? (
        <WishlistItemDialog item={selectedWishlist} accountId={accountId} onDismiss={() => setSelectedWishlist(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stats: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  fab: { position: 'absolute', right: 20, bottom: 92 },
});
