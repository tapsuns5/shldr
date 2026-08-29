'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Stack, Typography, Box, Tabs, Tab, Button } from '@mui/material';
import { signOut } from '@/lib/auth-client';
import { PersonIcon, LinkIcon, SettingsIcon } from '@/components/Icons';
import type { LocationDisplayMode } from '@/lib/location-image';

interface Account {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  ownerUserId: string;
  plan: 'free' | 'pro' | 'premium';
  locationDisplayMode: LocationDisplayMode;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  providers: string[];
}

interface SettingsContextValue {
  user: User;
  primaryAccount: Account | null;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsShell');
  return ctx;
}

const TABS = [
  { label: 'Account', href: '/settings/account', icon: <PersonIcon fontSize="small" /> },
  { label: 'Integrations', href: '/settings/integrations', icon: <LinkIcon fontSize="small" /> },
  { label: 'Preferences', href: '/settings/preferences', icon: <SettingsIcon fontSize="small" /> },
];

export default function SettingsShell({
  user,
  primaryAccount,
  children,
}: {
  user: User;
  primaryAccount: Account | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = TABS.find((t) => pathname?.startsWith(t.href))?.href ?? '/settings/account';

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <SettingsContext.Provider value={{ user, primaryAccount }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Settings
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your account, billing, and connected services.
              </Typography>
            </Box>
            <Button variant="outlined" color="error" size="small" onClick={handleLogout}>
              Log out
            </Button>
          </Box>

          <Tabs
            value={activeTab}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', minHeight: 48 },
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.href}
                value={tab.href}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                component={Link}
                href={tab.href}
              />
            ))}
          </Tabs>

          {children}
        </Stack>
      </Container>
    </SettingsContext.Provider>
  );
}
