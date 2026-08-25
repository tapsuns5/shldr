export * from './airportCoords';
export * from './arcRoutes';
export * from './cityCoords';
export * from './wishlistMatcher';
export * from './deriveMapData';
export * from './stats';
export * from './curvedLine';

/** Same OpenFreeMap style URLs shldr's web app uses (components/map/TravelMap.tsx). */
export const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export interface TripRouteLocation {
  reservationId: string;
  date: string;
  title: string;
  type: string;
  lat: number;
  lng: number;
}

export interface TripRouteFlight {
  reservationId: string;
  title: string;
  date: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  dep?: string;
  arr?: string;
  isReturnHome?: boolean;
}

export interface TripRouteTransit {
  reservationId: string;
  type: string;
  title: string;
  date: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export interface TripRouteData {
  locations: TripRouteLocation[];
  flights: TripRouteFlight[];
  transits?: TripRouteTransit[];
}
