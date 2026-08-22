import * as turf from '@turf/turf';
import { getAirportInfo } from './airportCoords';

export interface FlightRoute {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  airline?: string;
  flightNumber?: string;
  date?: string;
  arcGeoJson: GeoJSON.Feature<GeoJSON.LineString>;
  distanceKm: number;
}

export function buildFlightRoute(params: {
  id: string;
  from: string;
  to: string;
  airline?: string;
  flightNumber?: string;
  date?: string;
}): FlightRoute | null {
  const fromInfo = getAirportInfo(params.from);
  const toInfo = getAirportInfo(params.to);

  if (!fromInfo || !toInfo) return null;

  const fromCoords: [number, number] = [fromInfo.lng, fromInfo.lat];
  const toCoords: [number, number] = [toInfo.lng, toInfo.lat];

  const from = turf.point(fromCoords);
  const to = turf.point(toCoords);

  const distanceKm = Math.round(turf.distance(from, to, { units: 'kilometers' }));

  const arc = turf.greatCircle(from, to, { npoints: 64 });

  const arcGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {
      from: params.from,
      to: params.to,
      fromCity: fromInfo.city,
      toCity: toInfo.city,
      airline: params.airline,
      flightNumber: params.flightNumber,
      date: params.date,
      distanceKm,
    },
    geometry: arc.geometry as GeoJSON.LineString,
  };

  return {
    id: params.id,
    from: params.from,
    to: params.to,
    fromCity: fromInfo.city,
    toCity: toInfo.city,
    fromCoords,
    toCoords,
    airline: params.airline,
    flightNumber: params.flightNumber,
    date: params.date,
    arcGeoJson,
    distanceKm,
  };
}

export function buildFlightRoutesGeoJson(routes: FlightRoute[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: routes.map((r) => r.arcGeoJson),
  };
}

export function totalDistanceKm(routes: FlightRoute[]): number {
  return routes.reduce((sum, r) => sum + r.distanceKm, 0);
}
