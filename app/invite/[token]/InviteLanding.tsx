'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import { LocationIcon, FlightIcon, CheckIcon } from '@/components/Icons';
import Logo from '@/components/Logo';
import { getLocationMapUrl } from '@/lib/location-image';

interface TripDestination {
  id: string;
  city: string;
  state: string | null;
  country: string;
  sortOrder: string;
}

interface InviteData {
  id: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  trip: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    destinationCity: string | null;
    destinationCountry: string | null;
    coverImage: string | null;
    tripDestinations: TripDestination[];
  };
  invitedByUser: {
    id: string;
    name: string;
    image: string | null;
  };
}

type InviteStatus = 'valid' | 'not_found' | 'expired' | 'already_accepted';

interface InviteLandingProps {
  status: InviteStatus;
  token: string;
  invite: InviteData | null;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

function getDestinationLabel(trip: InviteData['trip']): string {
  if (trip.tripDestinations.length > 0) {
    return trip.tripDestinations
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((d) => (d.state ? `${d.city}, ${d.state}` : `${d.city}, ${d.country}`))
      .join(' → ');
  }
  return [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');
}

function getLocations(trip: InviteData['trip']): string[] {
  if (trip.tripDestinations.length > 0) {
    return trip.tripDestinations
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((d) => (d.state ? `${d.city}, ${d.state}, ${d.country}` : `${d.city}, ${d.country}`));
  }
  const loc = [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');
  return loc ? [loc] : [];
}

export default function InviteLanding({ status, token, invite }: InviteLandingProps) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'valid' || sessionLoading || !session) return;
    setAccepting(true);
    setError(null);
    fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      .then(async (res) => {
        if (res.status === 401) { router.push(`/login?redirect=/invite/${token}`); return; }
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed'); }
        const data = await res.json();
        setAccepted(true);
        setTimeout(() => router.push('/trips'), 1500);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setAccepting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, sessionLoading]);

  const doAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' });
      if (res.status === 401) {
        router.push(`/login?redirect=/invite/${token}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept invite');
      }
      const data = await res.json();
      setAccepted(true);
      setTimeout(() => router.push('/trips'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignUp = () => {
    router.push(`/login?mode=signup&redirect=/invite/${token}`);
  };

  const handleLogIn = () => {
    router.push(`/login?redirect=/invite/${token}`);
  };

  if (status === 'not_found') {
    return <ErrorState title="Invite not found" message="This invite link is invalid or has been removed." />;
  }

  if (status === 'expired') {
    return <ErrorState title="Invite expired" message="This invite link has expired. Ask the trip owner to send you a new one." />;
  }

  if (status === 'already_accepted') {
    return <ErrorState title="Already accepted" message="This invite has already been used. Sign in to view your trips." actionLabel="Sign in" actionHref="/login" />;
  }

  if (!invite) return null;

  const locations = getLocations(invite.trip);
  const primaryImageUrl = locations.length > 0
    ? (getLocationMapUrl(locations[0]) || invite.trip.coverImage || '')
    : (invite.trip.coverImage || '');

  const heroImages = locations.length > 0
    ? locations.map((loc) => getLocationMapUrl(loc) || '').filter(Boolean)
    : invite.trip.coverImage ? [invite.trip.coverImage] : [];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 4,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Logo height={28} />
      </Box>

      {/* Hero images */}
      {heroImages.length > 0 && (
        <Box
          sx={{
            width: '100%',
            height: { xs: 200, md: 320 },
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            gap: 0.5,
          }}
        >
          {heroImages.slice(0, 3).map((url, idx) => (
            <Box
              key={idx}
              sx={{
                flex: 1,
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)',
            }}
          />
          <Box sx={{ position: 'absolute', bottom: 20, left: 32 }}>
            <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {invite.trip.title}
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
              {formatDateRange(invite.trip.startDate, invite.trip.endDate)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 4 }, py: 5, width: '100%' }}>
        {/* Inviter pill */}
        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar
            src={invite.invitedByUser.image || undefined}
            sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: 20, fontWeight: 700 }}
          >
            {invite.invitedByUser.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
              You&apos;ve been invited by
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {invite.invitedByUser.name}
            </Typography>
          </Box>
        </Paper>

        {/* Trip info */}
        {heroImages.length === 0 && (
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {invite.trip.title}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Chip
            size="small"
            icon={<FlightIcon sx={{ fontSize: '1rem' }} />}
            label={formatDateRange(invite.trip.startDate, invite.trip.endDate)}
            variant="outlined"
          />
          {getDestinationLabel(invite.trip) && (
            <Chip
              size="small"
              icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
              label={getDestinationLabel(invite.trip)}
              variant="outlined"
            />
          )}
          <Chip
            size="small"
            label={`Joining as ${invite.role}`}
            color="primary"
            variant="outlined"
          />
        </Stack>

        {invite.trip.tripDestinations.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {invite.trip.tripDestinations
              .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
              .map((dest) => (
                <Chip
                  key={dest.id}
                  size="small"
                  icon={<LocationIcon sx={{ fontSize: '1rem' }} />}
                  label={dest.state ? `${dest.city}, ${dest.state}` : `${dest.city}, ${dest.country}`}
                  variant="outlined"
                />
              ))}
          </Stack>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {accepted ? (
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'success.main',
              borderRadius: 2,
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: 'success.light',
              color: 'success.dark',
            }}
          >
            <CheckIcon />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              You&apos;ve joined the trip! Redirecting…
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={doAccept}
              disabled={accepting}
              startIcon={accepting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ fontWeight: 700, textTransform: 'none', py: 1.5, borderRadius: 2 }}
            >
              {accepting ? 'Joining trip…' : 'Accept invitation & join trip'}
            </Button>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Typography variant="body2" color="text.secondary">
                Don&apos;t have an account?
              </Typography>
              <Button
                size="small"
                onClick={handleSignUp}
                sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}
              >
                Sign up
              </Button>
              <Typography variant="body2" color="text.secondary">·</Typography>
              <Button
                size="small"
                onClick={handleLogIn}
                sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}
              >
                Sign in
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" align="center">
              This invite expires on {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function ErrorState({
  title,
  message,
  actionLabel,
  actionHref,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const router = useRouter();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 4,
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        {actionLabel && actionHref && (
          <Button variant="contained" onClick={() => router.push(actionHref)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
