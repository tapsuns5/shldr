'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  Paper,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Collapse,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import {
  ArrowBackIcon,
  EditIcon,
  MoreHorizIcon,
  DeleteIcon,
  FlightIcon,
  HotelIcon,
  CarIcon,
  ActivityIcon,
  RailIcon,
  BusIcon,
  RestaurantIcon,
  NoteIcon,
  MusicIcon,
  TheaterIcon,
  TourIcon,
  ExpandMoreIcon,
} from '@/components/Icons';
import AddressMenu from './AddressMenu';
import {
  type APIReservation,
  tzidToAbbrev,
} from '@/hooks/use-reservations';

interface TripEventDetailProps {
  tripId: string;
  tripTitle: string;
  reservation: APIReservation;
  initialMode?: 'view' | 'edit';
  onDeleted?: () => void;
  onUpdated?: (updated: APIReservation) => void;
}

const TYPE_LABELS: Record<string, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  car: 'Car Rental',
  rail: 'Rail',
  transport: 'Transport',
  activity: 'Activity',
  restaurant: 'Restaurant',
  cruise: 'Cruise',
  note: 'Note',
  concert: 'Concert',
  theater: 'Theater',
  tour: 'Tour',
  other: 'Event',
};

const TYPE_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'default'> = {
  flight: 'success',
  hotel: 'primary',
  car: 'warning',
  rail: 'info',
  cruise: 'info',
  activity: 'primary',
  default: 'default',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  flight: <FlightIcon sx={{ fontSize: 18 }} />,
  hotel: <HotelIcon sx={{ fontSize: 18 }} />,
  car: <CarIcon sx={{ fontSize: 18 }} />,
  rail: <RailIcon sx={{ fontSize: 18 }} />,
  transport: <BusIcon sx={{ fontSize: 18 }} />,
  activity: <ActivityIcon sx={{ fontSize: 18 }} />,
  restaurant: <RestaurantIcon sx={{ fontSize: 18 }} />,
  note: <NoteIcon sx={{ fontSize: 18 }} />,
  concert: <MusicIcon sx={{ fontSize: 18 }} />,
  theater: <TheaterIcon sx={{ fontSize: 18 }} />,
  tour: <TourIcon sx={{ fontSize: 18 }} />,
};

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

