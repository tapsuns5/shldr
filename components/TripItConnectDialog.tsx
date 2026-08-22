'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import { CloseIcon, CheckIcon, LinkIcon, FlightIcon } from '@/components/Icons';

interface TripItFeed {
  id: string;
  icalUrl: string;
  status: 'active' | 'paused' | 'error';
  lastSyncAt: string | null;
  lastError: string | null;
}

interface TripItConnectDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  existingFeed: TripItFeed | null;
  onConnected: (feed: TripItFeed) => void;
  onDisconnected: () => void;
}

const TRIPIT_STEPS = [
  {
    step: 1,
    label: 'Sign in to TripIt',
    detail: 'Go to tripit.com and sign in to your account.',
  },
  {
    step: 2,
    label: 'Open Settings → Sharing',
    detail: 'Click your avatar → Settings → Sharing & Calendars.',
  },
  {
    step: 3,
    label: 'Enable the iCal feed',
    detail: 'Under "Your Calendars", enable the Personal Calendar feed. Copy the URL — it looks like: https://www.tripit.com/feed/ical/private/XXXXXXXX/tripit.ics',
  },
  {
    step: 4,
    label: 'Paste it below',
    detail: 'Paste the URL into the field below and click Connect.',
  },
];

export default function TripItConnectDialog({
  open,
  onClose,
  accountId,
  existingFeed,
  onConnected,
  onDisconnected,
}: TripItConnectDialogProps) {
  const [url, setUrl] = useState(existingFeed?.icalUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(existingFeed?.icalUrl ?? '');
      setSaveError(null);
      setSyncResult(null);
    }
  }, [open, existingFeed?.icalUrl]);

  const handleConnect = useCallback(async () => {
    setSaveError(null);
    setSyncResult(null);
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/tripit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, icalUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.formErrors?.[0] ?? data?.error ?? 'Failed to save';
        setSaveError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }
      onConnected(data as TripItFeed);

      setSyncing(true);
      const syncRes = await fetch('/api/integrations/tripit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const syncData = await syncRes.json();
      if (syncRes.ok) {
        setSyncResult(syncData);
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  }, [accountId, url, onConnected]);

  const handleSync = useCallback(async () => {
    setSyncResult(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/tripit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (res.ok) setSyncResult(data);
      else setSaveError(data?.error ?? 'Sync failed');
    } catch {
      setSaveError('Network error during sync.');
    } finally {
      setSyncing(false);
    }
  }, [accountId]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await fetch(`/api/integrations/tripit?accountId=${accountId}`, { method: 'DELETE' });
      setUrl('');
      setSyncResult(null);
      setSaveError(null);
      onDisconnected();
    } finally {
      setDisconnecting(false);
    }
  }, [accountId, onDisconnected]);

  const isConnected = !!existingFeed;
  const isValidUrl = url.startsWith('https://www.tripit.com/feed/ical/') && url.endsWith('.ics');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FlightIcon fontSize="small" color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Connect TripIt
          </Typography>
          {isConnected && (
            <Chip
              label={existingFeed.status === 'active' ? 'Connected' : existingFeed.status}
              color={existingFeed.status === 'active' ? 'success' : existingFeed.status === 'error' ? 'error' : 'default'}
              size="small"
            />
          )}
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={3}>
          {!isConnected && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                TripIt doesn&apos;t offer a direct API, but you can sync your trips using their private iCal feed.
                Follow these steps to get your feed URL:
              </Typography>
              <Stack spacing={1.5}>
                {TRIPIT_STEPS.map(({ step, label, detail }) => (
                  <Stack key={step} direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        minWidth: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        mt: 0.25,
                      }}
                    >
                      {step}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {isConnected && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Your TripIt iCal feed is connected. We&apos;ll periodically sync your trips.
              </Typography>
              {existingFeed.lastSyncAt && (
                <Typography variant="caption" color="text.secondary">
                  Last synced: {new Date(existingFeed.lastSyncAt).toLocaleString()}
                </Typography>
              )}
              {existingFeed.status === 'error' && existingFeed.lastError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {existingFeed.lastError}
                </Alert>
              )}
            </Box>
          )}

          <TextField
            label="TripIt iCal URL"
            placeholder="https://www.tripit.com/feed/ical/private/.../tripit.ics"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setSaveError(null); setSyncResult(null); }}
            fullWidth
            size="small"
            error={!!saveError}
            helperText={saveError ?? (isValidUrl ? 'URL looks good ✓' : url ? 'Must be a tripit.com/feed/ical/… .ics URL' : '')}
            slotProps={{ htmlInput: { spellCheck: false } }}
          />

          {syncResult && (
            <Alert severity="success" icon={<CheckIcon />}>
              Sync complete — {syncResult.created} trips created, {syncResult.updated} updated
              {syncResult.skipped > 0 ? `, ${syncResult.skipped} skipped` : ''}.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {isConnected && (
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              color="error"
              size="small"
            >
              {disconnecting ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              Disconnect
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {isConnected && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outlined"
              size="small"
              startIcon={syncing ? <CircularProgress size={14} /> : <LinkIcon />}
            >
              Sync Now
            </Button>
          )}
          <Button onClick={onClose} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={saving || syncing || !isValidUrl}
            variant="contained"
            size="small"
            startIcon={saving || syncing ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : null}
          >
            {isConnected ? 'Update URL' : 'Connect'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
