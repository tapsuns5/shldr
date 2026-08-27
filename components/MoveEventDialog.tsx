'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  Radio,
} from '@mui/material';
import { MoveIcon, CopyEventIcon, LocationIcon } from '@/components/Icons';
import { type UITrip, type APITrip, formatTrip } from '@/hooks/use-trips';
import { type APIReservation } from '@/hooks/use-reservations';

interface MoveEventDialogProps {
  open: boolean;
  mode: 'move' | 'copy';
  onClose: () => void;
  sourceTripId: string;
  sourceTripTitle: string;
  reservation: APIReservation;
  onSuccess?: (mode: 'move' | 'copy', targetTrip: UITrip) => void;
}

export default function MoveEventDialog({
  open,
  mode,
  onClose,
  sourceTripId,
  sourceTripTitle,
  reservation,
  onSuccess,
}: MoveEventDialogProps) {
  const [trips, setTrips] = useState<UITrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTrips([]);
      setSelectedId(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const accountsRes = await fetch('/api/accounts');
        if (!accountsRes.ok) throw new Error('Failed to load account');
        const accounts = await accountsRes.json();
        if (!accounts.length) throw new Error('No account found');
        const accountId: string = accounts[0].id;

        const res = await fetch(`/api/trips?accountId=${accountId}`);
        if (!res.ok) throw new Error('Failed to load trips');
        const data: APITrip[] = await res.json();
        if (!cancelled) {
          setTrips(
            data
              .map(formatTrip)
              .filter((t) => t.id !== sourceTripId)
          );
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, sourceTripId]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);

    const targetTrip = trips.find((t) => t.id === selectedId)!;

    try {
      if (mode === 'move') {
        const res = await fetch(`/api/trips/${sourceTripId}/reservations/${reservation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId: selectedId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to move event (${res.status})`);
        }
      } else {
        const { id: _id, tripId: _tripId, createdAt: _ca, updatedAt: _ua, createdBy: _cb, source: _src, details, ...rest } = reservation;
        const body = {
          ...rest,
          source: 'manual' as const,
          details,
        };
        const res = await fetch(`/api/trips/${selectedId}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to copy event (${res.status})`);
        }
      }

      onSuccess?.(mode, targetTrip);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const isMove = mode === 'move';
  const Icon = isMove ? MoveIcon : CopyEventIcon;
  const verb = isMove ? 'Move' : 'Copy';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon fontSize="small" />
          <span>{verb} Event to Another Trip</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Source event summary */}
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isMove ? 'Moving from' : 'Copying from'}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.25 }}>
              {sourceTripTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reservation.title}
            </Typography>
          </Box>

          {/* Trip selector */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Select destination trip
            </Typography>

            {loading && (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <CircularProgress size={24} />
              </Stack>
            )}

            {!loading && trips.length === 0 && !error && (
              <Typography variant="body2" color="text.secondary">
                No other trips available.
              </Typography>
            )}

            {!loading && trips.length > 0 && (
              <List disablePadding>
                {trips.map((trip) => {
                  const selected = selectedId === trip.id;
                  return (
                    <ListItemButton
                      key={trip.id}
                      selected={selected}
                      onClick={() => setSelectedId(trip.id)}
                      sx={{
                        border: 1,
                        borderColor: selected ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        mb: 1,
                        alignItems: 'flex-start',
                        bgcolor: selected ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <Radio
                        checked={selected}
                        size="small"
                        sx={{ p: 0, mr: 1.5, mt: 0.25 }}
                        disableRipple
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {trip.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {trip.date} ({trip.duration})
                            </Typography>
                          }
                          disableTypography
                        />
                        {trip.destinations.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {trip.destinations.map((dest, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                icon={<LocationIcon sx={{ fontSize: '0.85rem' }} />}
                                label={dest.location}
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedId || submitting || loading}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Icon fontSize="small" />}
        >
          {submitting ? `${verb}ing…` : `${verb} Event`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
