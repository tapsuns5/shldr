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
  Box,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { type PlanType } from './AddPlanButton';
import AddressAutocomplete from './AddressAutocomplete';

interface PlanDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  type: PlanType | null;
  onCreated?: () => void;
  defaultDate?: string;
}

interface PlanFormData {
  title: string;
  startDateTime: Dayjs | null;
  endDateTime: Dayjs | null;
  confirmationNumber: string;
  providerName: string;
  location: string;
  notes: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTerminal: string;
  departureGate: string;
  seat: string;
  vendor: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleClass: string;
  hotelName: string;
  address: string;
  city: string;
  country: string;
  roomType: string;
  venue: string;
  transportType: string;
  operator: string;
  departureLocation: string;
  arrivalLocation: string;
  cruiseLine: string;
  departurePort: string;
  arrivalPort: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  ferryOperator: string;
  garageName: string;
  routeFrom: string;
  routeTo: string;
}

const TYPE_LABELS: Record<PlanType, string> = {
  activity: 'Activity',
  flight: 'Flight',
  lodging: 'Lodging',
  car: 'Car Rental',
  note: 'Note',
  concert: 'Concert',
  parking: 'Parking',
  cruise: 'Cruise',
  rail: 'Rail',
  directions: 'Directions',
  restaurant: 'Restaurant',
  ferry: 'Ferry',
  theater: 'Theater',
  map: 'Map',
  tour: 'Tour',
  meeting: 'Meeting',
  transportation: 'Transportation',
};

const DB_TYPE_MAP: Record<PlanType, string> = {
  activity: 'activity',
  flight: 'flight',
  lodging: 'hotel',
  car: 'car',
  note: 'other',
  concert: 'activity',
  parking: 'transport',
  cruise: 'cruise',
  rail: 'transport',
  directions: 'transport',
  restaurant: 'restaurant',
  ferry: 'transport',
  theater: 'activity',
  map: 'activity',
  tour: 'activity',
  meeting: 'activity',
  transportation: 'transport',
};

function defaultTitle(type: PlanType | null): string {
  return type ? TYPE_LABELS[type] : 'Plan';
}

function titleLabel(type: PlanType | null): string {
  switch (type) {
    case 'flight':
      return 'Route';
    case 'lodging':
      return 'Hotel Name';
    case 'car':
      return 'Rental Title';
    case 'restaurant':
      return 'Restaurant Name';
    case 'cruise':
      return 'Cruise / Ship Name';
    case 'concert':
      return 'Event Name';
    case 'theater':
      return 'Show Name';
    case 'tour':
      return 'Tour Name';
    case 'meeting':
      return 'Meeting Name';
    case 'note':
      return 'Note Title';
    case 'map':
      return 'Map Title';
    case 'rail':
      return 'Train Route';
    case 'ferry':
      return 'Ferry Route';
    case 'parking':
      return 'Parking Title';
    case 'directions':
      return 'Directions Title';
    case 'transportation':
      return 'Transport Title';
    default:
      return 'Title';
  }
}

function titlePlaceholder(type: PlanType | null): string {
  switch (type) {
    case 'flight':
      return 'e.g., FLL → EWR';
    case 'lodging':
      return 'e.g., Hotel Excelsior';
    case 'car':
      return 'e.g., National Car Rental';
    case 'restaurant':
      return 'e.g., The Seafood Grill';
    case 'cruise':
      return 'e.g., Symphony of the Seas';
    case 'concert':
      return 'e.g., Coldplay Concert';
    case 'theater':
      return 'e.g., Hamilton';
    case 'tour':
      return 'e.g., City Walking Tour';
    case 'meeting':
      return 'e.g., Q1 Sync';
    case 'note':
      return 'e.g., Remember to pack charger';
    case 'map':
      return 'e.g., Downtown map link';
    default:
      return defaultTitle(type);
  }
}

