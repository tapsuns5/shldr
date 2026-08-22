'use client';

import { useState } from 'react';
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
  IconButton,
} from '@mui/material';
import { PersonIcon, SettingsIcon, EditIcon } from '@/components/Icons';
import { useSettings } from '../SettingsShell';
import TeamMembers from '@/components/TeamMembers';
import ChangeEmailDialog from '@/components/ChangeEmailDialog';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

export default function AccountPage() {
  const { user, primaryAccount } = useSettings();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Account Information
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  {user.email}
                </Typography>
                {user.emailVerified ? (
                  <Chip label="Verified" color="success" size="small" />
                ) : (
                  <Chip label="Unverified" color="warning" size="small" />
                )}
                <IconButton size="small" onClick={() => setEmailDialogOpen(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Sign-in methods
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {user.providers.map((provider) => (
                  <Chip
                    key={provider}
                    label={provider === 'credential' ? 'Email & Password' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Password
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                  ••••••••
                </Typography>
                <IconButton size="small" onClick={() => setPasswordDialogOpen(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                User ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {user.id}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Account ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {primaryAccount?.id ?? '—'}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Member Since
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
              <SettingsIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Billing Information
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Current Plan
              </Typography>
              <Chip label={primaryAccount?.plan ? primaryAccount.plan.charAt(0).toUpperCase() + primaryAccount.plan.slice(1) : 'Free'} color="primary" size="small" sx={{ fontWeight: 600 }} />
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Expiration Date
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                —
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                Payment Method
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                —
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" size="small" disabled>
              Upgrade Plan
            </Button>
          </Box>
        </CardContent>
      </Card>

      {primaryAccount && (
        <TeamMembers
          accountId={primaryAccount.id}
          plan={primaryAccount.plan}
          ownerUserId={primaryAccount.ownerUserId}
          currentUserId={user.id}
        />
      )}

      <ChangeEmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        currentEmail={user.email}
        emailVerified={user.emailVerified}
        providers={user.providers}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </Stack>
  );
}
