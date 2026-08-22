'use client';

import { useMemo } from 'react';
import { type TravelMapData } from './useTravelMapData';
import { totalDistanceKm } from '@/lib/map/arcRoutes';
import dayjs from 'dayjs';

export interface TravelStats {
  countriesCount: number;
  citiesCount: number;
  tripsCount: number;
  flightsCount: number;
  distanceKm: number;
  distanceMiles: number;
  nightsAway: number;
  continentsCount: number;
}

const CONTINENT_MAP: Record<string, string> = {
  US: 'North America', CA: 'North America', MX: 'North America',
  GT: 'North America', BZ: 'North America', HN: 'North America', SV: 'North America',
  NI: 'North America', CR: 'North America', PA: 'North America',
  CU: 'North America', DO: 'North America', JM: 'North America', PR: 'North America',
  HT: 'North America', BS: 'North America', BB: 'North America', TT: 'North America',
  AG: 'North America', LC: 'North America', VC: 'North America', GD: 'North America',
  DM: 'North America', KN: 'North America',
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America',
  PE: 'South America', VE: 'South America', EC: 'South America', BO: 'South America',
  PY: 'South America', UY: 'South America', GY: 'South America', SR: 'South America',
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Europe',
  NL: 'Europe', BE: 'Europe', CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe',
  DK: 'Europe', FI: 'Europe', IE: 'Europe', GR: 'Europe', TR: 'Europe', PL: 'Europe',
  CZ: 'Europe', HU: 'Europe', HR: 'Europe', SI: 'Europe', SK: 'Europe', RO: 'Europe',
  BG: 'Europe', RS: 'Europe', AL: 'Europe', MK: 'Europe', ME: 'Europe', BA: 'Europe',
  LT: 'Europe', LV: 'Europe', EE: 'Europe', UA: 'Europe', MD: 'Europe', BY: 'Europe',
  RU: 'Europe', IS: 'Europe', LU: 'Europe', MT: 'Europe', CY: 'Europe',
  JP: 'Asia', CN: 'Asia', KR: 'Asia', IN: 'Asia', TH: 'Asia', VN: 'Asia',
  SG: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia', HK: 'Asia', TW: 'Asia',
  KH: 'Asia', LA: 'Asia', MM: 'Asia', LK: 'Asia', NP: 'Asia', BD: 'Asia',
  PK: 'Asia', AE: 'Asia', QA: 'Asia', SA: 'Asia', KW: 'Asia', BH: 'Asia',
  OM: 'Asia', JO: 'Asia', IL: 'Asia', LB: 'Asia', IQ: 'Asia', IR: 'Asia',
  MN: 'Asia', KZ: 'Asia', UZ: 'Asia',
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
  EG: 'Africa', MA: 'Africa', TN: 'Africa', DZ: 'Africa', LY: 'Africa',
  NG: 'Africa', GH: 'Africa', KE: 'Africa', TZ: 'Africa', ZA: 'Africa',
  ET: 'Africa', UG: 'Africa', SN: 'Africa', CI: 'Africa', CM: 'Africa',
};

export function useTravelStats(mapData: TravelMapData): TravelStats {
  return useMemo(() => {
    const countriesCount = mapData.visitedCountryCodes.length;
    const citiesCount = mapData.pins.length;
    const tripsCount = mapData.trips.length;
    const flightsCount = mapData.flightRoutes.length;
    const distanceKm = totalDistanceKm(mapData.flightRoutes);
    const distanceMiles = Math.round(distanceKm * 0.621371);

    const nightsAway = mapData.trips.reduce((sum, trip) => {
      const start = dayjs(trip.startDate);
      const end = dayjs(trip.endDate);
      return sum + end.diff(start, 'day');
    }, 0);

    const continents = new Set<string>();
    for (const cc of mapData.visitedCountryCodes) {
      const continent = CONTINENT_MAP[cc];
      if (continent) continents.add(continent);
    }

    return {
      countriesCount,
      citiesCount,
      tripsCount,
      flightsCount,
      distanceKm,
      distanceMiles,
      nightsAway,
      continentsCount: continents.size,
    };
  }, [mapData]);
}
