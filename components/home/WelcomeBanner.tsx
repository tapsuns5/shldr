'use client';

import { Box, Card, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { MapIcon } from '@/components/Icons';
import Logo from '../Logo';
import { getHomeTheme } from '@/lib/home-theme';

interface WelcomeBannerProps {
  userName: string;
}

function getGreeting(): string {
  const hour = dayjs().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  const muiTheme = useTheme();
  const ht = getHomeTheme(muiTheme.palette.mode);
  const firstName = userName.split(' ')[0] || userName;

  return (
    <Card
      elevation={0}
      sx={{
        mb: 4,
        borderRadius: 3,
        background: ht.banner.gradient,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}
      >
        <Box>
          <Logo height={20} sx={{ mb: 0.5 }} />
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.75rem', sm: '2.25rem' },
              lineHeight: 1.2,
              mt: 0.5,
              color: '#fff',
            }}
          >
            {getGreeting()}, {firstName}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: ht.banner.subtitle, mt: 1, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}
          >
            Let&apos;s make your next trip unforgettable.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}
        >
          <MapIcon sx={{ fontSize: 38, color: '#fff' }} />
        </Box>
      </Stack>

      <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', bottom: -60, left: -20, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
    </Card>
  );
}
