'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MapClusterLayer,
  MapControls,
  MapGeoJSON,
  useMap,
} from '@/components/ui/map';
import MapViewToggle from './controls/MapViewToggle';
import MapStatsPanel from './panels/MapStatsPanel';
import WishlistPanel from './panels/WishlistPanel';
import { MapProvider, useTravelMap } from './MapProvider';
import { useTravelMapData, usePersistWishlistVisits, type MapPin, type MapPinTrip, type WishlistDestination } from '@/hooks/useTravelMapData';
import { useTravelStats } from '@/hooks/useTravelStats';
import { type FlightRoute } from '@/lib/map/arcRoutes';

const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

interface PinProperties {
  city: string;
  country: string;
  visitCount: number;
  pinId: string;
  trips: { id: string; title: string; startDate: string; endDate: string }[];
}

function TripListPopup({
  location,
  trips,
  darkMode,
  onSelect,
}: {
  location: string;
  trips: MapPinTrip[];
  darkMode: boolean;
  onSelect: (tripId: string) => void;
}) {
  if (trips.length === 0) return null;
  const textPrimary = darkMode ? '#e2e8f0' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const hoverBg = darkMode ? 'rgba(51,65,85,0.6)' : 'rgba(241,245,249,0.8)';
  return (
    <div className="space-y-2 min-w-[180px] max-w-[260px]">
      <p
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: textSecondary }}
      >
        {trips.length === 1 ? 'Visited on 1 trip' : `Visited on ${trips.length} trips`}
      </p>
      <p className="font-semibold text-sm leading-tight" style={{ color: textPrimary }}>
        {location}
      </p>
      <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(trip.id);
            }}
            className="w-full text-left rounded-md transition-colors px-2 py-1.5"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <p className="text-sm font-medium leading-tight" style={{ color: textPrimary }}>
              {trip.title}
            </p>
            <p className="text-xs" style={{ color: textSecondary }}>
              {dayjs(trip.startDate).format('MMM D, YYYY')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

interface TravelMapInnerProps {
  accountId: string;
  darkMode?: boolean;
  mini?: boolean;
}

function FlightArcs({ routes, darkMode }: { routes: FlightRoute[]; darkMode: boolean }) {
  const color = darkMode ? '#60a5fa' : '#3b82f6';
  return (
    <>
      {routes.map((r) => (
        <MapGeoJSON
          key={r.id}
          data={r.arcGeoJson}
          fillPaint={false}
          linePaint={{
            'line-color': color,
            'line-width': 1.5,
            'line-opacity': 0.65,
            'line-dasharray': [2, 2],
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

function CountryHighlight({
  visitedCountryCodes,
  pins,
  darkMode,
  onSelectTrip,
}: {
  visitedCountryCodes: string[];
  pins: MapPin[];
  darkMode: boolean;
  onSelectTrip: (tripId: string) => void;
}) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<{
    code: string;
    country: string;
    lng: number;
    lat: number;
  } | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => {});
  }, []);

  const tripsForCountry = useMemo(() => {
    if (!selectedCountry) return [];
    const set = new Set<string>();
    const trips: MapPinTrip[] = [];
    for (const pin of pins) {
      if (pin.countryCode !== selectedCountry.code) continue;
      for (const trip of pin.trips) {
        if (!set.has(trip.id)) {
          set.add(trip.id);
          trips.push(trip);
        }
      }
    }
    return trips.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
  }, [pins, selectedCountry]);

  if (!geojson || visitedCountryCodes.length === 0) return null;

  const visitedSet = new Set(visitedCountryCodes);
  const visitedFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: geojson.features.filter(
      (f) => f.properties && visitedSet.has(f.properties['ISO_A2'])
    ),
  };

  if (visitedFeatures.features.length === 0) return null;

  return (
    <>
      <MapGeoJSON
        data={visitedFeatures}
        fillPaint={{
          'fill-color': darkMode ? '#60a5fa' : '#3b82f6',
          'fill-opacity': 0.3,
        }}
        linePaint={{
          'line-color': darkMode ? '#93c5fd' : '#2563eb',
          'line-width': 0.8,
          'line-opacity': 0.6,
        }}
        interactive
        onClick={(e: { feature: GeoJSON.Feature; longitude: number; latitude: number }) => {
          const code = e.feature.properties?.['ISO_A2'] as string | undefined;
          const name = e.feature.properties?.['ADMIN'] as string | undefined;
          if (!code) return;
          setSelectedCountry({
            code,
            country: name || code,
            lng: e.longitude,
            lat: e.latitude,
          });
        }}
      />
      {selectedCountry && (
        <MapMarker longitude={selectedCountry.lng} latitude={selectedCountry.lat}>
          <MarkerContent>
            <div style={{ width: 0, height: 0 }} />
          </MarkerContent>
          <MarkerPopup closeButton onClose={() => setSelectedCountry(null)}>
            <TripListPopup
              location={selectedCountry.country}
              trips={tripsForCountry}
              darkMode={darkMode}
              onSelect={(tripId) => {
                setSelectedCountry(null);
                onSelectTrip(tripId);
              }}
            />
          </MarkerPopup>
        </MapMarker>
      )}
    </>
  );
}

function WishlistCountryHighlight({
  items,
  darkMode,
  onSelect,
}: {
  items: WishlistDestination[];
  darkMode: boolean;
  onSelect: (target: WishlistFlyTarget) => void;
}) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => {});
  }, []);

  const countryItems = items.filter((i) => i.type === 'country' && i.countryCode);
  if (!geojson || countryItems.length === 0) return null;

  const itemsByCode = new globalThis.Map(countryItems.map((i) => [i.countryCode, i]));
  const visitedCodes = new Set(countryItems.filter((i) => i.visited).map((i) => i.countryCode));
  const notVisitedCodes = new Set(countryItems.filter((i) => !i.visited).map((i) => i.countryCode));

  const buildFeatures = (codes: Set<string | null>): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: geojson.features.filter((f) => f.properties && codes.has(f.properties['ISO_A2'])),
  });

  const visitedFeatures = buildFeatures(visitedCodes);
  const notVisitedFeatures = buildFeatures(notVisitedCodes);

  const handleCountryClick = (e: { feature: GeoJSON.Feature; longitude: number; latitude: number }) => {
    const code = e.feature.properties?.['ISO_A2'];
    const item = itemsByCode.get(code);
    if (item && item.lat != null && item.lng != null) {
      onSelect({ lng: item.lng, lat: item.lat, zoom: 4 });
    } else {
      onSelect({ lng: e.longitude, lat: e.latitude, zoom: 4 });
    }
  };

  return (
    <>
      {notVisitedFeatures.features.length > 0 && (
        <MapGeoJSON
          data={notVisitedFeatures}
          fillPaint={{
            'fill-color': darkMode ? '#94a3b8' : '#94a3b8',
            'fill-opacity': 0.3,
          }}
          linePaint={{
            'line-color': darkMode ? '#cbd5e1' : '#64748b',
            'line-width': 0.8,
            'line-opacity': 0.6,
          }}
          interactive
          onClick={handleCountryClick}
        />
      )}
      {visitedFeatures.features.length > 0 && (
        <MapGeoJSON
          data={visitedFeatures}
          fillPaint={{
            'fill-color': darkMode ? '#60a5fa' : '#3b82f6',
            'fill-opacity': 0.3,
          }}
          linePaint={{
            'line-color': darkMode ? '#93c5fd' : '#2563eb',
            'line-width': 0.8,
            'line-opacity': 0.6,
          }}
          interactive
          onClick={handleCountryClick}
        />
      )}
    </>
  );
}