function TimelineCell({
  label,
  time,
  timezone,
  chips,
  isFirst,
  isLast,
}: {
  label: string;
  time?: string;
  timezone?: string;
  chips?: { title: string; value: React.ReactNode }[];
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const LINE_COLOR = '#d0d0d0';
  return (
    <Box sx={{ display: 'flex', mb: 0 }}>
      {/* Subway */}
      <Box sx={{ width: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
        <Box sx={{ width: 2, height: 16, bgcolor: isFirst ? 'transparent' : LINE_COLOR, flexShrink: 0 }} />
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
        <Box sx={{ width: 2, flex: 1, bgcolor: isLast ? 'transparent' : LINE_COLOR, minHeight: 32 }} />
      </Box>
      {/* Content */}
      <Box sx={{ flex: 1, pb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        {time && (
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>{time}</Typography>
            {timezone && <Typography variant="body2" color="text.secondary">{timezone}</Typography>}
          </Stack>
        )}
        {chips && chips.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {chips.map((c) => (
              <Box key={c.title} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.5, mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.value}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default function TripEventDetail({
  tripId,
  tripTitle,
  reservation,
  initialMode = 'view',
  onDeleted,
  onUpdated,
}: TripEventDetailProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [editTitle, setEditTitle] = useState(reservation.title);
  const [editConfirmation, setEditConfirmation] = useState(reservation.confirmationNumber ?? '');
  const [editProvider, setEditProvider] = useState(reservation.providerName ?? '');
  const [editLocation, setEditLocation] = useState(reservation.location ?? '');
  const [editNotes, setEditNotes] = useState(reservation.notes ?? '');
  const [editStart, setEditStart] = useState<Dayjs | null>(dayjs(reservation.startDateTime));
  const [editEnd, setEditEnd] = useState<Dayjs | null>(reservation.endDateTime ? dayjs(reservation.endDateTime) : null);

  const typeLabel = TYPE_LABELS[reservation.type] ?? 'Event';
  const typeColor = TYPE_COLORS[reservation.type] ?? 'default';
  const typeIcon = TYPE_ICONS[reservation.type] ?? <ActivityIcon sx={{ fontSize: 18 }} />;

  const startDt = dayjs(reservation.startDateTime);
  const endDt = reservation.endDateTime ? dayjs(reservation.endDateTime) : null;

  const flightDetails = reservation.details?.flight;
  const hotelDetails = reservation.details?.hotel;
  const carDetails = reservation.details?.car;
  const activityDetails = reservation.details?.activity;
  const transportDetails = reservation.details?.transport;
  const hotelAddress = hotelDetails
    ? [hotelDetails.address1, hotelDetails.city, hotelDetails.state, hotelDetails.country].filter(Boolean).join(', ')
    : null;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/reservations/${reservation.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push(`/tripdetails/${tripId}`);
      }
    } catch {
      setDeleteError('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        title: editTitle,
        confirmationNumber: editConfirmation || null,
        providerName: editProvider || null,
        location: editLocation || null,
        notes: editNotes || null,
        startDateTime: editStart?.toISOString(),
        endDateTime: editEnd?.toISOString() ?? null,
      };
      const res = await fetch(`/api/trips/${tripId}/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated: APIReservation = await res.json();
      setMode('view');
      onUpdated?.(updated);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const buildFlightSubtitle = () => {
    if (!flightDetails) return reservation.providerName ?? null;
    return `${flightDetails.flightNumber} (${flightDetails.airline})`;
  };

  const buildDepartureLabel = () => {
    if (flightDetails) {
      return `Depart ${flightDetails.departureAirport} ${startDt.format('MMM D')}`;
    }
    return `Depart ${startDt.format('MMM D')}`;
  };

  const buildArrivalLabel = () => {
    if (flightDetails && endDt) {
      return `Arrive ${flightDetails.arrivalAirport} ${endDt.format('MMM D')}`;
    }
    if (endDt) return `Arrive ${endDt.format('MMM D')}`;
    return null;
  };

  const depTime = (() => {
    if (reservation.type === 'flight' && reservation.notes) {
      const m = reservation.notes.match(/^Departs\s+(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{2,5})/im);
      if (m) return { time: m[1], tz: m[2] };
    }
    return { time: startDt.format('h:mm A'), tz: tzidToAbbrev(reservation.providerPhone, startDt.toDate()) };
  })();

  const arrTime = endDt
    ? { time: endDt.format('h:mm A'), tz: tzidToAbbrev(reservation.providerPhone, endDt.toDate()) }
    : null;

  const moreDetailsItems = [
    reservation.confirmationNumber ? { key: 'confirmation', label: 'Confirmation', value: reservation.confirmationNumber } : null,
    reservation.providerName ? { key: 'provider', label: 'Provider', value: reservation.providerName } : null,
    reservation.providerWebsite ? { key: 'website', label: 'Website', value: reservation.providerWebsite } : null,
    reservation.totalCost ? { key: 'cost', label: 'Total Cost', value: `${reservation.currency ?? ''} ${reservation.totalCost}`.trim() } : null,
    reservation.notes && !reservation.notes.startsWith('tripit::') ? { key: 'notes', label: 'Notes', value: reservation.notes } : null,
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  return (
    <Box>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/tripdetails/${tripId}`)}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}
      >
        Back to {tripTitle}
      </Button>

      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="column" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
            {typeIcon}
            <Typography variant="h4" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {reservation.title}
            </Typography>
            <Chip
              label="Scheduled"
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          {buildFlightSubtitle() && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
              {buildFlightSubtitle()}
            </Typography>
          )}

          {reservation.confirmationNumber && (
            <Typography variant="body2" color="text.secondary">
              Confirmation: <strong>{reservation.confirmationNumber}</strong>
            </Typography>
          )}

          {reservation.location && (
            <Typography variant="body2" color="text.secondary">
              <AddressMenu address={reservation.location} />
            </Typography>
          )}
        </Box>

        {/* Action buttons */}
        {mode === 'view' && (
          <Stack direction="row" spacing={1} sx={{ mt: { xs: 2, md: 0 }, flexShrink: 0 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setMode('edit')}
              sx={{ fontWeight: 600 }}
            >
              Edit Plan
            </Button>
            <Button
              variant="outlined"
              startIcon={<MoreHorizIcon />}
              onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
              sx={{ fontWeight: 600 }}
            >
              More Options
            </Button>
            <Menu
              anchorEl={moreMenuAnchor}
              open={Boolean(moreMenuAnchor)}
              onClose={() => setMoreMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => { setMoreMenuAnchor(null); setDeleteOpen(true); }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Delete Plan</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        )}
      </Stack>

      {mode === 'edit' ? (
        /* ─── EDIT MODE ─── */
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Edit {typeLabel}</Typography>
            {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
            <Stack spacing={2.5}>
              <TextField
                label="Title"
                fullWidth
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DateTimePicker
                    label="Start Date & Time"
                    value={editStart}
                    onChange={setEditStart}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DateTimePicker
                    label="End Date & Time"
                    value={editEnd}
                    onChange={setEditEnd}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Confirmation Number"
                fullWidth
                value={editConfirmation}
                onChange={(e) => setEditConfirmation(e.target.value)}
              />
              <TextField
                label="Provider / Airline / Vendor"
                fullWidth
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
              />
              <TextField
                label="Location"
                fullWidth
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => setMode('view')} disabled={saving}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
          </Paper>
        </LocalizationProvider>
      ) : (
        /* ─── VIEW MODE ─── */
        <Grid container spacing={3}>
          {/* Primary Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Primary Details</Typography>

            {reservation.type === 'flight' ? (
              <Box>
                <TimelineCell
                  isFirst
                  label={buildDepartureLabel()}
                  time={depTime.time}
                  timezone={depTime.tz}
                  chips={[
                    flightDetails?.seat ? { title: 'Seat', value: flightDetails.seat } : null,
                    endDt ? { title: 'Duration', value: (() => {
                      const mins = endDt.diff(startDt, 'minute');
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })() } : null,
                  ].filter(Boolean) as { title: string; value: string }[]}
                />
                {arrTime && (
                  <TimelineCell
                    isLast
                    label={buildArrivalLabel() ?? 'Arrive'}
                    time={arrTime.time}
                    timezone={arrTime.tz}
                    chips={[
                      flightDetails?.arrivalGate ? { title: 'Gate', value: flightDetails.arrivalGate } : null,
                      flightDetails?.arrivalTerminal ? { title: 'Terminal', value: flightDetails.arrivalTerminal } : null,
                    ].filter(Boolean) as { title: string; value: string }[]}
                  />
                )}
              </Box>
            ) : reservation.type === 'hotel' && hotelDetails ? (
              <Box>
                <TimelineCell
                  isFirst
                  label={`Check In ${startDt.format('MMM D, YYYY')}`}
                  time={hotelDetails.checkIn ? dayjs(hotelDetails.checkIn).format('h:mm A') : undefined}
                  chips={[
                    hotelDetails.roomType ? { title: 'Room', value: hotelDetails.roomType } : null,
                    hotelDetails.guestCount ? { title: 'Guests', value: hotelDetails.guestCount } : null,
                  ].filter(Boolean) as { title: string; value: string }[]}
                />
                <TimelineCell
                  isLast
                  label={`Check Out ${hotelDetails.checkOut ? dayjs(hotelDetails.checkOut).format('MMM D, YYYY') : ''}`}
                  time={hotelDetails.checkOut ? dayjs(hotelDetails.checkOut).format('h:mm A') : undefined}
                />
              </Box>
            ) : reservation.type === 'car' && carDetails ? (
              <Box>
                <TimelineCell
                  isFirst
                  label={`Pick Up ${dayjs(carDetails.pickupDateTime).format('MMM D, YYYY')}`}
                  time={dayjs(carDetails.pickupDateTime).format('h:mm A')}
                  chips={[
                    carDetails.vehicleClass ? { title: 'Vehicle', value: carDetails.vehicleClass } : null,
                    { title: 'Location', value: <AddressMenu address={carDetails.pickupLocation} /> },
                  ].filter(Boolean) as { title: string; value: React.ReactNode }[]}
                />
                <TimelineCell
                  isLast
                  label={`Drop Off ${dayjs(carDetails.dropoffDateTime).format('MMM D, YYYY')}`}
                  time={dayjs(carDetails.dropoffDateTime).format('h:mm A')}
                  chips={[{ title: 'Location', value: <AddressMenu address={carDetails.dropoffLocation} /> }]}
                />
              </Box>
            ) : (
              <Box>
                <TimelineCell
                  isFirst
                  isLast
                  label={startDt.format('ddd, MMM D, YYYY')}
                  time={startDt.format('h:mm A')}
                  timezone={tzidToAbbrev(reservation.providerPhone, startDt.toDate())}
                  chips={[
                    activityDetails?.venue ? { title: 'Venue', value: activityDetails.venue } : null,
                    activityDetails?.ticketCount ? { title: 'Tickets', value: activityDetails.ticketCount } : null,
                    transportDetails?.operator ? { title: 'Operator', value: transportDetails.operator } : null,
                  ].filter(Boolean) as { title: string; value: React.ReactNode }[]}
                />
              </Box>
            )}
          </Grid>

          {/* Sidebar details */}
          <Grid size={{ xs: 12, md: 4 }}>
            {reservation.type === 'flight' && flightDetails && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Aircraft Details</Typography>
                <DetailRow label="Airline" value={flightDetails.airline} />
                <DetailRow label="Flight Number" value={flightDetails.flightNumber} />
                <DetailRow label="Departure Airport" value={flightDetails.departureAirport} />
                <DetailRow label="Arrival Airport" value={flightDetails.arrivalAirport} />
                <DetailRow label="Departure Terminal" value={flightDetails.departureTerminal} />
                <DetailRow label="Departure Gate" value={flightDetails.departureGate} />
                <DetailRow label="Booking Class" value={flightDetails.bookingClass} />
                <DetailRow label="Ticket Number" value={flightDetails.ticketNumber} />
              </Paper>
            )}
            {reservation.type === 'hotel' && hotelDetails && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Hotel Details</Typography>
                <DetailRow label="Hotel" value={hotelDetails.hotelName} />
                <DetailRow label="Address" value={hotelAddress ? <AddressMenu address={hotelAddress} /> : undefined} />
                <DetailRow label="Room Type" value={hotelDetails.roomType} />
                <DetailRow label="Guests" value={hotelDetails.guestCount} />
              </Paper>
            )}

            {/* Reservation info */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Reservation Info</Typography>
              <DetailRow label="Type" value={typeLabel} />
              <DetailRow label="Confirmation" value={reservation.confirmationNumber} />
              <DetailRow label="Provider" value={reservation.providerName} />
              <DetailRow label="Location" value={reservation.location ? <AddressMenu address={reservation.location} /> : undefined} />
              <DetailRow label="Total Cost" value={reservation.totalCost ? `${reservation.currency ?? ''} ${reservation.totalCost}`.trim() : undefined} />
            </Paper>
          </Grid>

          {/* More Details collapsible */}
          {moreDetailsItems.length > 0 && (
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>More Details</Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {moreDetailsItems.map((item) => (
                  <Box key={item.key}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ cursor: 'pointer', py: 1 }}
                      onClick={() => toggleSection(item.key)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 18,
                          color: 'text.secondary',
                          transform: expandedSections[item.key] ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </Stack>
                    <Collapse in={expandedSections[item.key]}>
                      <Typography variant="body2" color="text.secondary" sx={{ pb: 2, whiteSpace: 'pre-line' }}>
                        {item.value}
                      </Typography>
                    </Collapse>
                    <Divider />
                  </Box>
                ))}
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Event?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. This event will be permanently removed from your itinerary.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
