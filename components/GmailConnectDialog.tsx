'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { CloseIcon, CheckIcon, LinkIcon, DeleteIcon } from '@/components/Icons';

interface GmailAccount {
  id: string;
  email: string;
  status: string;
  lastSyncAt: string | null;
  watchExpiration: string | null;
}

interface GmailConnectDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  accounts: GmailAccount[];
  onAccountsChange: (accounts: GmailAccount[]) => void;
}

export default function GmailConnectDialog({
  open,
  onClose,
  accountId,
  accounts,
  onAccountsChange,
}: GmailConnectDialogProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  const handleConnect = useCallback(() => {
    setConnecting(true);
    window.location.href = `/api/integrations/gmail/auth?accountId=${encodeURIComponent(accountId)}`;
  }, [accountId]);

  const handleDisconnect = useCallback(
    async (gmailAccountId: string) => {
      setDisconnectingId(gmailAccountId);
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/gmail?accountId=${encodeURIComponent(accountId)}&gmailAccountId=${encodeURIComponent(gmailAccountId)}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? 'Failed to disconnect');
          return;
        }
        onAccountsChange(accounts.filter((a) => a.id !== gmailAccountId));
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setDisconnectingId(null);
      }
    },
    [accountId, accounts, onAccountsChange]
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.5 7.5H12v4.5h6.1c-.3 1.6-1.2 3-2.6 3.9l4.2 3.3c2.5-2.3 3.8-5.7 3.8-9.7z" fill="#4285F4" />
            <path d="M12 23c3.2 0 5.9-1.1 7.9-2.9l-4.2-3.3c-1.1.7-2.5 1.2-3.7 1.2-2.8 0-5.2-1.9-6.1-4.5l-4.3 3.3C3.9 20.7 7.6 23 12 23z" fill="#34A853" />
            <path d="M5.9 13.5c-.3-.7-.4-1.5-.4-2.5s.1-1.8.4-2.5L1.6 5.2C.6 7.1 0 9.3 0 11.5s.6 4.4 1.6 6.3l4.3-3.3z" fill="#FBBC05" />
            <path d="M12 4.5c1.6 0 3.1.6 4.2 1.6l3.2-3.2C17.1 1.1 14.7 0 12 0 7.6 0 3.9 2.3 1.6 5.7l4.3 3.3c.9-2.6 3.3-4.5 6.1-4.5z" fill="#EA4335" />
          </svg>
          <Typography variant="h6" fontWeight={700}>
            Connect Gmail
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect one or more Gmail accounts so Shldr can automatically import travel reservations
              as soon as they arrive.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We only request read-only access to your inbox. Non-travel emails are ignored and not stored.
            </Typography>
          </Box>

          {accounts.length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Connected accounts
              </Typography>
              <List dense disablePadding>
                {accounts.map((account) => (
                  <ListItem
                    key={account.id}
                    disablePadding
                    secondaryAction={
                      <Button
                        size="small"
                        color="error"
                        startIcon={disconnectingId === account.id ? <CircularProgress size={14} /> : <DeleteIcon />}
                        disabled={disconnectingId === account.id}
                        onClick={() => handleDisconnect(account.id)}
                      >
                        Disconnect
                      </Button>
                    }
                    sx={{ pl: 0, pr: 0 }}
                  >
                    <ListItemText
                      primary={account.email}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={account.status}
                            color={account.status === 'ACTIVE' ? 'success' : account.status === 'ERROR' ? 'error' : 'default'}
                            size="small"
                          />
                          {account.lastSyncAt && (
                            <Typography variant="caption" color="text.secondary">
                              Last sync: {new Date(account.lastSyncAt).toLocaleString()}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box />
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} size="small">
            Close
          </Button>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            variant="contained"
            size="small"
            startIcon={connecting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <LinkIcon />}
          >
            Connect Gmail
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
