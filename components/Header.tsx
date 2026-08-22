'use client';

import {
  AppBar,
  Toolbar,
  Container,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { LightModeIcon, DarkModeIcon, PersonIcon } from '@/components/Icons';
import Logo from './Logo';
import { useThemeMode } from './ThemeProviderWrapper';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { mode, toggleMode } = useThemeMode();
  const router = useRouter();

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Logo height={36} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Account">
              <IconButton onClick={() => router.push('/settings/account')} color="inherit" size="small" sx={{ width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton onClick={toggleMode} color="inherit" size="small" sx={{ width: 32, height: 32 }}>
                {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
