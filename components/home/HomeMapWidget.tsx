'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import dynamic from 'next/dynamic';
import { Box, Typography, Stack } from '@mui/material';
import { type TravelStats } from '@/hooks/useTravelStats';
import { Plane, Flag, MapPin } from 'lucide-react';
import { MapIcon } from '@/components/Icons';

const TravelMap = dynamic(() => import('@/components/map/TravelMap'), { ssr: false });

interface HomeMapWidgetProps {
  accountId: string;
  stats: TravelStats;
}

interface MiniStatChipProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

function MiniStatChip({ icon, value, label }: MiniStatChipProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.75,
        py: 1,
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.8)',
        border: isDark ? '1px solid rgba(71,85,105,0.5)' : '1px solid rgba(203,213,225,0.8)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ display: 'flex', '& svg': { fontSize: 16, color: isDark ? '#60a5fa' : '#2563eb' } }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: isDark ? '#e2e8f0' : '#1e293b' }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function HomeMapWidget({ accountId, stats }: HomeMapWidgetProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        border: isDark ? '1px solid rgba(71,85,105,0.4)' : '1px solid rgba(203,213,225,0.6)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 2px 16px rgba(0,0,0,0.08)',
      }}
    >
      <Box sx={{ height: 380, position: 'relative' }}>
        {accountId ? (
          <TravelMap accountId={accountId} darkMode={isDark} mini />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              bgcolor: isDark ? '#0f172a' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 13 }}>
              Loading map…
            </Typography>
          </Box>
        )}

        <Box
          onClick={() => router.push('/maps')}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.88)',
            border: isDark ? '1px solid rgba(71,85,105,0.6)' : '1px solid rgba(203,213,225,0.8)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              bgcolor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.98)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', '& svg': { fontSize: 15, color: isDark ? '#60a5fa' : '#2563eb' } }}>
            <MapIcon />
          </Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: '0.78rem', color: isDark ? '#e2e8f0' : '#1e293b' }}
          >
            Open full map →
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(248,250,252,0.9)',
          borderTop: isDark ? '1px solid rgba(71,85,105,0.3)' : '1px solid rgba(203,213,225,0.5)',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <MiniStatChip
            icon={<Flag size={14} />}
            value={stats.countriesCount}
            label={stats.countriesCount === 1 ? 'country' : 'countries'}
          />
          <MiniStatChip
            icon={<MapPin size={14} />}
            value={stats.citiesCount}
            label={stats.citiesCount === 1 ? 'city' : 'cities'}
          />
          <MiniStatChip
            icon={<Plane size={14} />}
            value={stats.flightsCount}
            label={stats.flightsCount === 1 ? 'flight' : 'flights'}
          />
          {stats.distanceKm > 0 && (
            <MiniStatChip
              icon={<Plane size={14} />}
              value={`${(stats.distanceKm / 1000).toFixed(1)}k km`}
              label="flown"
            />
          )}
        </Stack>
      </Box>
    </Box>
  );
}
