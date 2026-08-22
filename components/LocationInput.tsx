'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useLoadScript,
  Autocomplete,
  GoogleMap,
  Marker,
} from '@react-google-maps/api';
import { TextField, Box, CircularProgress } from '@mui/material';

export interface LocationResult {
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface LocationInputProps {
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  autoFocus?: boolean;
  /**
   * 'city' (default) restricts search to cities/localities.
   * 'city_country' also allows selecting a whole country (city will be
   * empty on the resulting LocationResult in that case).
   */
  mode?: 'city' | 'city_country';
}

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '200px',
  borderRadius: '8px',
};

const DEFAULT_CENTER = { lat: 0, lng: 0 };
const LIBRARIES: 'places'[] = ['places'];

export default function LocationInput({ value, onChange, autoFocus, mode = 'city' }: LocationInputProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, isLoaded]);

  const onPlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place || !place.place_id) return;

    const addressComponents = place.address_components || [];
    let city = '';
    let state = '';
    let country = '';
    let countryCode = '';
    const isCountryLevel = !!place.types?.includes('country');

    for (const component of addressComponents) {
      const types = component.types;
      if (types.includes('locality') || types.includes('administrative_area_level_3')) {
        city = city || component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
    }

    const lat = place.geometry?.location?.lat() ?? 0;
    const lng = place.geometry?.location?.lng() ?? 0;

    const result: LocationResult = {
      city: isCountryLevel ? '' : (city || place.name || ''),
      state: state || undefined,
      country,
      countryCode: countryCode || undefined,
      lat,
      lng,
      formattedAddress: place.formatted_address || '',
    };

    setMapCenter({ lat, lng });
    onChange(result);
  }, [onChange]);

  if (loadError) {
    return (
      <TextField
        fullWidth
        error
        label="Error loading Google Maps"
        value="Failed to load Google Maps. Check your API key."
        disabled
      />
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        types={mode === 'city_country' ? ['(regions)'] : ['(cities)']}
      >
        <TextField
          fullWidth
          label="Search destination"
          placeholder={mode === 'city_country' ? 'Type a city or country...' : 'Type a city or address...'}
          defaultValue={value?.formattedAddress || ''}
          inputRef={inputRef}
          autoFocus={autoFocus}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              bgcolor: 'background.paper',
            },
          }}
        />
      </Autocomplete>

      {value && (
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter.lat !== 0 || mapCenter.lng !== 0 ? mapCenter : { lat: value.lat, lng: value.lng }}
          zoom={8}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          <Marker position={{ lat: value.lat, lng: value.lng }} />
        </GoogleMap>
      )}
    </Box>
  );
}
