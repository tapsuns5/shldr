'use client';

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { type FlightRoute, buildFlightRoutesGeoJson } from '@/lib/map/arcRoutes';

interface FlightLayerProps {
  routes: FlightRoute[];
  darkMode?: boolean;
}

export default function FlightLayer({ routes, darkMode = false }: FlightLayerProps) {
  const geojson = useMemo(() => buildFlightRoutesGeoJson(routes), [routes]);

  const lineColor = darkMode ? '#60a5fa' : '#3b82f6';
  const glowColor = darkMode ? '#93c5fd' : '#93c5fd';

  if (routes.length === 0) return null;

  return (
    <>
      <Source id="flights" type="geojson" data={geojson}>
        <Layer
          id="flights-glow"
          type="line"
          paint={{
            'line-color': glowColor,
            'line-width': 4,
            'line-opacity': 0.15,
            'line-blur': 3,
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
        <Layer
          id="flights-line"
          type="line"
          paint={{
            'line-color': lineColor,
            'line-width': 1.5,
            'line-opacity': 0.7,
            'line-dasharray': [2, 2],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>
    </>
  );
}
