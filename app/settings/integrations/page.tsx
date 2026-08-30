'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  Avatar,
  Box,
  Chip,
  Button,
} from '@mui/material';
import { LinkIcon, FlightIcon, MailIcon } from '@/components/Icons';
import TripItConnectDialog from '@/components/TripItConnectDialog';
import GmailConnectDialog from '@/components/GmailConnectDialog';
import { useSettings } from '../SettingsShell';

interface TripItFeed {
  id: string;
  icalUrl: string;
  status: 'active' | 'paused' | 'error';
  lastSyncAt: string | null;
  lastError: string | null;
}

interface GmailAccount {
  id: string;
  email: string;
  status: string;
  lastSyncAt: string | null;
  watchExpiration: string | null;
}

export default function IntegrationsPage() {
  const { primaryAccount } = useSettings();
  const [tripitDialogOpen, setTripitDialogOpen] = useState(false);
  const [tripitFeed, setTripitFeed] = useState<TripItFeed | null>(null);

  const [gmailDialogOpen, setGmailDialogOpen] = useState(false);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);

  useEffect(() => {
    if (!primaryAccount?.id) return;
    fetch(`/api/integrations/tripit?accountId=${primaryAccount.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTripitFeed(data))
      .catch(() => {});
  }, [primaryAccount?.id]);

  useEffect(() => {
    if (!primaryAccount?.id) return;
    fetch(`/api/integrations/gmail?accountId=${primaryAccount.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGmailAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [primaryAccount?.id]);

  const handleConnected = useCallback((feed: TripItFeed) => {
    setTripitFeed(feed);
  }, []);

  const handleDisconnected = useCallback(() => {
    setTripitFeed(null);
  }, []);

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
              <LinkIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Integrations
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'background.default', color: 'text.primary', border: 1, borderColor: 'divider' }}>
                <FlightIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  TripIt
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sync your trips and reservations automatically. Confirmation numbers are not
                  available via TripIt&apos;s calendar feed.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {tripitFeed && (
                <Chip
                  label={tripitFeed.status === 'active' ? 'Connected' : tripitFeed.status}
                  color={tripitFeed.status === 'active' ? 'success' : tripitFeed.status === 'error' ? 'error' : 'default'}
                  size="small"
                />
              )}
              <Button
                variant={tripitFeed ? 'outlined' : 'contained'}
                size="small"
                startIcon={<LinkIcon />}
                onClick={() => setTripitDialogOpen(true)}
                disabled={!primaryAccount}
              >
                {tripitFeed ? 'Manage' : 'Connect'}
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'background.default', color: 'text.primary', border: 1, borderColor: 'divider' }}>
                <MailIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  Gmail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auto-import travel reservations from your inbox.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {gmailAccounts.length > 0 && (
                <Chip
                  label={`${gmailAccounts.length} connected`}
                  color="success"
                  size="small"
                />
              )}
              <Button
                variant={gmailAccounts.length > 0 ? 'outlined' : 'contained'}
                size="small"
                startIcon={<LinkIcon />}
                onClick={() => setGmailDialogOpen(true)}
                disabled={!primaryAccount}
              >
                {gmailAccounts.length > 0 ? 'Manage' : 'Connect'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {primaryAccount && (
        <TripItConnectDialog
          open={tripitDialogOpen}
          onClose={() => setTripitDialogOpen(false)}
          accountId={primaryAccount.id}
          existingFeed={tripitFeed}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
        />
      )}

      {primaryAccount && (
        <GmailConnectDialog
          open={gmailDialogOpen}
          onClose={() => setGmailDialogOpen(false)}
          accountId={primaryAccount.id}
          accounts={gmailAccounts}
          onAccountsChange={setGmailAccounts}
        />
      )}
    </Stack>
  );
}
