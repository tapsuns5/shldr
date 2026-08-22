'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Typography,
  Chip,
  IconButton,
  Box,
} from '@mui/material';
import { CloseIcon } from '@/components/Icons';
import { changeEmail } from '@/lib/auth-client';

interface ChangeEmailDialogProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  emailVerified: boolean;
  providers: string[];
}

export default function ChangeEmailDialog({
  open,
  onClose,
  currentEmail,
  emailVerified,
  providers,
}: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const oauthProviders = providers.filter((p) => p !== 'credential');

  const handleClose = () => {
    setNewEmail('');
    setError(null);
    setSuccess(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!newEmail.trim()) {
      setError('Please enter a new email address.');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError('The new email is the same as your current email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeEmail({
        newEmail: newEmail.trim(),
        callbackURL: '/verify-email',
      });

      if (res.error) {
        setError(res.error.message || 'Failed to request email change.');
      } else {
        if (emailVerified) {
          setSuccess(
            'A confirmation email has been sent to your current email address. Please check your inbox and click the confirmation link to proceed. After confirming, a verification email will be sent to your new email address.',
          );
        } else {
          setSuccess(
            'A verification email has been sent to your new email address. Please check your inbox and click the verification link to confirm the change.',
          );
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Change Email Address</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {oauthProviders.length > 0 && (
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <AlertTitle>Signed in with {oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')}</AlertTitle>
              Your {oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')} sign-in will continue to work as-is.
              Changing your email here only updates the email associated with your Shldr account — it does not unlink or affect your {oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')} connection.
            </Alert>
          )}

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Current email
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" fontWeight={500}>
                {currentEmail}
              </Typography>
              {emailVerified ? (
                <Chip label="Verified" color="success" size="small" />
              ) : (
                <Chip label="Unverified" color="warning" size="small" />
              )}
            </Stack>
          </Stack>

          <TextField
            label="New email address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            fullWidth
            disabled={loading || !!success}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && !success) {
                handleSubmit();
              }
            }}
          />

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {success && (
            <Alert severity="success">
              <AlertTitle>Verification email sent</AlertTitle>
              {success}
            </Alert>
          )}

          {emailVerified && !success && (
            <Typography variant="body2" color="text.secondary">
              For security, changing your email requires two steps:
            </Typography>
          )}
          {emailVerified && !success && (
            <Box component="ol" sx={{ pl: 2, m: 0 }}>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Confirm the change via a link sent to your <strong>current</strong> email
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Verify your <strong>new</strong> email via a second link
                </Typography>
              </li>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !newEmail.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? 'Sending...' : 'Send Verification'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