function PinMarkers({
  pins,
  darkMode,
  onSelectTrip,
}: {
  pins: MapPin[];
  darkMode: boolean;
  onSelectTrip: (tripId: string) => void;
}) {
  const validPins = pins.filter((p) => p.lat !== 0 || p.lng !== 0);

  const pinColor = darkMode ? '#60a5fa' : '#2563eb';
  const borderColor = darkMode ? '#0f172a' : '#ffffff';

  return (
    <>
      {validPins.map((pin) => {
        const size = Math.min(8 + pin.visitCount * 2, 18);
        return (
          <MapMarker key={pin.id} longitude={pin.lng} latitude={pin.lat}>
            <MarkerContent>
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: pinColor,
                  border: `2px solid ${borderColor}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                className="hover:scale-125"
              />
            </MarkerContent>
            <MarkerTooltip>{pin.city}, {pin.country}</MarkerTooltip>
            <MarkerPopup closeButton>
              <TripListPopup
                location={`${pin.city}, ${pin.country}`}
                trips={pin.trips}
                darkMode={darkMode}
                onSelect={onSelectTrip}
              />
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}

interface WishlistFlyTarget {
  lng: number;
  lat: number;
  zoom: number;
}

function WishlistMarkers({
  items,
  darkMode,
  onSelect,
}: {
  items: WishlistDestination[];
  darkMode: boolean;
  onSelect: (target: WishlistFlyTarget) => void;
}) {
  const validItems = items.filter((w) => w.type === 'city' && w.lat != null && w.lng != null);

  const borderColor = darkMode ? '#0f172a' : '#ffffff';

  return (
    <>
      {validItems.map((item) => {
        const pinColor = item.visited
          ? (darkMode ? '#60a5fa' : '#2563eb')
          : (darkMode ? '#fbbf24' : '#f59e0b');
        return (
          <MapMarker
            key={item.id}
            longitude={item.lng!}
            latitude={item.lat!}
            onClick={() => onSelect({ lng: item.lng!, lat: item.lat!, zoom: 9 })}
          >
            <MarkerContent>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: pinColor,
                  border: `2px solid ${borderColor}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                className="hover:scale-125"
              />
            </MarkerContent>
            <MarkerTooltip>{item.city}, {item.country}</MarkerTooltip>
            <MarkerPopup closeButton>
              <div className="space-y-1 min-w-[120px]">
                <p className="font-semibold text-sm leading-tight">{item.city}</p>
                <p className="text-muted-foreground text-xs">{item.country}</p>
                <p
                  className="text-xs font-medium"
                  style={{ color: item.visited ? (darkMode ? '#60a5fa' : '#2563eb') : (darkMode ? '#fbbf24' : '#d97706') }}
                >
                  {item.visited ? 'Visited' : 'Bucket list'}
                </p>
                {item.note && (
                  <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
                )}
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}

/**
 * Lives inside <Map> so it can access the underlying MapLibre instance to
 * fly the camera to a selected wishlist destination, or fit the viewport to
 * show every bucket-list pin the first time the Wishlist view is opened.
 */
function WishlistCameraController({
  active,
  items,
  flyTarget,
  onFlyComplete,
}: {
  active: boolean;
  items: WishlistDestination[];
  flyTarget: WishlistFlyTarget | null;
  onFlyComplete: () => void;
}) {
  const { map } = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!map || !active || hasFitRef.current) return;

    const points = items
      .filter((i) => i.lat != null && i.lng != null)
      .map((i) => [i.lng as number, i.lat as number] as [number, number]);
    if (points.length === 0) return;

    hasFitRef.current = true;

    if (points.length === 1) {
      map.flyTo({ center: points[0], zoom: 5, duration: 1000 });
      return;
    }

    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, maxZoom: 6, duration: 1000 }
    );
  }, [map, active, items]);

  useEffect(() => {
    if (!active) hasFitRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!map || !flyTarget) return;
    map.flyTo({ center: [flyTarget.lng, flyTarget.lat], zoom: flyTarget.zoom, duration: 1200 });
    onFlyComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, flyTarget]);

  return null;
}

