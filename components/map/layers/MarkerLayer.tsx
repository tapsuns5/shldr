'use client';

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { type MapPin } from '@/hooks/useTravelMapData';

interface MarkerLayerProps {
  pins: MapPin[];
  darkMode?: boolean;
}

export default function MarkerLayer({ pins, darkMode = false }: MarkerLayerProps) {

  const geojson = useMemo((): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
    type: 'FeatureCollection',
    features: pins
      .filter((p) => p.lat !== 0 || p.lng !== 0)
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          city: p.city,
          country: p.country,
          visitCount: p.visitCount,
        },
      })),
  }), [pins]);

  const pinColor = darkMode ? '#60a5fa' : '#2563eb';
  const pinBorder = darkMode ? '#1e3a5f' : '#ffffff';

  return (
    <Source id="markers" type="geojson" data={geojson} cluster clusterMaxZoom={8} clusterRadius={40}>
      <Layer
        id="clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': [
            'step',
            ['get', 'point_count'],
            darkMode ? '#3b82f6' : '#2563eb',
            5, darkMode ? '#8b5cf6' : '#7c3aed',
            10, darkMode ? '#ec4899' : '#db2777',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': pinBorder,
        }}
      />
      <Layer
        id="cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        }}
        paint={{ 'text-color': '#ffffff' }}
      />
      <Layer
        id="unclustered-point"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': pinColor,
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'visitCount'],
            1, 6,
            3, 9,
            5, 12,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': pinBorder,
          'circle-opacity': 0.9,
        }}
      />
    </Source>
  );
}
