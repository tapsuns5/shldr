'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import {
  FlightIcon,
  HotelIcon,
  CarIcon,
  RailIcon,
  BusIcon,
  ActivityIcon,
  RestaurantIcon,
  NoteIcon,
  MusicIcon,
  TheaterIcon,
  TourIcon,
  ClockIcon,
  LocationIcon,
} from '@/components/Icons';
import {
  type APIReservation,
  reservationsToPlanDays,
} from '@/hooks/use-reservations';
import { type PlanDay } from '@/hooks/use-trips';
import LocationImage from '@/components/LocationImage';
import PlanDetails from '@/components/PlanDetails';

interface PublicDestination {
  city: string;
  state: string | null;
  country: string;
  arrivalDate: string | null;
  departureDate: string | null;
  sortOrder: string;
}

interface PublicTrip {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  destinationCity: string | null;
  destinationCountry: string | null;
  coverImage: string | null;
  tripDestinations: PublicDestination[];
  reservations: APIReservation[];
  expiresAt: string | null;
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

function formatLocation(d: PublicDestination): string {
  return [d.city, d.state, d.country].filter(Boolean).join(', ');
}

export default function PublicTripPage() {
  const params = useParams();
  const token = params.token as string;

  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [plans, setPlans] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/public/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load trip');
        }
        const data: PublicTrip = await res.json();
        if (!cancelled) {
          setTrip(data);
          setPlans(reservationsToPlanDays(data.reservations));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!trip) return null;

  const start = dayjs(trip.startDate);
  const end = dayjs(trip.endDate);
  const durationDays = end.diff(start, 'day') + 1;
  const dateLabel = start.isSame(end, 'day')
    ? start.format('MMM D, YYYY')
    : `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;

  const destinations = [...trip.tripDestinations].sort(
    (a, b) => Number(a.sortOrder) - Number(b.sortOrder)
  );

  const location = destinations.length > 0
    ? destinations.map((d) => formatLocation(d)).join(' → ')
    : [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');

  const locationStrings = destinations.length > 0
    ? destinations.map((d) => formatLocation(d))
    : [location];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Trip Detail Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 4, gap: { xs: 3, md: 0 } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            {trip.title}, {start.format('MMMM YYYY')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {location}
          </Typography>
          {destinations.length > 1 && (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2, justifyContent: 'flex-start' }}>
              {destinations.map((dest, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
                  label={formatLocation(dest)}
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {dateLabel} ({durationDays} {durationDays === 1 ? 'day' : 'days'})
          </Typography>
          {trip.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 600 }}>
              {trip.description}
            </Typography>
          )}
        </Box>

        <LocationImage
          locations={locationStrings}
          fallbackImage={trip.coverImage || `https://picsum.photos/seed/${trip.id}/400/300`}
          width={{ xs: '100%', md: 440 }}
          height={{ xs: 200, md: 250 }}
          borderRadius={2}
        />
      </Stack>

      {/* Itinerary Timeline */}
      <Box>
        {plans.length === 0 && (
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
            <Typography variant="body2" color="text.secondary">
              The trip owner hasn&apos;t added any itinerary items yet.
            </Typography>
          </Paper>
        )}

        {plans.map((day, dayIdx) => {
          const isLastDay = dayIdx === plans.length - 1;
          return (
            <Box key={day.id}>
              {/* Day header row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  bgcolor: 'background.paper',
                  minHeight: 40,
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
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
                    pr: 2,
                    py: 0.75,
                    zIndex: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    {day.date}
                  </Typography>
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
                    <Box sx={{ flex: 1, pl: 2, pt: isLayover ? 1.5 : 1, pb: isLayover ? 1.5 : 3 }}>
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
                          <Typography
                            variant="h6"
                            color="primary.main"
                            sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3 }}
                          >
                            {item.title}
                          </Typography>
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

      {trip.expiresAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
          This public link expires on {dayjs(trip.expiresAt).format('MMM D, YYYY [at] h:mm A')}.
        </Typography>
      )}
    </Container>
  );
}