function TravelMapInner({ accountId, darkMode = false, mini = false }: TravelMapInnerProps) {
  const router = useRouter();
  const { view } = useTravelMap();
  const mapData = useTravelMapData(accountId);
  const stats = useTravelStats(mapData);

  const handleSelectTrip = (tripId: string) => {
    router.push(`/tripdetails/${tripId}`);
  };

  const showCountries = view === 'footprints';
  const showFlights = view === 'footprints';
  const showMarkers = view === 'footprints';
  const showWishlist = view === 'wishlist';

  // Local overrides on top of server data so add/remove feel instant without a full refetch.
  const [addedItems, setAddedItems] = useState<WishlistDestination[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const wishlist = useMemo(() => {
    const base = mapData.wishlist.filter((w) => !removedIds.has(w.id));
    const added = addedItems.filter((w) => !removedIds.has(w.id));
    return [...added, ...base];
  }, [mapData.wishlist, addedItems, removedIds]);

  usePersistWishlistVisits(wishlist);

  const [wishlistFlyTarget, setWishlistFlyTarget] = useState<WishlistFlyTarget | null>(null);

  const handleWishlistAdded = (item: WishlistDestination) => {
    setAddedItems((prev) => [item, ...prev]);
    if (item.lat != null && item.lng != null) {
      setWishlistFlyTarget({ lng: item.lng, lat: item.lat, zoom: item.type === 'country' ? 4 : 9 });
    }
  };

  const handleWishlistRemoved = (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
  };

  const handleWishlistSelect = (item: WishlistDestination) => {
    if (item.lat == null || item.lng == null) return;
    setWishlistFlyTarget({ lng: item.lng, lat: item.lat, zoom: item.type === 'country' ? 4 : 9 });
  };

  const pinGeoJson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.Point, PinProperties> => ({
    type: 'FeatureCollection',
    features: mapData.pins
      .filter((p) => p.lat !== 0 || p.lng !== 0)
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          city: p.city,
          country: p.country,
          visitCount: p.visitCount,
          pinId: p.id,
          trips: p.trips,
        },
      })),
  }), [mapData.pins]);

  const [selectedClusterPin, setSelectedClusterPin] = useState<{
    coordinates: [number, number];
    properties: PinProperties;
  } | null>(null);

  const mapStyles = {
    light: MAP_STYLE_LIGHT,
    dark: MAP_STYLE_DARK,
  };

  return (
    <div className="relative w-full h-full">
      <Map
        center={[0, 20]}
        zoom={mini ? 1.2 : 1.8}
        styles={mapStyles}
        theme={darkMode ? 'dark' : 'light'}
        className="w-full h-full"
        cooperativeGestures={mini}
      >
        {showCountries && (
          <CountryHighlight
            visitedCountryCodes={mapData.visitedCountryCodes}
            pins={mapData.pins}
            darkMode={darkMode}
            onSelectTrip={handleSelectTrip}
          />
        )}

        {showFlights && mapData.flightRoutes.length > 0 && (
          <FlightArcs routes={mapData.flightRoutes} darkMode={darkMode} />
        )}

        {showMarkers && mapData.pins.length > 0 && (
          <>
            {mapData.pins.length <= 30 ? (
              <PinMarkers pins={mapData.pins} darkMode={darkMode} onSelectTrip={handleSelectTrip} />
            ) : (
              <>
                <MapClusterLayer<PinProperties>
                  data={pinGeoJson}
                  clusterRadius={40}
                  clusterMaxZoom={8}
                  clusterColors={[
                    darkMode ? '#3b82f6' : '#2563eb',
                    darkMode ? '#8b5cf6' : '#7c3aed',
                    darkMode ? '#ec4899' : '#db2777',
                  ]}
                  pointColor={darkMode ? '#60a5fa' : '#2563eb'}
                  onPointClick={(feature, coordinates) => {
                    setSelectedClusterPin({ coordinates, properties: feature.properties });
                  }}
                />
                {selectedClusterPin && (
                  <MapMarker
                    longitude={selectedClusterPin.coordinates[0]}
                    latitude={selectedClusterPin.coordinates[1]}
                  >
                    <MarkerContent>
                      <div style={{ width: 0, height: 0 }} />
                    </MarkerContent>
                    <MarkerPopup
                      closeButton
                      onClose={() => setSelectedClusterPin(null)}
                    >
                      <TripListPopup
                        location={`${selectedClusterPin.properties.city}, ${selectedClusterPin.properties.country}`}
                        trips={selectedClusterPin.properties.trips || []}
                        darkMode={darkMode}
                        onSelect={(tripId) => {
                          setSelectedClusterPin(null);
                          handleSelectTrip(tripId);
                        }}
                      />
                    </MarkerPopup>
                  </MapMarker>
                )}
              </>
            )}
          </>
        )}

        {showWishlist && (
          <WishlistCountryHighlight items={wishlist} darkMode={darkMode} onSelect={setWishlistFlyTarget} />
        )}

        {showWishlist && wishlist.length > 0 && (
          <WishlistMarkers items={wishlist} darkMode={darkMode} onSelect={setWishlistFlyTarget} />
        )}

        {!mini && (
          <WishlistCameraController
            active={showWishlist}
            items={wishlist}
            flyTarget={wishlistFlyTarget}
            onFlyComplete={() => setWishlistFlyTarget(null)}
          />
        )}

        {!mini && <MapControls position="bottom-right" showZoom showFullscreen />}
      </Map>

      {!mini && <MapViewToggle darkMode={darkMode} />}
      {!mini && showWishlist && (
        <WishlistPanel
          accountId={accountId}
          items={wishlist}
          darkMode={darkMode}
          onAdded={handleWishlistAdded}
          onRemoved={handleWishlistRemoved}
          onSelect={handleWishlistSelect}
        />
      )}
      {!mini && <MapStatsPanel stats={stats} darkMode={darkMode} />}

      {mapData.loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-sm font-medium px-4 py-2 rounded-full shadow"
            style={{
              background: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
              color: darkMode ? '#94a3b8' : '#64748b',
            }}
          >
            Loading travel data…
          </div>
        </div>
      )}
    </div>
  );
}

interface TravelMapProps {
  accountId: string;
  darkMode?: boolean;
  mini?: boolean;
}

export default function TravelMap({ accountId, darkMode = false, mini = false }: TravelMapProps) {
  return (
    <MapProvider>
      <TravelMapInner accountId={accountId} darkMode={darkMode} mini={mini} />
    </MapProvider>
  );
}
