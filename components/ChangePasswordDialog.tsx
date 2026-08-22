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
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { CloseIcon } from '@/components/Icons';
import { changePassword } from '@/lib/auth-client';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setRevokeSessions(true);
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.trim() &&
    newPassword.trim() &&
    confirmPassword.trim() &&
    passwordsMatch &&
    newPassword.length >= 8 &&
    !loading &&
    !success;

  const handleSubmit = async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword.length > 128) {
      setError('New password must be 128 characters or fewer.');
      return;
    }

    if (!passwordsMatch) {
      setError('The new passwords do not match. Please re-enter them.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('The new password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeSessions,
      });

      if (res.error) {
        setError(res.error.message || 'Failed to change password.');
      } else {
        setSuccess(true);
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
        <Typography component="span" variant="h6" fontWeight={700}>Change Password</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {success && (
            <Alert severity="success">
              <AlertTitle>Password changed</AlertTitle>
              Your password has been updated successfully.
              {revokeSessions
                ? ' For security, you have been signed out of all other devices.'
                : ''}
            </Alert>
          )}

          {!success && (
            <>
              <TextField
                label="Current password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                disabled={loading}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setShowCurrent((s) => !s)}
                        sx={{ minWidth: 'auto', textTransform: 'none' }}
                      >
                        {showCurrent ? 'Hide' : 'Show'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="New password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                disabled={loading}
                autoComplete="new-password"
                helperText="Must be at least 8 characters."
                error={!!newPassword && newPassword.length < 8}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setShowNew((s) => !s)}
                        sx={{ minWidth: 'auto', textTransform: 'none' }}
                      >
                        {showNew ? 'Hide' : 'Show'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirm new password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                disabled={loading}
                autoComplete="new-password"
                error={!!confirmPassword && !passwordsMatch}
                helperText={
                  !!confirmPassword && !passwordsMatch
                    ? 'Passwords do not match.'
                    : 'Re-enter your new password to confirm.'
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setShowConfirm((s) => !s)}
                        sx={{ minWidth: 'auto', textTransform: 'none' }}
                      >
                        {showConfirm ? 'Hide' : 'Show'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    handleSubmit();
                  }
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={revokeSessions}
                    onChange={(e) => setRevokeSessions(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Sign out of all other devices
                  </Typography>
                }
              />
            </>
          )}

          {error && (
            <Alert severity="error">{error}</Alert>
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
            disabled={!canSubmit}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
