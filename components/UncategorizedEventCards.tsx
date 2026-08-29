'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  ActivityIcon,
  BusIcon,
  CarIcon,
  CopyEventIcon,
  DeleteIcon,
  EditIcon,
  FlightIcon,
  HotelIcon,
  MoreHorizIcon,
  MoveIcon,
  RailIcon,
  RestaurantIcon,
} from '@/components/Icons';
import { useReservations, type APIReservation } from '@/hooks/use-reservations';
import type { UITrip } from '@/hooks/use-trips';
import MoveEventDialog from './MoveEventDialog';

const TYPE_LABELS: Record<string, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  car: 'Car Rental',
  rail: 'Rail',
  cruise: 'Cruise',
  activity: 'Activity',
  restaurant: 'Restaurant',
  transport: 'Transport',
  other: 'Event',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  flight: <FlightIcon fontSize="small" />,
  hotel: <HotelIcon fontSize="small" />,
  car: <CarIcon fontSize="small" />,
  rail: <RailIcon fontSize="small" />,
  activity: <ActivityIcon fontSize="small" />,
  restaurant: <RestaurantIcon fontSize="small" />,
  transport: <BusIcon fontSize="small" />,
};

interface UncategorizedEventCardsProps {
  trip: UITrip | null;
  tripsLoading: boolean;
}

export default function UncategorizedEventCards({ trip, tripsLoading }: UncategorizedEventCardsProps) {
  const router = useRouter();
  const { reservations, loading, error, refetch } = useReservations(trip?.id ?? '');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeReservation, setActiveReservation] = useState<APIReservation | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveMode, setMoveMode] = useState<'move' | 'copy'>('move');

  const openEvent = (reservation: APIReservation, edit = false) => {
    if (!trip) return;
    const params = new URLSearchParams({ from: 'uncategorized' });
    if (edit) params.set('mode', 'edit');
    router.push(`/tripdetails/${trip.id}/event/${reservation.id}?${params.toString()}`);
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, reservation: APIReservation) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setActiveReservation(reservation);
  };

  const closeMenu = () => setMenuAnchor(null);

  const openMove = (mode: 'move' | 'copy') => {
    setMoveMode(mode);
    setMoveOpen(true);
    closeMenu();
  };

  const openDelete = () => {
    setDeleteError(null);
    setDeleteOpen(true);
    closeMenu();
  };

  const deleteEvent = async () => {
    if (!trip || !activeReservation) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/trips/${trip.id}/reservations/${activeReservation.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      setDeleteOpen(false);
      setActiveReservation(null);
      refetch();
    } catch {
      setDeleteError('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (tripsLoading || loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!trip || reservations.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
        No uncategorized trip details.
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        {reservations.map((reservation) => (
          <Card
            key={reservation.id}
            elevation={0}
            onClick={() => openEvent(reservation)}
            sx={{
              borderRadius: 2,
              cursor: 'pointer',
              overflow: 'visible',
              transition: 'box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      color: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_ICONS[reservation.type] ?? <ActivityIcon fontSize="small" />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                        {reservation.title}
                      </Typography>
                      <Chip label={TYPE_LABELS[reservation.type] ?? 'Event'} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(reservation.startDateTime).format('ddd, MMM D, YYYY [at] h:mm A')}
                    </Typography>
                    {reservation.location && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {reservation.location}
                      </Typography>
                    )}
                    {reservation.providerName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {reservation.providerName}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="flex-end">
                  <IconButton
                    aria-label={`Edit ${reservation.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openEvent(reservation, true);
                    }}
                    sx={{ bgcolor: 'action.hover' }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    aria-label={`More options for ${reservation.title}`}
                    onClick={(event) => openMenu(event, reservation)}
                    sx={{ bgcolor: 'action.hover' }}
                  >
                    <MoreHorizIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => activeReservation && openEvent(activeReservation, true)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openMove('move')}>
          <ListItemIcon><MoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openMove('copy')}>
          <ListItemIcon><CopyEventIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete Event Detail</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Event?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. This event detail will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteEvent}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {trip && activeReservation && (
        <MoveEventDialog
          open={moveOpen}
          mode={moveMode}
          sourceTripId={trip.id}
          sourceTripTitle="Uncategorized"
          reservation={activeReservation}
          onClose={() => setMoveOpen(false)}
          onSuccess={(mode) => {
            setMoveOpen(false);
            if (mode === 'move') refetch();
          }}
        />
      )}
    </>
  );
}
