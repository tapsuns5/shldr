'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import * as turf from '@turf/turf';
import dayjs from 'dayjs';
import { Box, Typography, Button } from '@mui/material';
import { Home, Building2, Utensils, Car, Plane, Train, Bus, Ship, Ticket, MapPin } from 'lucide-react';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapGeoJSON,
  useMap,
} from '@/components/ui/map';
import { type PlanDay } from '@/hooks/use-trips';

interface TripRouteStop {
  city: string;
  country: string;
  state?: string | null;
  arrivalDate?: string | null;
}

interface TripRouteMapProps {
  tripId: string;
  stops?: TripRouteStop[];
  plans: PlanDay[];
  startDate?: string;
  originAirport?: string | null;
  darkMode?: boolean;
  height?: number;
}

interface RoutePoint {
  id: string;
  details: PlanDay['items'];
  locationTitles: string[];
  lat: number;
  lng: number;
  date: string;
  day: number;
  isHome?: boolean;
  type?: string;
}

function getPointIcon(type?: string, isHome?: boolean) {
  if (isHome) return <Home style={{ width: 14, height: 14, color: '#ffffff' }} />;

  switch (type?.toLowerCase()) {
    case 'hotel':
    case 'lodging':
      return <Building2 style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'restaurant':
    case 'food':
    case 'dining':
      return <Utensils style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'car':
    case 'rental':
    case 'car_rental':
      return <Car style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'flight':
      return <Plane style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'rail':
    case 'train':
      return <Train style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'transport':
    case 'bus':
      return <Bus style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'cruise':
    case 'ferry':
      return <Ship style={{ width: 14, height: 14, color: '#ffffff' }} />;
    case 'activity':
    case 'tour':
    case 'attraction':
      return <Ticket style={{ width: 14, height: 14, color: '#ffffff' }} />;
    default:
      return <MapPin style={{ width: 14, height: 14, color: '#ffffff' }} />;
  }
}

interface RouteLocation {
  reservationId: string;
  date: string;
  title: string;
  type: string;
  lat: number;
  lng: number;
}

interface FlightSegment {
  reservationId: string;
  title: string;
  date: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  dep?: string;
  arr?: string;
  isReturnHome?: boolean;
}

interface TransitSegment {
  reservationId: string;
  type: string;
  title: string;
  date: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

interface RouteData {
  locations: RouteLocation[];
  flights: FlightSegment[];
  transits?: TransitSegment[];
}

const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

function RouteCameraController({ points, selectedDay }: { points: RoutePoint[]; selectedDay: number | null }) {
  const { map } = useMap();
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || points.length === 0) return;

