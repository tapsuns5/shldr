'use client';

import { Box, Card, CardContent, Stack, Typography, Chip, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import {
  FlagIcon,
  LocationIcon,
  ClockIcon,
  LuggageIcon,
} from '@/components/Icons';
import { getHomeTheme } from '@/lib/home-theme';
import type { UITrip } from '@/hooks/use-trips';

interface TravelStatsProps {
  trips: UITrip[];
}

interface MiniStatProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
  secondaryText: string;
}

function MiniStat({ icon, value, label, accent, secondaryText }: MiniStatProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${accent}22, ${accent}0e)`,
          border: `1px solid ${accent}30`,
          flexShrink: 0,
          '& svg': { fontSize: 22, color: accent },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, color: accent }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: secondaryText }}>
          {label}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function TravelStats({ trips }: TravelStatsProps) {
  const muiTheme = useTheme();
  const ht = getHomeTheme(muiTheme.palette.mode);
  const today = dayjs().startOf('day');

  const pastTrips = trips.filter((t) => dayjs(t.endDate).startOf('day').isBefore(today));

  const countries = new Set<string>();
  const cities = new Set<string>();
  let totalDays = 0;

  trips.forEach((trip) => {
    trip.destinations.forEach((d) => {
      if (d.country) countries.add(d.country);
      if (d.city) cities.add(d.city);
    });
    const start = dayjs(trip.startDate);
    const end = dayjs(trip.endDate);
    totalDays += end.diff(start, 'day') + 1;
  });

  const sortedPast = [...pastTrips].sort((a, b) =>
    dayjs(b.endDate).isAfter(dayjs(a.endDate)) ? 1 : -1
  );

  const recentDestinations = sortedPast
    .flatMap((t) => t.destinations)
    .slice(0, 5)
    .map((d) => d.location);

  const milestones = [10, 25, 50, 100];
  const nextMilestone = milestones.find((m) => countries.size < m) || 100;
  const milestoneProgress = Math.min((countries.size / nextMilestone) * 100, 100);

  const fpAccent = ht.accents.footprint;
  const histAccent = ht.accents.history;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {/* Travel Footprint */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          flex: 1,
          background: `linear-gradient(145deg, ${ht.card.bg} 0%, ${fpAccent}0d 100%)`,
          border: ht.card.border,
          boxShadow: ht.card.shadow,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${fpAccent}, ${fpAccent}55)` }} />
        <Box sx={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${fpAccent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            Travel Footprint
          </Typography>
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <MiniStat icon={<FlagIcon />} value={countries.size} label={countries.size === 1 ? 'Country' : 'Countries'} accent={fpAccent} secondaryText={ht.secondaryText} />
            <MiniStat icon={<LocationIcon />} value={cities.size} label={cities.size === 1 ? 'City' : 'Cities'} accent={fpAccent} secondaryText={ht.secondaryText} />
            <MiniStat icon={<LuggageIcon />} value={totalDays} label={totalDays === 1 ? 'Day' : 'Days'} accent={fpAccent} secondaryText={ht.secondaryText} />
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: ht.secondaryText, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Next country milestone
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: fpAccent }}>
                {countries.size} / {nextMilestone}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={milestoneProgress}
              sx={{
                height: 7,
                borderRadius: 4,
                bgcolor: ht.progressTrack,
                '& .MuiLinearProgress-bar': { bgcolor: fpAccent, borderRadius: 4 },
              }}
            />
          </Box>

          {recentDestinations.length > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: ht.secondaryText, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                Recent Destinations
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {recentDestinations.map((dest, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    icon={<LocationIcon sx={{ fontSize: '0.9rem', color: fpAccent }} />}
                    label={dest}
                    sx={{
                      bgcolor: ht.chip,
                      borderColor: ht.chipBorder,
                      '& .MuiChip-icon': { color: fpAccent },
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Trip History */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          flex: 1,
          background: `linear-gradient(145deg, ${ht.card.bg} 0%, ${histAccent}0d 100%)`,
          border: ht.card.border,
          boxShadow: ht.card.shadow,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${histAccent}, ${histAccent}55)` }} />
        <Box sx={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${histAccent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            Trip History
          </Typography>
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <MiniStat icon={<ClockIcon />} value={trips.length} label="Total Trips" accent={histAccent} secondaryText={ht.secondaryText} />
            <MiniStat icon={<FlagIcon />} value={pastTrips.length} label="Completed" accent={histAccent} secondaryText={ht.secondaryText} />
          </Stack>
          {sortedPast.length > 0 && (
            <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, bgcolor: ht.glass }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: ht.secondaryText, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
                Last Trip
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                {sortedPast[0].title}
              </Typography>
              <Typography variant="body2" sx={{ color: ht.secondaryText }}>
                {dayjs(sortedPast[0].endDate).format('MMM YYYY')} · {sortedPast[0].duration}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
