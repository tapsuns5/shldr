'use client';

import { useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';

interface CountryLayerProps {
  visitedCountryCodes: string[];
  darkMode?: boolean;
}

export default function CountryLayer({ visitedCountryCodes, darkMode = false }: CountryLayerProps) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((r) => r.json())
      .then((fc: GeoJSON.FeatureCollection) => setGeojson(fc))
      .catch(() => {});
  }, []);

  const visitedSet = new Set(visitedCountryCodes);

  if (!geojson) return null;

  const visitedFill = darkMode ? '#60a5fa' : '#3b82f6';
  const borderColor = darkMode ? '#475569' : '#64748b';

  return (
    <Source id="countries" type="geojson" data={geojson}>
      <Layer
        id="countries-fill-unvisited"
        type="fill"
        paint={{
          'fill-color': darkMode ? '#334155' : '#e2e8f0',
          'fill-opacity': 0.25,
        }}
      />
      <Layer
        id="countries-fill-visited"
        type="fill"
        filter={['in', ['get', 'ISO_A2'], ['literal', Array.from(visitedSet)]]}
        paint={{
          'fill-color': visitedFill,
          'fill-opacity': 0.4,
        }}
      />
      <Layer
        id="countries-border"
        type="line"
        paint={{
          'line-color': borderColor,
          'line-width': 0.6,
          'line-opacity': 0.5,
        }}
      />
    </Source>
  );
}
