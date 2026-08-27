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
  onMerged?: (updatedSource: APITrip, mergedTargetIds: string[]) => void;
}

interface TargetTrip extends UITrip {
  accountId?: string;
}

export default function MergeTripDialog({ open, onClose, sourceTrip, onMerged }: MergeTripDialogProps) {
  const [targets, setTargets] = useState<TargetTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setTargets([]);
      setSelectedIds(new Set());
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
    if (selectedIds.size === 0) return;
    const targetTripIds = Array.from(selectedIds);
    setMerging(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${sourceTrip.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTripIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to merge trips (${res.status})`);
      }
      const updatedSource: APITrip = await res.json();
      onMerged?.(updatedSource, targetTripIds);
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
              Selected trip to merge
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
              Select trips to merge into this trip
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
                    selected={selectedIds.has(trip.id)}
                    onClick={() => toggleSelection(trip.id)}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      bgcolor: selectedIds.has(trip.id) ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mb: 0.5 }}>
                      <Checkbox checked={selectedIds.has(trip.id)} sx={{ p: 0 }} />
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
          disabled={selectedIds.size === 0 || merging || loading}
          startIcon={merging ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {merging ? 'Merging...' : 'Merge Trips'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
