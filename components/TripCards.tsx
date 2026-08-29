'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Stack,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  EditIcon,
  MoreHorizIcon,
  LinkIcon,
  LocationIcon,
  PrintIcon,
  MergeIcon,
  ShareIcon,
  DeleteIcon,
} from '@/components/Icons';
import { type UITrip, formatTrip, type APITrip } from '../hooks/use-trips';
import LocationImage from './LocationImage';
import type { LocationDisplayMode } from '../lib/location-image';
import EditTripDialog from './EditTripDialog';
import MergeTripDialog from './MergeTripDialog';
import ShareTripDialog from './ShareTripDialog';
import TripMemberAvatars from './TripMemberAvatars';

function hasRealLocation(trip: UITrip): boolean {
  if (trip.destinations.length > 0) return true;
  if (!trip.location) return false;
  return !/no destination|not specified|unknown|n\/a/i.test(trip.location);
}

function getTimeBadge(startDate: string, endDate: string): string | null {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const today = dayjs().startOf('day');

  if (end.isBefore(today)) return null;
  if (!start.isAfter(today)) return 'Active now';

  const daysUntil = start.diff(today, 'day');
  if (daysUntil <= 1) return 'Tomorrow';
  if (daysUntil < 7) return `In ${daysUntil} days`;
  if (daysUntil < 14) return 'In 1 week';
  const weeks = Math.floor(daysUntil / 7);
  if (weeks < 5) return `In ${weeks} weeks`;
  const months = Math.floor(daysUntil / 30);
  if (months < 12) return `In ${months} month${months > 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  return `In ${years} year${years > 1 ? 's' : ''}`;
}

interface TripCardsProps {
  loading: boolean;
  error: string | null;
  trips: UITrip[];
  onTripClick: (trip: UITrip) => void;
  onTripDeleted?: (tripId: string) => void;
  onTripUpdated?: (trip: UITrip) => void;
  displayMode?: LocationDisplayMode;
}

export default function TripCards({ loading, error, trips, onTripClick, onTripDeleted, onTripUpdated, displayMode = 'map' }: TripCardsProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTripId, setMenuTripId] = useState<string | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTrip, setEditTrip] = useState<UITrip | null>(null);
  const [editFocusLocation, setEditFocusLocation] = useState(false);
  const [mergeTrip, setMergeTrip] = useState<UITrip | null>(null);
  const [shareTrip, setShareTrip] = useState<UITrip | null>(null);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, tripId: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuTripId(tripId);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuTripId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCloseMenu();
    setDeleteTripId(menuTripId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTripId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${deleteTripId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete trip');
      onTripDeleted?.(deleteTripId);
      setDeleteTripId(null);
    } catch {
      // keep dialog open on error; could add error state later
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTripId(null);
  };

  const handleEditClick = (e: React.MouseEvent, trip: UITrip) => {
    e.stopPropagation();
    setEditFocusLocation(false);
    setEditTrip(trip);
  };

  const handleAddLocationClick = (e: React.MouseEvent, trip: UITrip) => {
    e.stopPropagation();
    setEditFocusLocation(true);
    setEditTrip(trip);
  };

  const handleEditClose = () => {
    setEditTrip(null);
    setEditFocusLocation(false);
  };

  const handleMergeClick = (e: React.MouseEvent, trip: UITrip) => {
    e.stopPropagation();
    handleCloseMenu();
    setMergeTrip(trip);
  };

  const handleShareClick = (e: React.MouseEvent, trip: UITrip) => {
    e.stopPropagation();
    handleCloseMenu();
    setShareTrip(trip);
  };

  const handleTripUpdated = (updatedTrip: APITrip) => {
    const uiTrip = formatTrip(updatedTrip);
    onTripUpdated?.(uiTrip);
    setEditTrip(null);
    setEditFocusLocation(false);
  };

  const handleTripMerged = (updatedDestination: APITrip, deletedSourceId: string) => {
    onTripUpdated?.(formatTrip(updatedDestination));
    onTripDeleted?.(deletedSourceId);
    setMergeTrip(null);
  };

  return (
    <>
      {loading && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Loading trips…
        </Typography>
      )}
      {!loading && error && (
        <Typography variant="body1" color="error" sx={{ textAlign: 'center', py: 4 }}>
          {error}
        </Typography>
      )}
      {!loading && !error && trips.length === 0 && (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No trips found. Add your first trip to get started.
        </Typography>
      )}
      <Stack spacing={{ xs: 2, sm: 3 }}>
        {trips.map((trip) => {
          const timeBadge = getTimeBadge(trip.startDate, trip.endDate);
          return (
          <Card
            key={trip.id}
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              border: 'none',
              borderRadius: { xs: 1.5, sm: 2 },
              overflow: 'visible',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
              },
            }}
            onClick={() => {
              if (menuAnchor || deleteTripId || editTrip) return;
              onTripClick(trip);
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0, sm: 2.5 }}
              sx={{ minHeight: { xs: 'auto', sm: '200px' } }}
            >
              {/* Image section — left side, Airbnb-style photo-first */}
              <Box
                sx={{
                  position: 'relative',
                  flexShrink: 0,
                  width: { xs: '100%', sm: 340 },
                  height: { xs: 200, sm: 'auto' },
                  minHeight: { sm: 200 },
                }}
              >
                {hasRealLocation(trip) ? (
                  <LocationImage
                    locations={trip.destinations.length > 0 ? trip.destinations.map((d) => d.location) : [trip.location]}
                    fallbackImage={trip.image}
                    displayMode={displayMode}
                    width="100%"
                    height="100%"
                    borderRadius={2}
                  />
                ) : (
                  <Box
                    onClick={(e) => handleAddLocationClick(e, trip)}
                    sx={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <LocationIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Add a location
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click to set your trip destination
                    </Typography>
                  </Box>
                )}
                {timeBadge && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: 'rgba(0,0,0,0.72)',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  >
                    {timeBadge}
                  </Box>
                )}
              </Box>

              {/* Content section — right side */}
              <CardContent sx={{ flex: 1, p: { xs: 2, sm: 2.5 }, position: 'relative' }}>
                {/* Action buttons — top-right, Airbnb-style circular icon buttons */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: { xs: 4, sm: 8 },
                    right: { xs: 4, sm: 8 },
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleEditClick(e, trip)}
                    sx={{ color: 'text.secondary', width: 32, height: 32 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleOpenMenu(e, trip.id)}
                    sx={{ color: 'text.secondary', width: 32, height: 32 }}
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Title — Airbnb display-lg style: ~22px, weight 600 */}
                <Typography
                  sx={{
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600,
                    lineHeight: 1.25,
                    pr: 6,
                  }}
                >
                  {trip.title}
                </Typography>

                {/* Date · duration — Airbnb body-sm: 14px, muted */}
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    mt: 0.5,
                  }}
                >
                  {trip.date} · {trip.duration}
                </Typography>

                {/* Destinations — plain text with icon, not chips */}
                {trip.destinations.length > 0 && (
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                    {trip.destinations.map((dest, idx) => (
                      <Typography
                        key={idx}
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <LocationIcon sx={{ fontSize: '0.9rem' }} />
                        {dest.location}
                      </Typography>
                    ))}
                  </Stack>
                )}

                {/* Member avatars */}
                <Box sx={{ mt: 1.5 }}>
                  <TripMemberAvatars members={trip.members} createdBy={trip.createdBy} />
                </Box>
              </CardContent>
            </Stack>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor) && menuTripId === trip.id}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={(e) => { e.stopPropagation(); handleCloseMenu(); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Print Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={(e) => handleMergeClick(e, trip)}>
                <ListItemIcon><MergeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Merge Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={(e) => handleShareClick(e, trip)}>
                <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Share Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Delete Trip</ListItemText>
              </MenuItem>
            </Menu>
          </Card>
          );
        })}
      </Stack>

      <Dialog open={Boolean(deleteTripId)} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Trip?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. All plans, reservations, and documents for this trip will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCancelDelete} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditTripDialog
        open={Boolean(editTrip)}
        trip={editTrip}
        onClose={handleEditClose}
        onTripUpdated={handleTripUpdated}
        focusLocation={editFocusLocation}
      />

      {mergeTrip && (
        <MergeTripDialog
          open={Boolean(mergeTrip)}
          sourceTrip={mergeTrip}
          onClose={() => setMergeTrip(null)}
          onMerged={handleTripMerged}
        />
      )}

      {shareTrip && (
        <ShareTripDialog
          open={Boolean(shareTrip)}
          trip={shareTrip}
          onClose={() => setShareTrip(null)}
        />
      )}
    </>
  );
}
