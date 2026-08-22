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
  CircularProgress,
  Paper,
} from '@mui/material';
import { CheckIcon } from '@/components/Icons';
import Logo from '@/components/Logo';

interface InviteData {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  account: {
    id: string;
    name: string;
    slug: string;
  };
  invitedByUser: {
    id: string;
    name: string;
    image: string | null;
  };
}

type InviteStatus = 'valid' | 'not_found' | 'expired' | 'already_accepted' | 'revoked';

interface AccountInviteLandingProps {
  status: InviteStatus;
  token: string;
  invite: InviteData | null;
}

export default function AccountInviteLanding({ status, token, invite }: AccountInviteLandingProps) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'valid' || sessionLoading || !session) return;
    setAccepting(true);
    setError(null);
    fetch(`/api/account-invite/${token}/accept`, { method: 'POST' })
      .then(async (res) => {
        if (res.status === 401) { router.push(`/login?redirect=/team-invite/${token}`); return; }
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed'); }
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
      const res = await fetch(`/api/account-invite/${token}/accept`, { method: 'POST' });
      if (res.status === 401) {
        router.push(`/login?redirect=/team-invite/${token}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept invite');
      }
      setAccepted(true);
      setTimeout(() => router.push('/trips'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignUp = () => {
    router.push(`/login?mode=signup&redirect=/team-invite/${token}`);
  };

  const handleLogIn = () => {
    router.push(`/login?redirect=/team-invite/${token}`);
  };

  if (status === 'not_found') {
    return <ErrorState title="Invite not found" message="This invite link is invalid or has been removed." />;
  }

  if (status === 'expired') {
    return <ErrorState title="Invite expired" message="This invite link has expired. Ask the account owner to send you a new one." />;
  }

  if (status === 'already_accepted') {
    return <ErrorState title="Already accepted" message="This invite has already been used. Sign in to access your account." actionLabel="Sign in" actionHref="/login" />;
  }

  if (status === 'revoked') {
    return <ErrorState title="Invite revoked" message="This invite has been revoked by the account owner." />;
  }

  if (!invite) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Box sx={{ maxWidth: 520, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Logo height={40} />
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            p: 4,
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Avatar
              src={invite.invitedByUser.image || undefined}
              sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 26, fontWeight: 700 }}
            >
              {invite.invitedByUser.name.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                You&apos;ve been invited by
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {invite.invitedByUser.name}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                to join the account
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {invite.account.name}
              </Typography>
            </Box>

            {error && (
              <Typography color="error" variant="body2">
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
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: 'success.light',
                  color: 'success.dark',
                  width: '100%',
                }}
              >
                <CheckIcon />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  You&apos;ve joined! Redirecting…
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={2} sx={{ width: '100%' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={doAccept}
                  disabled={accepting}
                  startIcon={accepting ? <CircularProgress size={18} color="inherit" /> : null}
                  sx={{ fontWeight: 700, textTransform: 'none', py: 1.5, borderRadius: 2 }}
                >
                  {accepting ? 'Joining…' : 'Accept & Join Account'}
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
          </Stack>
        </Paper>
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
