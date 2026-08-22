'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Avatar,
} from '@mui/material';
import {
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
} from '@/components/Icons';
import type { PlanDay } from '@/hooks/use-trips';
import PlanDetails from './PlanDetails';

interface TripDayDetailProps {
  tripId: string;
  tripTitle: string;
  day: PlanDay;
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
const SUBWAY_WIDTH = 48;
const TIME_WIDTH = 110;

function planIcon(type: string) {
  return ICONS[type] || <ActivityIcon />;
}

function planColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

export default function TripDayDetail({ tripId, tripTitle, day }: TripDayDetailProps) {
  const router = useRouter();

  const handleViewEvent = (eventId: string) => {
    router.push(`/tripdetails/${tripId}/event/${eventId}`);
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/tripdetails/${tripId}`)}
        sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}
      >
        Back to {tripTitle}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {day.date}
        </Typography>
        <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
      </Box>

      {day.items.length === 0 && (
        <Typography variant="body1" color="text.secondary">
          No plans for this day.
        </Typography>
      )}

      {day.items.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === day.items.length - 1;
        const isLayover = item.type === 'layover';

        return (
          <Box key={item.id} sx={{ display: 'flex', alignItems: 'stretch' }}>
            <Box
              sx={{
                width: TIME_WIDTH,
                flexShrink: 0,
                textAlign: 'right',
                pr: 2,
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

            <Box
              sx={{
                width: SUBWAY_WIDTH,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 2,
                  height: 14,
                  bgcolor: isFirst ? 'transparent' : LINE_COLOR,
                  flexShrink: 0,
                }}
              />
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
                  onClick={() => handleViewEvent(item.id)}
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
              <Box
                sx={{
                  width: 2,
                  flex: 1,
                  bgcolor: isLast ? 'transparent' : LINE_COLOR,
                  minHeight: 32,
                }}
              />
            </Box>

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
                    sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3, cursor: 'pointer' }}
                    onClick={() => handleViewEvent(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleViewEvent(item.id);
                      }
                    }}
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
}
