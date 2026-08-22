'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  Avatar,
  Chip,
  Button,
  Box,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { PersonIcon, AddIcon, DeleteIcon, MailIcon, LinkIcon, CheckIcon } from '@/components/Icons';

interface Member {
  id: string;
  role: string;
  joinedAt: string | null;
  user: { id: string; name: string; email: string; image: string | null };
}

interface Invite {
  id: string;
  email: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedByUser: { id: string; name: string; image: string | null };
}

interface TeamMembersProps {
  accountId: string;
  plan: 'free' | 'pro' | 'premium';
  ownerUserId: string;
  currentUserId: string;
}

const PLAN_SEAT_LIMITS: Record<string, number | null> = {
  free: 2,
  pro: 6,
  premium: null,
};

export default function TeamMembers({ accountId, plan, ownerUserId, currentUserId }: TeamMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const isOwner = currentUserId === ownerUserId;
  const seatLimit = PLAN_SEAT_LIMITS[plan];
  const totalSeats = members.length + invites.filter((i) => i.status === 'pending').length;
  const canInvite = isOwner && (seatLimit === null || totalSeats < seatLimit);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}/members`),
        fetch(`/api/accounts/${accountId}/invites`),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEmailInvite = async () => {
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send invite');
      }
      const invite = await res.json();
      setInvites((prev) => [...prev, invite]);
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const handleLinkInvite = async () => {
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate invite link');
      }
      const invite = await res.json();
      setInvites((prev) => [...prev, invite]);
      const url = `${window.location.origin}/team-invite/${invite.token}`;
      setGeneratedLink(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const copyGeneratedLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const closeDialog = () => {
    setInviteDialogOpen(false);
    setInviteEmail('');
    setGeneratedLink(null);
    setLinkCopied(false);
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/invites/${inviteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke invite');
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/team-invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" fontWeight={700}>
            Team Members
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {totalSeats} {seatLimit ? `of ${seatLimit}` : ''} seats used
          </Typography>
          <Chip
            label={plan.charAt(0).toUpperCase() + plan.slice(1)}
            color="primary"
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {seatLimit !== null && totalSeats >= seatLimit && (
            <Chip label="Limit reached" color="warning" size="small" />
          )}
        </Stack>

        <List>
          {members.map((member) => (
            <ListItem key={member.id} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar
                  src={member.user.image || undefined}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  {member.user.name.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body1" fontWeight={500}>
                      {member.user.name}
                    </Typography>
                    {member.role === 'owner' && (
                      <Chip label="Owner" size="small" color="primary" />
                    )}
                    {member.user.id === currentUserId && (
                      <Typography variant="caption" color="text.secondary">
                        (you)
                      </Typography>
                    )}
                  </Stack>
                }
                secondary={member.user.email}
              />
              {isOwner && member.role !== 'owner' && (
                <ListItemSecondaryAction>
                  <Tooltip title="Remove member">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleRemoveMember(member.user.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>

        {invites.filter((i) => i.status === 'pending').length > 0 && (
          <>
            <Divider sx={{ my: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Pending Invites
              </Typography>
            </Divider>
            <List>
              {invites
                .filter((i) => i.status === 'pending')
                .map((invite) => (
                  <ListItem key={invite.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <MailIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={invite.email || 'Link invite'}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={copiedToken === invite.token ? 'Copied!' : 'Copy invite link'}>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => copyInviteLink(invite.token)}
                        >
                          {copiedToken === invite.token ? (
                            <CheckIcon fontSize="small" />
                          ) : (
                            <LinkIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      {isOwner && (
                        <Tooltip title="Revoke invite">
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRevoke(invite.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </ListItem>
                ))}
            </List>
          </>
        )}

        {isOwner && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => setInviteDialogOpen(true)}
              disabled={!canInvite}
            >
              Invite User
            </Button>
          </Box>
        )}

        {!isOwner && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Only the account owner can invite new users.
          </Typography>
        )}
      </CardContent>

      <Dialog open={inviteDialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Invite a user to your account</DialogTitle>
        <DialogContent>
          {generatedLink ? (
            <Stack spacing={2}>
              <Alert severity="info" sx={{ alignItems: 'center' }}>
                Share this link with the person you want to invite. This is a single-use link —
                it can only be used once.
              </Alert>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  value={generatedLink}
                  size="small"
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ fontFamily: 'monospace' }}
                />
                <Button
                  variant="outlined"
                  onClick={copyGeneratedLink}
                  startIcon={linkCopied ? <CheckIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {linkCopied ? 'Copied!' : 'Copy'}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                The link expires in 7 days.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Invite by email</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter the email address of the person you want to invite. They&apos;ll receive an email
                  with a unique link to join your account.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Email address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleEmailInvite}
                    disabled={inviting || !inviteEmail}
                    startIcon={inviting ? <CircularProgress size={16} color="inherit" /> : <MailIcon fontSize="small" />}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Send
                  </Button>
                </Stack>
              </Box>

              <Divider>or</Divider>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Invite by link</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Generate a single-use invite link to share directly with someone.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleLinkInvite}
                  disabled={inviting}
                  startIcon={inviting ? <CircularProgress size={16} color="inherit" /> : <LinkIcon fontSize="small" />}
                  fullWidth
                >
                  Generate Invite Link
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            {generatedLink ? 'Done' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
