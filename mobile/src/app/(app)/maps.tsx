import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import { ActivityIndicator, FAB, Text, useTheme } from 'react-native-paper';
import { buildFlightRoutesGeoJson, MAP_STYLE_DARK, MAP_STYLE_LIGHT, type WishlistDestination } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useAccountMapData } from '@/hooks/use-map-data';
import { PinBadge } from '@/components/map/PinBadge';
import { AddWishlistDialog } from '@/components/map/AddWishlistDialog';
import { WishlistListDialog } from '@/components/map/WishlistListDialog';
import { WishlistItemDialog } from '@/components/map/WishlistItemDialog';
import { boundsFromPoints } from '@/lib/map-bounds';
import { SolarIcon } from '@/components/SolarIcon';
import { useColorMode } from '@/lib/color-mode';

type MapView = 'footprints' | 'wishlist';

function ViewToggle({ view, onChange }: { view: MapView; onChange: (view: MapView) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.viewToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      {(['footprints', 'wishlist'] as MapView[]).map((item) => {
        const active = item === view;
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item)}
            style={[styles.viewOption, active && { backgroundColor: theme.colors.primary }]}
          >
            <SolarIcon name={item === 'footprints' ? 'compass-line-duotone' : 'checklist-line-duotone'} size={16} color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
            <Text variant="labelMedium" style={{ color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: '700' }}>
              {item === 'footprints' ? 'Footprints' : 'Wishlist'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

export default function TravelMapScreen() {
  const theme = useTheme();
  const { mode: scheme } = useColorMode();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data, isLoading } = useAccountMapData(accountId);
  const [view, setView] = useState<MapView>('footprints');
  const [addVisible, setAddVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<WishlistDestination | null>(null);
  const isDark = scheme === 'dark';

  const flightGeoJson = useMemo(() => (data?.flightRoutes ? buildFlightRoutesGeoJson(data.flightRoutes) : null), [data?.flightRoutes]);
  const bounds = useMemo(() => {
    if (!data) return null;
    const points = view === 'wishlist'
      ? data.wishlist.filter((w) => w.lat != null && w.lng != null).map((w) => ({ lat: w.lat!, lng: w.lng! }))
      : data.pins.map((p) => ({ lat: p.lat, lng: p.lng }));
    return boundsFromPoints(points, 2);
  }, [data, view]);

  if (isLoading || !data || !accountId) {
    return <View style={[styles.flex, { backgroundColor: theme.colors.background }]}><View style={styles.center}><ActivityIndicator /></View></View>;
  }

  const wishlistPins = data.wishlist.filter((w) => w.type === 'city' && w.lat != null && w.lng != null);
  const pinColor = isDark ? '#60a5fa' : '#2563eb';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Map
        style={styles.flex}
        mapStyle={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
      >
        <Camera key={view} initialViewState={bounds ? { bounds, padding: { top: 100, bottom: 180, left: 40, right: 40 } } : undefined} />
        {view === 'footprints' && flightGeoJson && flightGeoJson.features.length > 0 ? (
          <GeoJSONSource id="flight-arcs" data={flightGeoJson}>
            <Layer id="flight-arcs-line" type="line" style={{ lineColor: pinColor, lineWidth: 1.5, lineOpacity: 0.65 }} />
          </GeoJSONSource>
        ) : null}
        {view === 'footprints' && data.pins.filter((pin) => pin.lat !== 0 || pin.lng !== 0).map((pin) => (
          <Marker key={pin.id} lngLat={[pin.lng, pin.lat]} anchor="center">
            <PinBadge label={pin.visitCount > 1 ? String(pin.visitCount) : ''} color={pinColor} size={pin.visitCount > 1 ? 24 : 18} />
          </Marker>
        ))}
        {view === 'wishlist' && wishlistPins.map((item) => (
          <Marker key={item.id} lngLat={[item.lng!, item.lat!]} anchor="center" onPress={() => setSelectedWishlist(item)}>
            <PinBadge label="" color={item.visited ? pinColor : isDark ? '#fbbf24' : '#f59e0b'} size={18} />
          </Marker>
        ))}
      </Map>

      <View style={styles.topControls}><ViewToggle view={view} onChange={setView} /></View>
      {view === 'wishlist' ? (
        <Pressable onPress={() => setListVisible(true)} style={[styles.listButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <SolarIcon name="checklist-line-duotone" size={17} color={theme.colors.primary} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>My wishlist</Text>
        </Pressable>
      ) : null}

      <View style={[styles.bottomSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.sheetHandleArea}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.sheetHeader}>
            <Text variant="titleMedium" style={styles.sheetTitle}>{view === 'wishlist' ? 'Wishlist' : 'Your footprints'}</Text>
          </View>
        </View>
        {view === 'wishlist' ? (
          <FAB
            icon="star-plus-outline"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
            onPress={() => setAddVisible(true)}
          />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stats}>
          <Stat label="Countries" value={data.stats.countriesCount} />
          <Stat label="Cities" value={data.stats.citiesCount} />
          <Stat label="Trips" value={data.stats.tripsCount} />
          <Stat label="Flights" value={data.stats.flightsCount} />
          <Stat label="Flown" value={`${data.stats.distanceMiles.toLocaleString()} mi`} />
          <Stat label="Continents" value={data.stats.continentsCount} />
        </ScrollView>
      </View>

      <AddWishlistDialog visible={addVisible} onDismiss={() => setAddVisible(false)} accountId={accountId} />
      <WishlistListDialog visible={listVisible} onDismiss={() => setListVisible(false)} accountId={accountId} items={data.wishlist} onAddPress={() => { setListVisible(false); setAddVisible(true); }} />
      {selectedWishlist ? <WishlistItemDialog item={selectedWishlist} accountId={accountId} onDismiss={() => setSelectedWishlist(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topControls: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
  viewToggle: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, elevation: 4 },
  viewOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 20 },
  listButton: { position: 'absolute', top: 72, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, elevation: 3 },
  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 126, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth, elevation: 12, paddingBottom: 116 },
  sheetHandleArea: { paddingTop: 9, paddingBottom: 3 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 5 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 5 },
  sheetTitle: { fontWeight: '700' },
  stats: { gap: 2, paddingHorizontal: 12, paddingBottom: 11 },
  stat: { minWidth: 72, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5 },
  statValue: { fontWeight: '800', lineHeight: 28 },
  fab: { position: 'absolute', right: 20, top: -70, zIndex: 3 },
});
