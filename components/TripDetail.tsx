'use client';

import { useState, useMemo } from 'react';
import {
  Button,
  Stack,
  Box,
  Typography,
  Avatar,
  Paper,
  Chip,
  Alert,
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
  FlightIcon,
  CarIcon,
  HotelIcon,
  RailIcon,
  BusIcon,
  ActivityIcon,
  RestaurantIcon,
  NoteIcon,
  MusicIcon,
  TheaterIcon,
  TourIcon,
  ClockIcon,
  ArrowBackIcon,
  ChevronRightIcon,
  LinkIcon,
  LocationIcon,
  PrintIcon,
  MergeIcon,
  ShareIcon,
  DeleteIcon,
  MoveIcon,
  CopyEventIcon,
  MailIcon,
} from '@/components/Icons';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { type UITrip, formatTrip, type APITrip } from '../hooks/use-trips';
import { useReservations, reservationsToPlanDays } from '../hooks/use-reservations';
import LocationImage from './LocationImage';
import type { LocationDisplayMode } from '../lib/location-image';
import EditTripDialog from './EditTripDialog';
import MergeTripDialog from './MergeTripDialog';
import ShareTripDialog from './ShareTripDialog';
import TripMemberAvatars from './TripMemberAvatars';
import AddPlanButton, { type PlanType } from './AddPlanButton';
import PlanDialog from './PlanDialog';
import MoveEventDialog from './MoveEventDialog';
import PlanDetails from './PlanDetails';
import TripRouteMap from './map/TripRouteMap';

interface TripDetailProps {
  trip: UITrip;
  onTripUpdated?: (trip: UITrip) => void;
  displayMode?: LocationDisplayMode;
}

const ICONS: Record<string, React.ReactNode> = {
  flight: <FlightIcon />,
  car: <CarIcon />,
  hotel: <HotelIcon />,
  rail: <RailIcon />,
  transport: <BusIcon />,
  activity: <ActivityIcon />,
  restaurant: <RestaurantIcon />,
  note: <NoteIcon />,
  concert: <MusicIcon />,
  theater: <TheaterIcon />,
  tour: <TourIcon />,
  layover: <ClockIcon />,
};

const TYPE_COLORS: Record<string, string> = {
  layover: '#9e9e9e',
  flight: '#1b6b3a',
  hotel: '#1565c0',
  car: '#e65100',
  rail: '#6a1b9a',
  cruise: '#00695c',
  transport: '#4527a0',
  activity: '#0277bd',
  restaurant: '#c62828',
  concert: '#880e4f',
  theater: '#4a148c',
  tour: '#1b5e20',
  meeting: '#0d47a1',
  note: '#455a64',
  other: '#546e7a',
};

const LINE_COLOR = '#d0d0d0';
const SUBWAY_WIDTH = { xs: 36, md: 48 };
const TIME_WIDTH = { xs: 64, md: 110 };

function planIcon(type: string) {
  return ICONS[type] || <ActivityIcon />;
}

function planColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

