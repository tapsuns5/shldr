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
  Checkbox,
} from '@mui/material';
import { MergeIcon, LocationIcon } from '@/components/Icons';
import { type UITrip, type APITrip, formatTrip } from '../hooks/use-trips';

interface MergeTripDialogProps {
  open: boolean;
  onClose: () => void;
  sourceTrip: UITrip;
  onMerged?: (updatedDestination: APITrip, deletedSourceId: string) => void;
}

interface TargetTrip extends UITrip {
  accountId?: string;
}

export default function MergeTripDialog({ open, onClose, sourceTrip, onMerged }: MergeTripDialogProps) {
  const [targets, setTargets] = useState<TargetTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setTargets([]);
      setSelectedId(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const res = await fetch(`/api/trips/${sourceTrip.id}/merge-options`);
        if (!res.ok) throw new Error('Failed to load merge options');
        const data: APITrip[] = await res.json();
        if (!cancelled) setTargets(data.map(formatTrip));
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, sourceTrip.id]);

  const handleMerge = async () => {
    if (!selectedId) return;
    setMerging(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${sourceTrip.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationTripId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to merge trips (${res.status})`);
      }
      const updatedDestination: APITrip = await res.json();
      onMerged?.(updatedDestination, sourceTrip.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setMerging(false);
    }
  };

  const handleClose = () => {
    if (merging) return;
    onClose();
  };

  const toggleSelection = (id: string) => {
    setSelectedId((current) => current === id ? null : id);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MergeIcon fontSize="small" />
          <span>Merge Trip</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Trip being moved
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {sourceTrip.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {sourceTrip.date} ({sourceTrip.duration})
            </Typography>
            {sourceTrip.destinations.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {sourceTrip.destinations.map((dest, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
                    label={dest.location}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Select the trip to move this trip into
            </Typography>
            {loading && (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <CircularProgress size={24} />
              </Stack>
            )}
            {!loading && targets.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No other trips available to merge into.
              </Typography>
            )}
            {!loading && targets.length > 0 && (
              <List disablePadding>
                {targets.map((trip) => (
                  <ListItemButton
                    key={trip.id}
                    selected={selectedId === trip.id}
                    onClick={() => toggleSelection(trip.id)}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      bgcolor: selectedId === trip.id ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mb: 0.5 }}>
                      <Checkbox checked={selectedId === trip.id} sx={{ p: 0 }} />
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {trip.title}
                          </Typography>
                        }
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mb: 0.5 }}>
                      {trip.date} ({trip.duration})
                    </Typography>
                    {trip.destinations.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, pl: 4 }}>
                        {trip.destinations.map((dest, idx) => (
                          <Chip
                            key={idx}
                            size="small"
                            icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
                            label={dest.location}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={merging}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleMerge}
          disabled={!selectedId || merging || loading}
          startIcon={merging ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {merging ? 'Merging...' : 'Merge Trips'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
