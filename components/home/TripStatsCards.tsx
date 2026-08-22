'use client';

import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import {
  FlightTakeoffIcon,
  LocationIcon,
  ClockIcon,
  TripsIcon,
} from '@/components/Icons';
import { getHomeTheme } from '@/lib/home-theme';
import type { UITrip } from '@/hooks/use-trips';

interface TripStatsCardsProps {
  trips: UITrip[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  secondaryText: string;
  onClick?: () => void;
}

function StatCard({ icon, label, value, subtext, accent, cardBg, cardBorder, cardShadow, secondaryText, onClick }: StatCardProps) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        background: `linear-gradient(145deg, ${cardBg} 0%, ${accent}0d 100%)`,
        border: cardBorder,
        boxShadow: cardShadow,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.18s, box-shadow 0.18s',
        '&:hover': onClick
          ? { transform: 'translateY(-3px)', boxShadow: `0 8px 28px ${accent}30` }
          : {},
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar */}
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />

      {/* Decorative glow circle */}
      <Box sx={{
        position: 'absolute', bottom: -28, right: -28,
        width: 110, height: 110, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <CardContent sx={{ p: 2.5, pt: 2, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2.5,
            background: `linear-gradient(135deg, ${accent}22, ${accent}10)`,
            border: `1px solid ${accent}30`,
            mb: 2,
            '& svg': { fontSize: 26, color: accent },
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: secondaryText, mb: 0.5, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.1rem', lineHeight: 1.1, color: accent }}>
          {value}
        </Typography>
        {subtext && (
          <Typography variant="body2" sx={{ mt: 0.75, color: secondaryText, fontSize: '0.82rem' }}>
            {subtext}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function TripStatsCards({ trips }: TripStatsCardsProps) {
  const muiTheme = useTheme();
  const ht = getHomeTheme(muiTheme.palette.mode);
  const router = useRouter();
  const today = dayjs().startOf('day');

  const activeTrips = trips.filter((t) => {
    const start = dayjs(t.startDate).startOf('day');
    const end = dayjs(t.endDate).startOf('day');
    return !start.isAfter(today) && !end.isBefore(today);
  });

  const upcomingTrips = trips.filter((t) => dayjs(t.startDate).startOf('day').isAfter(today));

  const nextTrip = upcomingTrips.sort((a, b) =>
    dayjs(a.startDate).isBefore(dayjs(b.startDate)) ? -1 : 1
  )[0];

  const daysUntilNext = nextTrip
    ? dayjs(nextTrip.startDate).startOf('day').diff(today, 'day')
    : null;

  const shared = { cardBg: ht.card.bg, cardBorder: ht.card.border, cardShadow: ht.card.shadow, secondaryText: ht.secondaryText };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
      <Box sx={{ flex: 1 }}>
        <StatCard
          icon={<TripsIcon />}
          label="Active Trips"
          value={String(activeTrips.length)}
          subtext={activeTrips.length === 1 ? '1 trip in progress' : `${activeTrips.length} trips in progress`}
          accent={ht.accents.activeTrips}
          onClick={activeTrips.length > 0 ? () => router.push('/trips') : undefined}
          {...shared}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <StatCard
          icon={<FlightTakeoffIcon />}
          label="Upcoming Trips"
          value={String(upcomingTrips.length)}
          subtext={upcomingTrips.length === 1 ? '1 trip planned' : `${upcomingTrips.length} trips planned`}
          accent={ht.accents.upcomingTrips}
          onClick={upcomingTrips.length > 0 ? () => router.push('/trips') : undefined}
          {...shared}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <StatCard
          icon={<ClockIcon />}
          label="Next Adventure"
          value={nextTrip ? (daysUntilNext === 0 ? 'Today!' : `${daysUntilNext}d`) : '—'}
          subtext={nextTrip ? nextTrip.title : 'No upcoming trips'}
          accent={ht.accents.nextAdventure}
          onClick={nextTrip ? () => router.push(`/tripdetails/${nextTrip.id}`) : undefined}
          {...shared}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <StatCard
          icon={<LocationIcon />}
          label="Total Trips"
          value={String(trips.length)}
          subtext="All-time trips"
          accent={ht.accents.totalTrips}
          onClick={() => router.push('/trips')}
          {...shared}
        />
      </Box>
    </Stack>
  );
}
