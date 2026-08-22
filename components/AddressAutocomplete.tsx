'use client';

import { useRef, useCallback } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

const LIBRARIES: 'places'[] = ['places'];

export interface PlaceSelection {
  /** The place's name, e.g. "Empire State Building" (blank for plain addresses). */
  name: string;
  /** The place's full formatted address. */
  address: string;
  lat?: number;
  lng?: number;
}

export type AddressAutocompleteProps = Omit<TextFieldProps, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  /**
   * Restrict predictions to specific Places types (e.g. ['address'] or
   * ['establishment']). Defaults to no restriction, which returns both
   * addresses and points of interest — useful for venue/location fields.
   */
  types?: string[];
  /**
   * Called with the full place details (name + address) when the user picks
   * a suggestion. Use this when name and address need to be split across
   * two different fields (e.g. a venue name field paired with a separate
   * address field). If omitted, `onChange` is called with the formatted
   * address (falling back to the place name) as before.
   */
  onPlaceSelected?: (place: PlaceSelection) => void;
};

/**
 * A text field backed by the Google Places Autocomplete widget. Falls back
 * to a plain text field if the Maps script fails to load or no API key is
 * configured, so the field always remains usable for manual entry.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  types,
  onPlaceSelected,
  ...textFieldProps
}: AddressAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place) return;

    if (onPlaceSelected) {
      onPlaceSelected({
        name: place.name || '',
        address: place.formatted_address || '',
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      });
      return;
    }

    const address = place.formatted_address || place.name || '';
    if (address) onChange(address);
  }, [onChange, onPlaceSelected]);

  const field = (
    <TextField
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...textFieldProps}
    />
  );

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || loadError || !isLoaded) {
    return field;
  }

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} types={types}>
      {field}
    </Autocomplete>
  );
}
