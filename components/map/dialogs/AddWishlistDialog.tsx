'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import LocationInput, { LocationResult } from '@/components/LocationInput';
import { type WishlistDestination } from '@/hooks/useTravelMapData';

interface AddWishlistDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onAdded?: (item: WishlistDestination) => void;
}

export default function AddWishlistDialog({ open, onClose, accountId, onAdded }: AddWishlistDialogProps) {
  const [entryType, setEntryType] = useState<'city' | 'country'>('city');
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [locationKey, setLocationKey] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEntryType('city');
    setLocation(null);
    setLocationKey((k) => k + 1);
    setNote('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEntryTypeChange = (_: unknown, value: 'city' | 'country' | null) => {
    if (!value) return;
    setEntryType(value);
    setLocation(null);
    setLocationKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!location || !location.country) {
      setError('Please select a destination.');
      return;
    }
    if (entryType === 'city' && !location.city) {
      setError('Please select a city.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          type: entryType,
          city: entryType === 'city' ? location.city : undefined,
          country: location.country,
          countryCode: location.countryCode,
          lat: location.lat,
          lng: location.lng,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const validationError = data.error?.formErrors?.[0]
          || Object.values(data.error?.fieldErrors || {}).flat()[0];
        throw new Error(validationError || data.error || `Request failed (${response.status})`);
      }

      const item = await response.json();
      onAdded?.({ ...item, visited: false });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add destination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add to Wishlist</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <ToggleButtonGroup
            value={entryType}
            exclusive
            onChange={handleEntryTypeChange}
            size="small"
            fullWidth
          >
            <ToggleButton value="city">City</ToggleButton>
            <ToggleButton value="country">Whole Country</ToggleButton>
          </ToggleButtonGroup>

          <LocationInput
            key={locationKey}
            value={location}
            onChange={setLocation}
            mode={entryType === 'country' ? 'city_country' : 'city'}
            autoFocus
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Note (optional)"
            placeholder="Why do you want to go here?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
