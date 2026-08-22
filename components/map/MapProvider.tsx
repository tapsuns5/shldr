'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { type FlightRoute } from '@/lib/map/arcRoutes';
import { type MapPin, type MapTrip } from '@/hooks/useTravelMapData';

export type MapView = 'footprints' | 'wishlist';

export interface TravelMapContextValue {
  view: MapView;
  setView: (v: MapView) => void;
  selectedTrip: MapTrip | null;
  setSelectedTrip: (t: MapTrip | null) => void;
  selectedPin: MapPin | null;
  setSelectedPin: (p: MapPin | null) => void;
  hoveredRoute: FlightRoute | null;
  setHoveredRoute: (r: FlightRoute | null) => void;
}

const TravelMapContext = createContext<TravelMapContextValue | null>(null);

export function useTravelMap(): TravelMapContextValue {
  const ctx = useContext(TravelMapContext);
  if (!ctx) throw new Error('useTravelMap must be used within MapProvider');
  return ctx;
}

interface MapProviderProps {
  children: ReactNode;
  mapRef?: unknown;
}

export function MapProvider({ children }: MapProviderProps) {
  const [view, setView] = useState<MapView>('footprints');
  const [selectedTrip, setSelectedTrip] = useState<MapTrip | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<FlightRoute | null>(null);

  return (
    <TravelMapContext.Provider value={{
      view, setView,
      selectedTrip, setSelectedTrip,
      selectedPin, setSelectedPin,
      hoveredRoute, setHoveredRoute,
    }}>
      {children}
    </TravelMapContext.Provider>
  );
}