export default function PlanDialog({ open, onClose, tripId, type, onCreated, defaultDate }: PlanDialogProps) {
  const [form, setForm] = useState<PlanFormData>({
    title: '',
    startDateTime: null,
    endDateTime: null,
    confirmationNumber: '',
    providerName: '',
    location: '',
    notes: '',
    flightNumber: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTerminal: '',
    departureGate: '',
    seat: '',
    vendor: '',
    pickupLocation: '',
    dropoffLocation: '',
    vehicleClass: '',
    hotelName: '',
    address: '',
    city: '',
    country: '',
    roomType: '',
    venue: '',
    transportType: '',
    operator: '',
    departureLocation: '',
    arrivalLocation: '',
    cruiseLine: '',
    departurePort: '',
    arrivalPort: '',
    trainNumber: '',
    departureStation: '',
    arrivalStation: '',
    ferryOperator: '',
    garageName: '',
    routeFrom: '',
    routeTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setForm({
      title: '',
      startDateTime: null,
      endDateTime: null,
      confirmationNumber: '',
      providerName: '',
      location: '',
      notes: '',
      flightNumber: '',
      airline: '',
      departureAirport: '',
      arrivalAirport: '',
      departureTerminal: '',
      departureGate: '',
      seat: '',
      vendor: '',
      pickupLocation: '',
      dropoffLocation: '',
      vehicleClass: '',
      hotelName: '',
      address: '',
      city: '',
      country: '',
      roomType: '',
      venue: '',
      transportType: '',
      operator: '',
      departureLocation: '',
      arrivalLocation: '',
      cruiseLine: '',
      departurePort: '',
      arrivalPort: '',
      trainNumber: '',
      departureStation: '',
      arrivalStation: '',
      ferryOperator: '',
      garageName: '',
      routeFrom: '',
      routeTo: '',
    });
    setError(null);
  };

  useEffect(() => {
    if (open && defaultDate) {
      const parsed = dayjs(defaultDate);
      if (parsed.isValid()) {
        setForm((prev) => ({ ...prev, startDateTime: parsed }));
      }
    }
  }, [open, defaultDate]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!type || !tripId) return;
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.startDateTime) {
      setError('Start date/time is required');
      return;
    }

    setLoading(true);
    setError(null);

    const dbType = DB_TYPE_MAP[type];
    const payload: any = {
      type: dbType,
      title: form.title.trim() || defaultTitle(type),
      startDateTime: form.startDateTime.toISOString(),
      endDateTime: form.endDateTime?.toISOString() || null,
      confirmationNumber: form.confirmationNumber || null,
      providerName: form.providerName || null,
      location: form.location || null,
      notes: form.notes || null,
      source: 'manual',
    };

    const details: any = {};
    if (type === 'flight') {
      details.flight = {
        airline: form.airline || 'Unknown',
        flightNumber: form.flightNumber || 'Unknown',
        departureAirport: form.departureAirport || '',
        arrivalAirport: form.arrivalAirport || '',
        departureTerminal: form.departureTerminal || null,
        departureGate: form.departureGate || null,
        seat: form.seat || null,
      };
    } else if (type === 'car') {
      details.car = {
        vendor: form.vendor || 'Unknown',
        pickupLocation: form.pickupLocation || '',
        dropoffLocation: form.dropoffLocation || '',
        pickupDateTime: form.startDateTime.toISOString(),
        dropoffDateTime: form.endDateTime?.toISOString() || form.startDateTime.toISOString(),
        vehicleClass: form.vehicleClass || null,
      };
    } else if (type === 'lodging') {
      details.hotel = {
        hotelName: form.hotelName || 'Unknown',
        address1: form.address || null,
        city: form.city || '',
        country: form.country || '',
        roomType: form.roomType || null,
        checkIn: form.startDateTime.toISOString(),
        checkOut: form.endDateTime?.toISOString() || form.startDateTime.toISOString(),
      };
    } else if (
      type === 'activity' ||
      type === 'concert' ||
      type === 'theater' ||
      type === 'tour' ||
      type === 'meeting' ||
      type === 'restaurant' ||
      type === 'map' ||
      type === 'note'
    ) {
      details.activity = {
        activityName: form.title.trim() || defaultTitle(type),
        venue: form.venue || null,
        address: form.location || null,
      };
    } else if (type === 'cruise') {
      details.activity = {
        activityName: form.title.trim() || defaultTitle(type),
        venue: form.cruiseLine || null,
        address: [form.departurePort, form.arrivalPort].filter(Boolean).join(' → ') || null,
      };
    } else if (
      type === 'rail' ||
      type === 'ferry' ||
      type === 'parking' ||
      type === 'directions' ||
      type === 'transportation'
    ) {
      const transportType =
        type === 'rail' ? 'Rail' :
        type === 'ferry' ? 'Ferry' :
        type === 'parking' ? 'Parking' :
        type === 'directions' ? 'Directions' :
        form.transportType || TYPE_LABELS[type];
      details.transport = {
        transportType,
        operator: form.operator || form.ferryOperator || null,
        departureLocation: form.departureLocation || form.departureStation || form.departurePort || form.routeFrom || null,
        arrivalLocation: form.arrivalLocation || form.arrivalStation || form.arrivalPort || form.routeTo || null,
      };
    }

    try {
      const res = await fetch(`/api/trips/${tripId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, details }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to create plan (${res.status})`);
      }

      onCreated?.();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof PlanFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderFields = () => {
    if (!type) return null;

    const common = (
      <>
        <TextField
          fullWidth
          label={titleLabel(type)}
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder={titlePlaceholder(type)}
          required
        />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="row" spacing={2}>
            <DateTimePicker
              label="Start Date/Time"
              value={form.startDateTime}
              onChange={(v) => update('startDateTime', v)}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
            <DateTimePicker
              label="End Date/Time (optional)"
              value={form.endDateTime}
              onChange={(v) => update('endDateTime', v)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </LocalizationProvider>

        <TextField
          fullWidth
          label="Confirmation Number"
          value={form.confirmationNumber}
          onChange={(e) => update('confirmationNumber', e.target.value)}
        />
      </>
    );

    const titleOnly = (
      <>
        {common}
        <AddressAutocomplete label="Location" value={form.location} onChange={(v) => update('location', v)} />
      </>
    );

    const activityFields = (venueLabel = 'Venue', locationLabel = 'Location') => (
      <>
        {common}
        <AddressAutocomplete
          label={venueLabel}
          value={form.venue}
          onChange={(v) => update('venue', v)}
          onPlaceSelected={({ name, address }) =>
            setForm((prev) => ({
              ...prev,
              venue: name || prev.venue,
              location: address || prev.location,
            }))
          }
        />
        <AddressAutocomplete label={locationLabel} value={form.location} onChange={(v) => update('location', v)} />
      </>
    );

    const transportFields = (
      <>
        {common}
        <TextField fullWidth label="Operator" value={form.operator} onChange={(e) => update('operator', e.target.value)} />
        <Stack direction="row" spacing={2}>
          <AddressAutocomplete label="From" value={form.departureLocation} onChange={(v) => update('departureLocation', v)} />
          <AddressAutocomplete label="To" value={form.arrivalLocation} onChange={(v) => update('arrivalLocation', v)} />
        </Stack>
      </>
    );

    let typeFields: React.ReactNode = null;

    switch (type) {
      case 'flight':
        typeFields = (
          <>
            {common}
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Airline" value={form.airline} onChange={(e) => update('airline', e.target.value)} />
              <TextField fullWidth label="Flight Number" value={form.flightNumber} onChange={(e) => update('flightNumber', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="From" value={form.departureAirport} onChange={(e) => update('departureAirport', e.target.value)} />
              <TextField fullWidth label="To" value={form.arrivalAirport} onChange={(e) => update('arrivalAirport', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Terminal" value={form.departureTerminal} onChange={(e) => update('departureTerminal', e.target.value)} />
              <TextField fullWidth label="Gate" value={form.departureGate} onChange={(e) => update('departureGate', e.target.value)} />
            </Stack>
            <TextField fullWidth label="Seat" value={form.seat} onChange={(e) => update('seat', e.target.value)} />
          </>
        );
        break;
      case 'car':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Vendor" value={form.vendor} onChange={(e) => update('vendor', e.target.value)} />
            <AddressAutocomplete label="Pick-up Location" value={form.pickupLocation} onChange={(v) => update('pickupLocation', v)} />
            <AddressAutocomplete label="Drop-off Location" value={form.dropoffLocation} onChange={(v) => update('dropoffLocation', v)} />
            <TextField fullWidth label="Vehicle Class" value={form.vehicleClass} onChange={(e) => update('vehicleClass', e.target.value)} />
          </>
        );
        break;
      case 'lodging':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Hotel Name" value={form.hotelName} onChange={(e) => update('hotelName', e.target.value)} />
            <AddressAutocomplete label="Address" value={form.address} onChange={(v) => update('address', v)} />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
              <TextField fullWidth label="Country" value={form.country} onChange={(e) => update('country', e.target.value)} />
            </Stack>
            <TextField fullWidth label="Room Type" value={form.roomType} onChange={(e) => update('roomType', e.target.value)} />
          </>
        );
        break;
      case 'cruise':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Cruise Line" value={form.cruiseLine} onChange={(e) => update('cruiseLine', e.target.value)} />
            <Stack direction="row" spacing={2}>
              <AddressAutocomplete label="Departure Port" value={form.departurePort} onChange={(v) => update('departurePort', v)} />
              <AddressAutocomplete label="Arrival Port" value={form.arrivalPort} onChange={(v) => update('arrivalPort', v)} />
            </Stack>
          </>
        );
        break;
      case 'rail':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Train Operator" value={form.operator} onChange={(e) => update('operator', e.target.value)} />
            <TextField fullWidth label="Train Number" value={form.trainNumber} onChange={(e) => update('trainNumber', e.target.value)} />
            <Stack direction="row" spacing={2}>
              <AddressAutocomplete label="Departure Station" value={form.departureStation} onChange={(v) => update('departureStation', v)} />
              <AddressAutocomplete label="Arrival Station" value={form.arrivalStation} onChange={(v) => update('arrivalStation', v)} />
            </Stack>
          </>
        );
        break;
      case 'ferry':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Ferry Operator" value={form.ferryOperator} onChange={(e) => update('ferryOperator', e.target.value)} />
            <Stack direction="row" spacing={2}>
              <AddressAutocomplete label="Departure Port" value={form.departurePort} onChange={(v) => update('departurePort', v)} />
              <AddressAutocomplete label="Arrival Port" value={form.arrivalPort} onChange={(v) => update('arrivalPort', v)} />
            </Stack>
          </>
        );
        break;
      case 'parking':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Garage / Lot Name" value={form.garageName} onChange={(e) => update('garageName', e.target.value)} />
            <AddressAutocomplete label="Address" value={form.location} onChange={(v) => update('location', v)} />
          </>
        );
        break;
      case 'directions':
        typeFields = (
          <>
            {common}
            <Stack direction="row" spacing={2}>
              <AddressAutocomplete label="From" value={form.routeFrom} onChange={(v) => update('routeFrom', v)} />
              <AddressAutocomplete label="To" value={form.routeTo} onChange={(v) => update('routeTo', v)} />
            </Stack>
          </>
        );
        break;
      case 'transportation':
        typeFields = (
          <>
            {common}
            <TextField fullWidth label="Transport Type" value={form.transportType} onChange={(e) => update('transportType', e.target.value)} placeholder="e.g., Shuttle, Bus, Taxi" />
            <TextField fullWidth label="Operator" value={form.operator} onChange={(e) => update('operator', e.target.value)} />
            <Stack direction="row" spacing={2}>
              <AddressAutocomplete label="From" value={form.departureLocation} onChange={(v) => update('departureLocation', v)} />
              <AddressAutocomplete label="To" value={form.arrivalLocation} onChange={(v) => update('arrivalLocation', v)} />
            </Stack>
          </>
        );
        break;
      case 'activity':
        typeFields = activityFields('Venue', 'Location');
        break;
      case 'concert':
        typeFields = activityFields('Venue', 'Address');
        break;
      case 'theater':
        typeFields = activityFields('Theater', 'Address');
        break;
      case 'tour':
        typeFields = activityFields('Meeting Point', 'Address');
        break;
      case 'meeting':
        typeFields = activityFields('Location', 'Address');
        break;
      case 'restaurant':
        typeFields = (
          <>
            {common}
            <AddressAutocomplete label="Address" value={form.location} onChange={(v) => update('location', v)} />
          </>
        );
        break;
      case 'note':
      case 'map':
        typeFields = titleOnly;
        break;
      default:
        typeFields = titleOnly;
        break;
    }

    return (
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        {typeFields}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
      </Stack>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {type ? `Add ${TYPE_LABELS[type]}` : 'Add Plan'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>{renderFields()}</Box>
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
          {loading ? 'Saving...' : 'Save Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

