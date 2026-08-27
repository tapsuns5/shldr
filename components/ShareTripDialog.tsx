'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  TextField,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { ShareIcon, LinkIcon, MailIcon, CloseIcon, CheckIcon, PublicIcon } from '@/components/Icons';
import { type UITrip } from '@/hooks/use-trips';

interface ShareTripDialogProps {
  open: boolean;
  trip: UITrip;
  onClose: () => void;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ShareTripDialog({ open, trip, onClose }: ShareTripDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [publicShareExpiry, setPublicShareExpiry] = useState<string | null>(null);
  const [publicDuration, setPublicDuration] = useState<'hours' | 'days' | 'indefinite'>('days');
  const [publicAmount, setPublicAmount] = useState('7');
  const [creatingPublicShare, setCreatingPublicShare] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setEmails([]);
    setInputValue('');
    setInputError('');
    setSendError(null);
    setSendSuccess(false);
    setInviteLink(null);
    setPublicShareUrl(null);
    setPublicShareExpiry(null);
    setPublicCopied(false);
    onClose();
  };

  const addEmail = (raw: string) => {
    const trimmed = raw.trim().replace(/,|;/g, '');
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setInputError('Please enter a valid email address');
      return;
    }
    if (emails.includes(trimmed)) {
      setInputError('Email already added');
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setInputValue('');
    setInputError('');
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) addEmail(inputValue);
  };

  const handleRemoveEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSendInvites = async () => {
    if (emails.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/trips/${trip.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, role: 'viewer' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send invites');
      }
      setSendSuccess(true);
      setEmails([]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateLink = async () => {
    if (inviteLink) {
      handleCopyLink();
      return;
    }
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [], role: 'viewer' }),
      });
      if (!res.ok) throw new Error('Failed to generate link');
      const data = await res.json();
      const link = data.invites?.[0]?.inviteUrl;
      if (link) {
        setInviteLink(link);
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch {
      setSendError('Failed to generate invite link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleCreatePublicShare = async () => {
    setCreatingPublicShare(true);
    setSendError(null);
    try {
      const body: Record<string, unknown> = {};
      if (publicDuration === 'hours') {
        body.durationHours = parseInt(publicAmount, 10);
      } else if (publicDuration === 'days') {
        body.durationDays = parseInt(publicAmount, 10);
      } else {
        body.indefinite = true;
      }

      const res = await fetch(`/api/trips/${trip.id}/public-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create public link');
      }
      const data = await res.json();
      setPublicShareUrl(data.shareUrl);
      setPublicShareExpiry(data.expiresAt);
      await navigator.clipboard.writeText(data.shareUrl);
      setPublicCopied(true);
      setTimeout(() => setPublicCopied(false), 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to create public link');
    } finally {
      setCreatingPublicShare(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicShareUrl) return;
    await navigator.clipboard.writeText(publicShareUrl);
    setPublicCopied(true);
    setTimeout(() => setPublicCopied(false), 3000);
  };

  const handleRevokePublicShare = async () => {
    if (!publicShareUrl) return;
    const token = publicShareUrl.split('/public/').pop();
    if (!token) return;
    try {
      await fetch(`/api/trips/${trip.id}/public-share?token=${token}`, {
        method: 'DELETE',
      });
      setPublicShareUrl(null);
      setPublicShareExpiry(null);
      setPublicCopied(false);
    } catch {
      setSendError('Failed to revoke public link');
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <ShareIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Share Trip
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {trip.title}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Email invites */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Invite by email
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Enter one or more email addresses. Press <kbd style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>Enter</kbd> or <kbd style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>,</kbd> after each.
          </Typography>

          <Box
            onClick={() => inputRef.current?.focus()}
            sx={{
              border: 1,
              borderColor: inputError ? 'error.main' : 'divider',
              borderRadius: 2,
              p: 1,
              minHeight: 52,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              alignItems: 'flex-start',
              cursor: 'text',
              transition: 'border-color 0.15s',
              '&:focus-within': { borderColor: 'primary.main' },
            }}
          >
            {emails.map((email) => (
              <Chip
                key={email}
                label={email}
                size="small"
                onDelete={() => handleRemoveEmail(email)}
                sx={{ height: 28, fontSize: 13 }}
              />
            ))}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              placeholder={emails.length === 0 ? 'name@example.com' : ''}
              style={{
                border: 'none',
                outline: 'none',
                flex: 1,
                minWidth: 160,
                fontSize: 14,
                background: 'transparent',
                padding: '4px 2px',
                color: 'inherit',
              }}
            />
          </Box>
          {inputError && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {inputError}
            </Typography>
          )}

          {sendError && (
            <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setSendError(null)}>
              {sendError}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleSendInvites}
            disabled={emails.length === 0 || sending}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <MailIcon fontSize="small" />}
            fullWidth
            sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {sending ? 'Sending invites…' : `Send invite${emails.length > 1 ? 's' : ''}${emails.length > 0 ? ` (${emails.length})` : ''}`}
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">or</Typography>
          </Divider>

          {/* Invite link */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Share a link
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Anyone with the link can view the trip and join. The link expires in 7 days.
          </Typography>

          {inviteLink ? (
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'action.hover',
              }}
            >
              <LinkIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                {inviteLink}
              </Typography>
              <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'}>
                <IconButton size="small" onClick={handleCopyLink}>
                  {linkCopied ? (
                    <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />
                  ) : (
                    <LinkIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Button
              variant="outlined"
              onClick={handleGenerateLink}
              disabled={generatingLink}
              startIcon={generatingLink ? <CircularProgress size={16} color="inherit" /> : <LinkIcon fontSize="small" />}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {generatingLink ? 'Generating link…' : 'Generate invite link'}
            </Button>
          )}

          {linkCopied && !inviteLink && null}

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">or</Typography>
          </Divider>

          {/* Public share link */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PublicIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            Public link
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Anyone with this link can view the trip without signing in. No account required.
          </Typography>

          {publicShareUrl ? (
            <Box>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <PublicIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'text.secondary',
                  }}
                >
                  {publicShareUrl}
                </Typography>
                <Tooltip title={publicCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" onClick={handleCopyPublicLink}>
                    {publicCopied ? (
                      <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />
                    ) : (
                      <LinkIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  {publicShareExpiry
                    ? `Expires ${new Date(publicShareExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                    : 'No expiration'}
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={handleRevokePublicShare}
                  sx={{ textTransform: 'none' }}
                >
                  Revoke link
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box>
              <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'flex-end' }}>
                <TextField
                  size="small"
                  type="number"
                  label="Amount"
                  value={publicAmount}
                  onChange={(e) => setPublicAmount(e.target.value)}
                  disabled={publicDuration === 'indefinite'}
                  sx={{ width: 100 }}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={publicDuration}
                  onChange={(_, val) => val && setPublicDuration(val)}
                  sx={{ flex: 1 }}
                >
                  <ToggleButton value="hours" sx={{ textTransform: 'none', fontSize: 13 }}>Hours</ToggleButton>
                  <ToggleButton value="days" sx={{ textTransform: 'none', fontSize: 13 }}>Days</ToggleButton>
                  <ToggleButton value="indefinite" sx={{ textTransform: 'none', fontSize: 13 }}>Indefinite</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Button
                variant="outlined"
                onClick={handleCreatePublicShare}
                disabled={creatingPublicShare}
                startIcon={creatingPublicShare ? <CircularProgress size={16} color="inherit" /> : <PublicIcon fontSize="small" />}
                fullWidth
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {creatingPublicShare ? 'Creating link…' : 'Create public link'}
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Done</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={sendSuccess}
        autoHideDuration={4000}
        onClose={() => setSendSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSendSuccess(false)}>
          Invites sent successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={linkCopied}
        autoHideDuration={3000}
        onClose={() => setLinkCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setLinkCopied(false)}>
          Invite link copied to clipboard!
        </Alert>
      </Snackbar>

      <Snackbar
        open={publicCopied}
        autoHideDuration={3000}
        onClose={() => setPublicCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setPublicCopied(false)}>
          Public link copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
