'use client';

import { useState, useEffect } from 'react';
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
  Popover,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import { CloseIcon, LocationIcon } from '@/components/Icons';
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import LocationInput, { type LocationResult } from './LocationInput';
import { type UITrip } from '../hooks/use-trips';

interface EditTripDialogProps {
  open: boolean;
  trip: UITrip | null;
  onClose: () => void;
  onTripUpdated?: (trip: any) => void;
  focusLocation?: boolean;
}

export default function EditTripDialog({
  open,
  trip,
  onClose,
  onTripUpdated,
  focusLocation,
}: EditTripDialogProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [destinations, setDestinations] = useState<LocationResult[]>([]);
  const [locationInputKey, setLocationInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startAnchor, setStartAnchor] = useState<HTMLElement | null>(null);
  const [endAnchor, setEndAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open && trip) {
      setTitle(trip.title);
      setStartDate(dayjs(trip.startDate));
      setEndDate(dayjs(trip.endDate));
      setDestinations(
        trip.destinations.map((d) => ({
          city: d.city,
          state: d.state || '',
          country: d.country,
          formattedAddress: d.location,
          lat: 0,
          lng: 0,
        }))
      );
      setError(null);
    }
  }, [open, trip]);

  const handleAddDestination = (loc: LocationResult | null) => {
    if (!loc) return;
    setDestinations((prev) => [...prev, loc]);
    setLocationInputKey((k) => k + 1);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setError(null);
    setStartAnchor(null);
    setEndAnchor(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!trip) return;
    if (!title.trim()) {
      setError('Trip name is required');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firstDest = destinations[0];
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          destinationCity: firstDest?.city,
          destinationCountry: firstDest?.country,
          destinations: destinations.map((d) => ({
            city: d.city,
            state: d.state,
            country: d.country,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const validationError = data.error?.formErrors?.[0]
          || Object.values(data.error?.fieldErrors || {}).flat()[0];
        throw new Error(validationError || data.error || `Failed to update trip (${response.status})`);
      }

      const updatedTrip = await response.json();
      onTripUpdated?.(updatedTrip);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Trip</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            label="Trip Name"
            placeholder="e.g., Split, Croatia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  value={startDate ? startDate.format('MM/DD/YYYY') : ''}
                  placeholder="Select start date"
                  onClick={(e) => setStartAnchor(e.currentTarget)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ readOnly: true }}
                  required
                />
                <Popover
                  open={Boolean(startAnchor)}
                  anchorEl={startAnchor}
                  onClose={() => setStartAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: { sx: { mt: 1 } } }}
                >
                  <DateCalendar
                    value={startDate}
                    onChange={(newValue) => {
                      setStartDate(newValue);
                      setStartAnchor(null);
                    }}
                    maxDate={endDate || undefined}
                  />
                </Popover>
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  value={endDate ? endDate.format('MM/DD/YYYY') : ''}
                  placeholder="Select end date"
                  onClick={(e) => setEndAnchor(e.currentTarget)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ readOnly: true }}
                  required
                />
                <Popover
                  open={Boolean(endAnchor)}
                  anchorEl={endAnchor}
                  onClose={() => setEndAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: { sx: { mt: 1 } } }}
                >
                  <DateCalendar
                    value={endDate}
                    onChange={(newValue) => {
                      setEndDate(newValue);
                      setEndAnchor(null);
                    }}
                    minDate={startDate || undefined}
                  />
                </Popover>
              </Box>
            </Stack>
          </LocalizationProvider>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Destinations
            </Typography>
            {destinations.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {destinations.map((dest, idx) => (
                  <Chip
                    key={idx}
                    icon={<LocationIcon />}
                    label={dest.formattedAddress || `${dest.city}, ${dest.country}`}
                    onDelete={() => handleRemoveDestination(idx)}
                    deleteIcon={<CloseIcon />}
                    sx={{ maxWidth: '100%' }}
                  />
                ))}
              </Stack>
            )}
            <LocationInput key={locationInputKey} value={null} onChange={handleAddDestination} autoFocus={focusLocation} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