    const pointsKey = `${selectedDay ?? 'all'}:${points.map((p) => `${p.day}:${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('|')}`;
    if (prevKeyRef.current === pointsKey) return;
    prevKeyRef.current = pointsKey;

    if (selectedDay != null) {
      const point = points.find((candidate) => candidate.day === selectedDay);
      if (point) {
        map.flyTo({ center: [point.lng, point.lat], zoom: 7, duration: 900 });
        return;
      }
    }

    const lngs = points.map((point) => point.lng);
    const lats = points.map((point) => point.lat);

    if (lngs.length === 1) {
      map.flyTo({ center: [lngs[0], lats[0]], zoom: 6, duration: 900 });
      return;
    }

    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 30, bottom: 30, left: 20, right: 20 }, maxZoom: 10, duration: 1000 }
    );
  }, [map, points, selectedDay]);

  return null;
}

function generateCurvedLine(
  fromLngLat: [number, number],
  toLngLat: [number, number],
  offsetFactor: number = 0.12,
  numPoints: number = 64
): GeoJSON.LineString {
  const [lng1, lat1] = fromLngLat;
  const [lng2, lat2] = toLngLat;

  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.5) {
    return {
      type: 'LineString',
      coordinates: [fromLngLat, toLngLat],
    };
  }

  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  const normX = -dy / dist;
  const normY = dx / dist;

  const offset = dist * offsetFactor;
  const ctrlLng = midLng + normX * offset;
  const ctrlLat = midLat + normY * offset;

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
    const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
    coordinates.push([lng, lat]);
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

function RouteLayersWithArrows({
  routeGeoJson,
  outboundFlightGeoJson,
  returnFlightGeoJson,
  transitGeoJson,
  markerColor,
}: {
  routeGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  outboundFlightGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  returnFlightGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  transitGeoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  markerColor: string;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Flight Arrow Icon
    if (!map.hasImage('route-arrow-flight')) {
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(3, 4);
        ctx.lineTo(21, 12);
        ctx.lineTo(3, 20);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();
        const imageData = ctx.getImageData(0, 0, 24, 24);
        map.addImage('route-arrow-flight', imageData, { sdf: true });
      }
    }

    // Return Arrow Icon
    if (!map.hasImage('route-arrow-return')) {
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Double chevron for return flight
        ctx.moveTo(2, 4);
        ctx.lineTo(14, 12);
        ctx.lineTo(2, 20);
        ctx.lineTo(6, 12);
        ctx.closePath();
        ctx.moveTo(10, 4);
        ctx.lineTo(22, 12);
        ctx.lineTo(10, 20);
        ctx.lineTo(14, 12);
        ctx.closePath();
        ctx.fill();
        const imageData = ctx.getImageData(0, 0, 24, 24);
        map.addImage('route-arrow-return', imageData, { sdf: true });
      }
    }

    // Transit Arrow Icon (Rail, Transport, Ferry)
    if (!map.hasImage('route-arrow-transit')) {
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(4, 5);
        ctx.lineTo(20, 12);
        ctx.lineTo(4, 19);
        ctx.lineTo(7, 12);
        ctx.closePath();
        ctx.fill();
        const imageData = ctx.getImageData(0, 0, 24, 24);
        map.addImage('route-arrow-transit', imageData, { sdf: true });
      }
    }

    // 1. General Route Line ONLY (No Arrow Symbols)
    const routeData: GeoJSON.FeatureCollection<GeoJSON.LineString> = routeGeoJson || {
      type: 'FeatureCollection',
      features: [],
    };

    if (!map.getSource('trip-route-src')) {
      map.addSource('trip-route-src', { type: 'geojson', data: routeData });
      map.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': markerColor,
          'line-width': 2.5,
          'line-opacity': 0.5,
        },
      });
    } else {
      (map.getSource('trip-route-src') as any)?.setData(routeData);
      if (map.getLayer('trip-route-line')) {
        map.setPaintProperty('trip-route-line', 'line-color', markerColor);
      }
    }

    // 2. Outbound / Intermediate Flight Layer (Primary Blue dashed line + flight arrows)
    const outboundData: GeoJSON.FeatureCollection<GeoJSON.LineString> = outboundFlightGeoJson || {
      type: 'FeatureCollection',
      features: [],
    };

    if (!map.getSource('trip-flight-outbound-src')) {
      map.addSource('trip-flight-outbound-src', { type: 'geojson', data: outboundData });
      map.addLayer({
        id: 'trip-flight-outbound-line',
        type: 'line',
        source: 'trip-flight-outbound-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': markerColor,
          'line-width': 3,
          'line-opacity': 0.85,
          'line-dasharray': [5, 4],
        },
      });
      map.addLayer({
        id: 'trip-flight-outbound-arrows',
        type: 'symbol',
        source: 'trip-flight-outbound-src',
        layout: {
          'symbol-placement': 'line-center',
          'icon-image': 'route-arrow-flight',
          'icon-size': 0.45,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': markerColor,
          'icon-opacity': 0.95,
        },
      });
    } else {
      (map.getSource('trip-flight-outbound-src') as any)?.setData(outboundData);
      if (map.getLayer('trip-flight-outbound-line')) {
        map.setPaintProperty('trip-flight-outbound-line', 'line-color', markerColor);
      }
      if (map.getLayer('trip-flight-outbound-arrows')) {
        map.setPaintProperty('trip-flight-outbound-arrows', 'icon-color', markerColor);
      }
    }

    // 3. Return Home Flight Layer (Primary Dark Green dashed line + return arrows)
    const returnData: GeoJSON.FeatureCollection<GeoJSON.LineString> = returnFlightGeoJson || {
      type: 'FeatureCollection',
      features: [],
    };
    const returnColor = '#356a4c'; // Shldr Primary Dark Green

    if (!map.getSource('trip-flight-return-src')) {
      map.addSource('trip-flight-return-src', { type: 'geojson', data: returnData });
      map.addLayer({
        id: 'trip-flight-return-line',
        type: 'line',
        source: 'trip-flight-return-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': returnColor,
          'line-width': 3.5,
          'line-opacity': 0.9,
          'line-dasharray': [6, 4],
        },
      });
      map.addLayer({
        id: 'trip-flight-return-arrows',
        type: 'symbol',
        source: 'trip-flight-return-src',
        layout: {
          'symbol-placement': 'line-center',
          'icon-image': 'route-arrow-return',
          'icon-size': 0.48,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': returnColor,
          'icon-opacity': 1.0,
        },
      });
    } else {
      (map.getSource('trip-flight-return-src') as any)?.setData(returnData);
      if (map.getLayer('trip-flight-return-line')) {
        map.setPaintProperty('trip-flight-return-line', 'line-color', returnColor);
      }
      if (map.getLayer('trip-flight-return-arrows')) {
        map.setPaintProperty('trip-flight-return-arrows', 'icon-color', returnColor);
      }
    }

    // 4. Transit Layer (Rail, Transport, Cruise/Ferry) (Violet line + transit arrows)
    const transitData: GeoJSON.FeatureCollection<GeoJSON.LineString> = transitGeoJson || {
      type: 'FeatureCollection',
      features: [],
    };
    const transitColor = '#8b5cf6'; // Violet

    if (!map.getSource('trip-transit-src')) {
      map.addSource('trip-transit-src', { type: 'geojson', data: transitData });
      map.addLayer({
        id: 'trip-transit-line',
        type: 'line',
        source: 'trip-transit-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': transitColor,
          'line-width': 2.5,
          'line-opacity': 0.8,
          'line-dasharray': [3, 2],
        },
      });
      map.addLayer({
        id: 'trip-transit-arrows',
        type: 'symbol',
        source: 'trip-transit-src',
        layout: {
          'symbol-placement': 'line-center',
          'icon-image': 'route-arrow-transit',
          'icon-size': 0.42,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': transitColor,
          'icon-opacity': 0.9,
        },
      });
    } else {
      (map.getSource('trip-transit-src') as any)?.setData(transitData);
    }
  }, [map, isLoaded, routeGeoJson, outboundFlightGeoJson, returnFlightGeoJson, transitGeoJson, markerColor]);

  return null;
}

export default function TripRouteMap({
  tripId,
  plans,
  darkMode = false,
  height = 340,
}: TripRouteMapProps) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      try {
        const response = await fetch(`/api/trips/map-data?tripId=${tripId}`);
        if (!response.ok) return;
        const data = (await response.json()) as RouteData;
        if (!cancelled) setRouteData(data);
      } catch {
        if (!cancelled) setRouteData({ locations: [], flights: [] });
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const points = useMemo((): RoutePoint[] => {
    const locations = [...(routeData?.locations || [])].sort(
      (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
    );
    const planItems = plans.flatMap((plan) => plan.items);
    const originLocation = routeData?.flights?.[0]?.from || routeData?.locations?.[0];

    return plans.flatMap((plan, index) => {
      const date = dayjs(plan.date);
      const dayLocations = locations.filter((location) => dayjs(location.date).isSame(date, 'day'));
      const groups = new globalThis.Map<string, RouteLocation[]>();
      for (const location of dayLocations) {
        const key = `${location.lat.toFixed(3)}|${location.lng.toFixed(3)}`;
        groups.set(key, [...(groups.get(key) || []), location]);
      }

      return Array.from(groups.values()).map((group, groupIndex) => {
        const location = group.at(-1)!;
        const reservationIds = new Set(group.map((candidate) => candidate.reservationId));
        const details = planItems.filter((item) =>
          item.reservation
            ? reservationIds.has(item.reservation.id)
            : Array.from(reservationIds).some((reservationId) => item.id === `layover-${reservationId}`)
        );

        const isHome = originLocation
          ? Math.abs(location.lat - originLocation.lat) < 0.08 && Math.abs(location.lng - originLocation.lng) < 0.08
          : index === 0 && groupIndex === 0;

        const primaryType = details[0]?.reservation?.type || details[0]?.type || location.type;

        return {
          id: `day-${index + 1}-${groupIndex + 1}`,
          details,
          locationTitles: group.map((candidate) => candidate.title),
          lat: location.lat,
          lng: location.lng,
          date: plan.date,
          day: index + 1,
          isHome,
          type: primaryType,
        };
      });
    });
  }, [plans, routeData]);

  const selectedPlan = selectedDay == null ? null : plans[selectedDay - 1];
  const visiblePoints = selectedDay == null ? null : points.filter((point) => point.day === selectedDay);
  const activePoints = visiblePoints ?? points;

  // 1. General Route GeoJSON (Line ONLY, NO Arrow Symbols, Local connections only)
  const routeGeoJson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.LineString> | null => {
    if (activePoints.length < 2) return null;
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    for (let index = 0; index < activePoints.length - 1; index++) {
      const fromCoord: [number, number] = [activePoints[index].lng, activePoints[index].lat];
      const toCoord: [number, number] = [activePoints[index + 1].lng, activePoints[index + 1].lat];

      const dx = toCoord[0] - fromCoord[0];
      const dy = toCoord[1] - fromCoord[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Ignore inter-city / long-distance legs (> 0.5 deg / ~50km)
      // Inter-city travel is exclusively rendered by flights and transits
      if (dist > 0.5) continue;

      const line = generateCurvedLine(fromCoord, toCoord, 0.04);
      features.push({ type: 'Feature', properties: {}, geometry: line });
    }
    return { type: 'FeatureCollection', features };
  }, [activePoints]);

  // 2. Outbound / Intermediate Flight GeoJSON
  const outboundFlightGeoJson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.LineString> | null => {
    const flights = selectedPlan
      ? (routeData?.flights || []).filter((flight) => !flight.isReturnHome && dayjs(flight.date).isSame(dayjs(selectedPlan.date), 'day'))
      : (routeData?.flights || []).filter((flight) => !flight.isReturnHome);
    if (flights.length === 0) return null;
    const features = flights.map((flight) => {
      const fromCoord: [number, number] = [flight.from.lng, flight.from.lat];
      const toCoord: [number, number] = [flight.to.lng, flight.to.lat];
      const line = generateCurvedLine(fromCoord, toCoord, 0.14);
      return {
        type: 'Feature' as const,
        properties: { title: flight.title },
        geometry: line,
      };
    });
    return { type: 'FeatureCollection', features };
  }, [routeData, selectedPlan]);

  // 3. Return Home Flight GeoJSON
  const returnFlightGeoJson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.LineString> | null => {
    const flights = selectedPlan
      ? (routeData?.flights || []).filter((flight) => flight.isReturnHome && dayjs(flight.date).isSame(dayjs(selectedPlan.date), 'day'))
      : (routeData?.flights || []).filter((flight) => flight.isReturnHome);
    if (flights.length === 0) return null;
    const features = flights.map((flight) => {
      const fromCoord: [number, number] = [flight.from.lng, flight.from.lat];
      const toCoord: [number, number] = [flight.to.lng, flight.to.lat];
      const line = generateCurvedLine(fromCoord, toCoord, 0.14);
      return {
        type: 'Feature' as const,
        properties: { title: flight.title },
        geometry: line,
      };
    });
    return { type: 'FeatureCollection', features };
  }, [routeData, selectedPlan]);

  // 4. Transit GeoJSON (Rail, Transport, Ferry/Cruise)
  const transitGeoJson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.LineString> | null => {
    const transits = selectedPlan
      ? (routeData?.transits || []).filter((t) => dayjs(t.date).isSame(dayjs(selectedPlan.date), 'day'))
      : routeData?.transits || [];
    if (transits.length === 0) return null;
    const features = transits.map((t) => {
      const fromCoord: [number, number] = [t.from.lng, t.from.lat];
      const toCoord: [number, number] = [t.to.lng, t.to.lat];
      const line = generateCurvedLine(fromCoord, toCoord, 0.08);
      return {
        type: 'Feature' as const,
        properties: { title: t.title, type: t.type },
        geometry: line,
      };
    });
    return { type: 'FeatureCollection', features };
  }, [routeData, selectedPlan]);

  const homeFlightDetails = useMemo(() => {
    if (!routeData?.flights || routeData.flights.length === 0) return [];
    const items: { day: number; date: string; title: string; subtitle?: string }[] = [];

    const outbound = routeData.flights.find((f) => !f.isReturnHome);
    if (outbound) {
      const dayIndex = plans.findIndex((p) => dayjs(p.date).isSame(dayjs(outbound.date), 'day'));
      items.push({
        day: dayIndex >= 0 ? dayIndex + 1 : 1,
        date: dayjs(outbound.date).format('ddd, MMM D YYYY'),
        title: `Outbound: ${outbound.title}`,
        subtitle: 'Departure from Home',
      });
    }

    const returnHome = routeData.flights.find((f) => f.isReturnHome);
    if (returnHome) {
      const dayIndex = plans.findIndex((p) => dayjs(p.date).isSame(dayjs(returnHome.date), 'day'));
      items.push({
        day: dayIndex >= 0 ? dayIndex + 1 : plans.length,
        date: dayjs(returnHome.date).format('ddd, MMM D YYYY'),
        title: `Return: ${returnHome.title}`,
        subtitle: 'Arrival back Home',
      });
    }

    return items;
  }, [plans, routeData]);

  const mapStyles = { light: MAP_STYLE_LIGHT, dark: MAP_STYLE_DARK };
  const markerColor = darkMode ? '#60a5fa' : '#2563eb';
  const textColor = darkMode ? '#0f172a' : '#ffffff';

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        border: darkMode ? '1px solid rgba(71,85,105,0.4)' : '1px solid rgba(203,213,225,0.6)',
        boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Map canvas container */}
      <Box
        sx={{
          height: { xs: 220, sm: 280, md: height },
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Map
          center={[0, 20]}
          zoom={1.5}
          styles={mapStyles}
          theme={darkMode ? 'dark' : 'light'}
          className="w-full h-full"
          cooperativeGestures={true}
        >
          <RouteLayersWithArrows
            routeGeoJson={routeGeoJson}
            outboundFlightGeoJson={outboundFlightGeoJson}
            returnFlightGeoJson={returnFlightGeoJson}
            transitGeoJson={transitGeoJson}
            markerColor={markerColor}
          />
          {activePoints.map((point) => (
            <MapMarker key={point.id} longitude={point.lng} latitude={point.lat}>
              <MarkerContent>
                <div
                  onMouseEnter={() => setHoveredId(point.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (point.isHome) {
                      setSelectedDay(null);
                      return;
                    }
                    setSelectedDay(point.day);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: point.isHome ? '#356a4c' : markerColor,
                    color: textColor,
                    border: `2px solid ${textColor}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transform: hoveredId === point.id ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                >
                  {selectedDay != null ? (
                    getPointIcon(point.type, point.isHome)
                  ) : point.isHome ? (
                    <Home style={{ width: 14, height: 14, color: '#ffffff' }} />
                  ) : (
                    point.day
                  )}
                </div>
              </MarkerContent>
              <MarkerPopup closeButton>
                {point.isHome ? (
                  <div className="space-y-2.5 min-w-[220px] max-w-[calc(100vw-48px)] p-1">
                    <div className="flex items-center gap-1.5 text-[#356a4c] font-bold text-xs border-b pb-1.5">
                      <Home className="w-4 h-4 text-[#356a4c]" />
                      <span>Home Origin & Return</span>
                    </div>
                    {homeFlightDetails.map((item, idx) => (
                      <div key={idx} className="border-t pt-2 first:border-t-0 first:pt-0">
                        <p className="text-[11px] font-semibold text-[#356a4c]">
                          Day {item.day} · {item.date}
                        </p>
                        <p className="font-semibold text-sm text-foreground">{item.title}</p>
                        {item.subtitle ? <p className="text-xs text-muted-foreground">{item.subtitle}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 min-w-[180px] max-w-[calc(100vw-48px)]">
                    <p className="text-xs font-medium text-blue-500">Day {point.day} · {point.date}</p>
                    {point.details.length > 0 ? (
                      point.details.map((detail) => (
                        <div key={detail.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                          <p className="font-semibold text-sm">{detail.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {[detail.time, detail.timezone, detail.type].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      ))
                    ) : (
                      point.locationTitles.map((title) => (
                        <p key={title} className="font-semibold text-sm">
                          {title}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </MarkerPopup>
            </MapMarker>
          ))}
          {activePoints.length > 0 && <RouteCameraController points={activePoints} selectedDay={selectedDay} />}
        </Map>
      </Box>

      {/* Itinerary days bar */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(248,250,252,0.95)',
          borderTop: darkMode ? '1px solid rgba(71,85,105,0.3)' : '1px solid rgba(203,213,225,0.5)',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.5,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.85rem',
              color: darkMode ? '#e2e8f0' : '#1e293b',
              whiteSpace: 'nowrap',
            }}
          >
            Itinerary days
          </Typography>
          <Button
            size="small"
            onClick={() => setSelectedDay(null)}
            sx={{
              fontSize: '0.725rem',
              fontWeight: 600,
              borderRadius: 5,
              px: 1.5,
              py: 0.25,
              textTransform: 'none',
              minWidth: 0,
              color: selectedDay == null ? textColor : markerColor,
              bgcolor: selectedDay == null ? markerColor : 'transparent',
              border: `1px solid ${markerColor}`,
              '&:hover': {
                bgcolor: selectedDay == null ? markerColor : `${markerColor}20`,
              },
            }}
          >
            Show all days
          </Button>
        </Box>

        {/* Day cards horizontal scroll container */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.25,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            pb: 0.5,
            pt: 0.25,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {plans.map((plan, index) => {
            const day = index + 1;
            const active = selectedDay === day;
            return (
              <Box
                key={plan.id}
                component="button"
                type="button"
                onClick={() => setSelectedDay(active ? null : day)}
                sx={{
                  textAlign: 'left',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: active ? markerColor : darkMode ? '#334155' : '#e2e8f0',
                  bgcolor: active ? `${markerColor}18` : darkMode ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.7)',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  px: 1.75,
                  py: 1.25,
                  cursor: 'pointer',
                  width: { xs: 180, sm: 210, md: 240 },
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: markerColor,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ display: 'block', fontWeight: 700, mb: 0.5, fontSize: '0.75rem' }}
                >
                  Day {day} · {plan.date}
                </Typography>
                {plan.items.length > 0 ? (
                  plan.items.map((item) => (
                    <Typography
                      key={item.id}
                      variant="caption"
                      sx={{ display: 'block', fontSize: '0.725rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {item.title}
                    </Typography>
                  ))
                ) : (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', fontSize: '0.725rem', opacity: 0.6 }}
                  >
                    No trip details
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