export default function TripDetail({ trip, onTripUpdated, displayMode = 'map' }: TripDetailProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { reservations, loading, refetch } = useReservations(trip.id);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [eventMenuAnchor, setEventMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [eventDeleteOpen, setEventDeleteOpen] = useState(false);
  const [eventDeleting, setEventDeleting] = useState(false);
  const [eventDeleteError, setEventDeleteError] = useState<string | null>(null);
  const [eventMoveOpen, setEventMoveOpen] = useState(false);
  const [eventMoveMode, setEventMoveMode] = useState<'move' | 'copy'>('move');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDialogContent, setEmailDialogContent] = useState<{ html: string; subject: string } | null>(null);

  const plans = useMemo(
    () => reservationsToPlanDays(reservations, trip.startDate, trip.endDate),
    [reservations, trip.startDate, trip.endDate]
  );

  const handleSelectType = (type: PlanType, date?: string) => {
    setSelectedPlanType(type);
    setDefaultDate(date);
    setDialogOpen(true);
  };

  const handleCreated = () => {
    refetch();
    setDialogOpen(false);
    setSelectedPlanType(null);
    setDefaultDate(undefined);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPlanType(null);
    setDefaultDate(undefined);
  };

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleDeleteClick = () => {
    handleCloseMenu();
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const handleMergeClick = () => {
    handleCloseMenu();
    setMergeOpen(true);
  };

  const handleShareClick = () => {
    handleCloseMenu();
    setShareOpen(true);
  };

  const handleTripMerged = (updatedDestination: APITrip) => {
    setMergeOpen(false);
    router.replace(`/tripdetails/${updatedDestination.id}`);
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete trip');
      router.push('/trips');
    } catch {
      setDeleteError('Failed to delete trip. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleTripUpdated = (updatedTrip: APITrip) => {
    const uiTrip = formatTrip(updatedTrip);
    onTripUpdated?.(uiTrip);
    setEditOpen(false);
  };

  const handleOpenEventMenu = (e: React.MouseEvent<HTMLElement>, eventId: string) => {
    e.stopPropagation();
    setActiveEventId(eventId);
    setEventMenuAnchor(e.currentTarget);
  };

  const handleCloseEventMenu = () => {
    setEventMenuAnchor(null);
  };

  const handleViewEvent = () => {
    handleCloseEventMenu();
    if (activeEventId) {
      router.push(`/tripdetails/${trip.id}/event/${activeEventId}`);
    }
  };

  const handleViewEventById = (eventId: string) => {
    router.push(`/tripdetails/${trip.id}/event/${eventId}`);
  };

  const handleEditEvent = () => {
    handleCloseEventMenu();
    if (activeEventId) {
      router.push(`/tripdetails/${trip.id}/event/${activeEventId}?mode=edit`);
    }
  };

  const handleDeleteEventClick = () => {
    handleCloseEventMenu();
    setEventDeleteError(null);
    setEventDeleteOpen(true);
  };

  const handleMoveEventClick = () => {
    handleCloseEventMenu();
    setEventMoveMode('move');
    setEventMoveOpen(true);
  };

  const handleCopyEventClick = () => {
    handleCloseEventMenu();
    setEventMoveMode('copy');
    setEventMoveOpen(true);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!activeEventId) return;
    setEventDeleting(true);
    setEventDeleteError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}/reservations/${activeEventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');
      refetch();
      setEventDeleteOpen(false);
      setActiveEventId(null);
    } catch {
      setEventDeleteError('Failed to delete event. Please try again.');
    } finally {
      setEventDeleting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/trips')}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}
      >
        Back to Trips
      </Button>

      {/* Trip Detail Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 4, gap: { xs: 3, md: 0 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontSize: { xs: '1.5rem', md: '2.125rem' }, wordBreak: 'break-word' }}>
            {trip.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {trip.location}
          </Typography>
          {trip.destinations.length > 1 && (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2, justifyContent: 'flex-start', width: '100%', maxWidth: '100%', minWidth: 0 }}>
              {trip.destinations.map((dest, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
                  label={dest.location}
                  variant="outlined"
                  sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                />
              ))}
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {trip.date} ({trip.duration})
          </Typography>

          <TripMemberAvatars members={trip.members} createdBy={trip.createdBy} />

          <Stack direction="row" spacing={3} alignItems="center" sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => setEditOpen(true)}
              sx={{ color: 'primary.main', textTransform: 'none', minWidth: 0, px: 0.5 }}
            >
              <EditIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 600, ml: 0.5 }}>Edit Trip Info</Typography>
            </Button>
            <Button
              size="small"
              onClick={handleOpenMenu}
              sx={{ color: 'primary.main', textTransform: 'none', minWidth: 0, px: 0.5 }}
            >
              <MoreHorizIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 600, ml: 0.5 }}>More Options</Typography>
            </Button>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <MenuItem onClick={handleCloseMenu}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Print Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleMergeClick}>
                <ListItemIcon><MergeIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Merge Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleShareClick}>
                <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Share Trip</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Delete Trip</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        <LocationImage
          locations={trip.destinations.length > 0 ? trip.destinations.map((d) => d.location) : [trip.location]}
          fallbackImage={trip.image}
          displayMode={displayMode}
          width={{ xs: '100%', md: 440 }}
          height={{ xs: 200, md: 250 }}
          borderRadius={2}
        />
      </Stack>

      {/* Trip Route Map */}
      {trip.destinations.length > 1 && (
        <Box sx={{ mb: 4, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Trip Route
          </Typography>
          <TripRouteMap
            tripId={trip.id}
            stops={trip.destinations}
            plans={plans}
            startDate={trip.startDate}
            originAirport={trip.originAirport}
            darkMode={isDark}
            height={340}
          />
        </Box>
      )}

      {/* Itinerary Timeline */}
      <Box>
        {plans.length === 0 && !loading && (
          <Paper
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              mb: 4,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              No plans yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first plan to start building your itinerary.
            </Typography>
            <Stack justifyContent="center" direction="row">
              <AddPlanButton onSelect={handleSelectType} />
            </Stack>
          </Paper>
        )}

        {plans.map((day, dayIdx) => {
          const isLastDay = dayIdx === plans.length - 1;
          return (
            <Box key={day.id}>
              {/* Day header row — full-width paper bar; header background covers the line gap */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  bgcolor: 'background.paper',
                  minHeight: 40,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ width: TIME_WIDTH, flexShrink: 0 }} />
                <Box sx={{ width: SUBWAY_WIDTH, flexShrink: 0 }} />
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pr: 2,
                    py: 0.75,
                    zIndex: 1,
                  }}
                >
                  <Box
                    component="button"
                    onClick={() => router.push(`/tripdetails/${trip.id}/day/${encodeURIComponent(day.date)}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      background: 'none',
                      border: 'none',
                      p: 0.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      color: 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {day.date}
                    </Typography>
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <AddPlanButton onSelect={handleSelectType} size="small" defaultDate={day.date} />
                </Box>
              </Box>

              {/* Plan items */}
              {day.items.map((item, itemIdx) => {
                const isFirst = dayIdx === 0 && itemIdx === 0;
                const isLast = isLastDay && itemIdx === day.items.length - 1;
                const isLayover = item.type === 'layover';
                return (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Time column */}
                    <Box
                      sx={{
                        width: TIME_WIDTH,
                        flexShrink: 0,
                        textAlign: 'right',
                        pr: { xs: 1, md: 2 },
                        pt: 1.25,
                      }}
                    >
                      {!isLayover && (
                        <>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {item.time}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.timezone}
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* Subway column */}
                    <Box
                      sx={{
                        width: SUBWAY_WIDTH,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      {/* Prepend line */}
                      <Box
                        sx={{
                          width: 2,
                          height: 14,
                          bgcolor: isFirst ? 'transparent' : LINE_COLOR,
                          flexShrink: 0,
                        }}
                      />
                      {/* Icon circle */}
                      {isLayover ? (
                        <Avatar
                          sx={{
                            bgcolor: planColor(item.type),
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                            zIndex: 1,
                            '& .MuiSvgIcon-root': { fontSize: 20 },
                          }}
                        >
                          {planIcon(item.type)}
                        </Avatar>
                      ) : (
                        <Box
                          component="button"
                          onClick={() => handleViewEventById(item.id)}
                          sx={{
                            bgcolor: 'transparent',
                            border: 'none',
                            p: 0,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: planColor(item.type),
                              width: 38,
                              height: 38,
                              flexShrink: 0,
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                            }}
                          >
                            {planIcon(item.type)}
                          </Avatar>
                        </Box>
                      )}
                      {/* Append line */}
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          bgcolor: isLast ? 'transparent' : LINE_COLOR,
                          minHeight: 32,
                        }}
                      />
                    </Box>

                    {/* Content column */}
                    <Box sx={{ flex: 1, minWidth: 0, maxWidth: '100%', pl: 2, pt: isLayover ? 1.5 : 1, pb: isLayover ? 1.5 : 3 }}>
                      {isLayover ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic', pt: 0.5 }}
                        >
                          {item.title}
                        </Typography>
                      ) : (
                        <>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <Typography
                              variant="h6"
                              color="primary.main"
                              sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3, cursor: 'pointer' }}
                              onClick={() => handleViewEventById(item.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  handleViewEventById(item.id);
                                }
                              }}
                            >
                              {item.title}
                            </Typography>
                            <Box
                              component="button"
                              onClick={(e: React.MouseEvent<HTMLElement>) => handleOpenEventMenu(e, item.id)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'text.secondary',
                                cursor: 'pointer',
                                ml: 1,
                                flexShrink: 0,
                                background: 'none',
                                border: 'none',
                                p: 0.5,
                                borderRadius: 1,
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
                              <MoreHorizIcon sx={{ fontSize: 18 }} />
                              <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'inline' } }}>More Options</Typography>
                            </Box>
                          </Box>
                          {item.reservation ? (
                            <PlanDetails reservation={item.reservation} />
                          ) : item.details ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5, whiteSpace: 'pre-line' }}
                            >
                              {item.details}
                            </Typography>
                          ) : null}
                          {item.reservation?.rawEmailHtml && (
                            <Box sx={{ mt: 0.5 }}>
                              <Button
                                size="small"
                                startIcon={<MailIcon sx={{ fontSize: '1rem' }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailDialogContent({
                                    html: item.reservation!.rawEmailHtml!,
                                    subject: item.reservation!.rawEmailSubject ?? 'Email',
                                  });
                                  setEmailDialogOpen(true);
                                }}
                                sx={{
                                  color: 'text.secondary',
                                  textTransform: 'none',
                                  minWidth: 0,
                                  px: 1,
                                  py: 0.25,
                                  fontSize: '0.8125rem',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                View original email
                              </Button>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      <PlanDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        tripId={trip.id}
        type={selectedPlanType}
        onCreated={handleCreated}
        defaultDate={defaultDate}
      />

      <EditTripDialog
        open={editOpen}
        trip={trip}
        onClose={() => setEditOpen(false)}
        onTripUpdated={handleTripUpdated}
      />

      <MergeTripDialog
        open={mergeOpen}
        sourceTrip={trip}
        onClose={() => setMergeOpen(false)}
        onMerged={handleTripMerged}
      />

      <ShareTripDialog
        open={shareOpen}
        trip={trip}
        onClose={() => setShareOpen(false)}
      />

      {/* Per-event actions menu */}
      <Menu
        anchorEl={eventMenuAnchor}
        open={Boolean(eventMenuAnchor)}
        onClose={handleCloseEventMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleViewEvent}>
          <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditEvent}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMoveEventClick}>
          <ListItemIcon><MoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCopyEventClick}>
          <ListItemIcon><CopyEventIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy Event Detail</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteEventClick} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete Event Detail</ListItemText>
        </MenuItem>
      </Menu>

      {/* Event delete confirmation */}
      <Dialog open={eventDeleteOpen} onClose={() => setEventDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Event?</DialogTitle>
        <DialogContent>
          {eventDeleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>{eventDeleteError}</Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. This event will be permanently removed from your itinerary.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEventDeleteOpen(false)} disabled={eventDeleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteEvent}
            disabled={eventDeleting}
            startIcon={eventDeleting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {eventDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move / Copy event dialog */}
      {activeEventId && (() => {
        const activeReservation = reservations.find((r) => r.id === activeEventId);
        if (!activeReservation) return null;
        return (
          <MoveEventDialog
            open={eventMoveOpen}
            mode={eventMoveMode}
            onClose={() => { setEventMoveOpen(false); }}
            sourceTripId={trip.id}
            sourceTripTitle={trip.title}
            reservation={activeReservation}
            onSuccess={(mode) => {
              setEventMoveOpen(false);
              if (mode === 'move') refetch();
            }}
          />
        );
      })()}

      {/* Email viewer dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MailIcon sx={{ fontSize: 20 }} />
          {emailDialogContent?.subject ?? 'Email'}
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {emailDialogContent && (
            <iframe
              srcDoc={emailDialogContent.html}
              title="Original email"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEmailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Trip?</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. All plans, reservations, and documents for this trip will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
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
    </Box>
  );
}
