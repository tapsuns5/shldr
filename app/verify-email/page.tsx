'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Container,
  Stack,
  Typography,
  Button,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
} from '@mui/material';
import { CheckIcon, CloseIcon } from '@/components/Icons';
import { useSession } from '@/lib/auth-client';

function VerifyEmailContent() {
  const params = useSearchParams();
  const error = params.get('error');
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">Verifying your email...</Typography>
        </Stack>
      </Container>
    );
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      TOKEN_EXPIRED: 'The verification link has expired. Please request a new email change.',
      INVALID_TOKEN: 'The verification link is invalid. Please request a new email change.',
      USER_NOT_FOUND: 'User not found. Please contact support if this persists.',
      INVALID_USER: 'This verification link does not match your current session. Please try again.',
    };

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <CloseIcon sx={{ fontSize: 64, color: 'error.main' }} />
          <Typography variant="h5" fontWeight={700}>
            Verification Failed
          </Typography>
          <Alert severity="error" sx={{ width: '100%' }}>
            <AlertTitle>Error</AlertTitle>
            {errorMessages[error] || 'An error occurred during email verification.'}
          </Alert>
          <Button variant="contained" component={Link} href="/settings/account">
            Back to Account Settings
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <CheckIcon sx={{ fontSize: 64, color: 'success.main' }} />
        <Typography variant="h5" fontWeight={700}>
          Email Verified
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {session?.user?.email
            ? `Your email has been verified as ${session.user.email}. You can now continue using Shldr with your updated email address.`
            : 'Your email has been successfully verified. You can now continue using Shldr.'}
        </Typography>
        <Box>
          <Button variant="contained" component={Link} href="/settings/account">
            Go to Account Settings
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography color="text.secondary">Loading...</Typography>
          </Stack>
        </Container>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
