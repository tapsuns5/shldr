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
import { ThemeProvider } from '@mui/material/styles';
import { CheckIcon } from '@/components/Icons';
import Logo from '@/components/Logo';
import { getTheme } from '@/lib/theme';

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
    rememberInvite();
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

  const rememberInvite = () => {
    sessionStorage.setItem('pending-team-invite', token);
  };

  const handleSignUp = () => {
    rememberInvite();
    router.push(`/login?mode=signup&redirect=/team-invite/${token}`);
  };

  const handleLogIn = () => {
    rememberInvite();
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
    <ThemeProvider theme={getTheme('light')}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          px: { xs: 3, sm: 5 },
          py: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.72)',
        }}
      >
        <Logo height={32} />
      </Box>

      <Box
        sx={{
          minHeight: 'calc(100vh - 81px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
          background: 'linear-gradient(145deg, #f4faf7 0%, #e7f3ec 48%, #f8fbf9 100%)',
        }}
      >
        <Box sx={{ maxWidth: 560, width: '100%' }}>
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'rgba(27,107,58,0.16)',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 18px 50px rgba(27,107,58,0.12)',
            }}
          >
            <Box
              sx={{
                px: { xs: 3, sm: 5 },
                py: 3,
                color: 'white',
                background: 'linear-gradient(120deg, #155d38 0%, #2f8a5b 100%)',
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 1.5, opacity: 0.8 }}>
                Shldr workspace invite
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                You&apos;re invited
              </Typography>
            </Box>

            <Stack spacing={3} sx={{ p: { xs: 3, sm: 5 } }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}
                >
                  {invite.account.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Join the workspace
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {invite.account.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {invite.account.slug}
                  </Typography>
                </Box>
              </Stack>

              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={invite.invitedByUser.image || undefined}
                  sx={{ width: 40, height: 40, bgcolor: 'secondary.main', fontSize: 17, fontWeight: 700 }}
                >
                  {invite.invitedByUser.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2">
                  <strong>{invite.invitedByUser.name}</strong> invited you to collaborate on trips and travel plans.
                </Typography>
              </Paper>

              <Typography variant="body1" color="text.secondary">
                Accept this invitation to share the workspace&apos;s trips, documents, and travel plans with your team.
              </Typography>

              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}

              {accepted ? (
                <Paper elevation={0} sx={{ border: 1, borderColor: 'success.main', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'success.light', color: 'success.dark' }}>
                  <CheckIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    You&apos;ve joined! Redirecting…
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
                    {accepting ? 'Joining…' : `Join ${invite.account.name}`}
                  </Button>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <Typography variant="body2" color="text.secondary">Already have an account?</Typography>
                    <Button size="small" onClick={handleLogIn} sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}>Sign in</Button>
                    <Typography variant="body2" color="text.secondary">or</Typography>
                    <Button size="small" onClick={handleSignUp} sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}>create one</Button>
                  </Stack>

                  <Typography variant="caption" color="text.secondary" align="center">
                    Invitation expires on {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
    </ThemeProvider>
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
