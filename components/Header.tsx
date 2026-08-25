'use client';

import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  MenuIcon,
  ChevronLeftIcon,
  LightModeIcon,
  DarkModeIcon,
  PersonIcon,
} from '@/components/Icons';
import Logo from './Logo';
import NotificationsMenu from './NotificationsMenu';
import { useThemeMode } from './ThemeProviderWrapper';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onDrawerToggle?: () => void;
  isDesktop?: boolean;
  desktopCollapsed?: boolean;
}

const headerIconProps = { strokeWidth: 2 };

export const HEADER_HEIGHT = 56;

export default function Header({
  onDrawerToggle,
  isDesktop = true,
  desktopCollapsed = true,
}: HeaderProps) {
  const { mode, toggleMode } = useThemeMode();
  const router = useRouter();

  return (
    <AppBar
      position="relative"
      color="inherit"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 'none',
        borderBottom: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          minHeight: `${HEADER_HEIGHT}px !important`,
          height: HEADER_HEIGHT,
          px: { xs: 2, sm: 2.5 },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {onDrawerToggle && (
            <IconButton
              onClick={onDrawerToggle}
              size="small"
              edge="start"
              sx={{ width: 34, height: 34, p: 0.5, color: 'text.secondary' }}
            >
              {isDesktop ? (
                desktopCollapsed ? (
                  <MenuIcon {...headerIconProps} sx={{ fontSize: 20 }} />
                ) : (
                  <ChevronLeftIcon {...headerIconProps} sx={{ fontSize: 20 }} />
                )
              ) : (
                <MenuIcon {...headerIconProps} sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          )}
          <Box
            onClick={() => router.push('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Logo height={34} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <NotificationsMenu />
          <Tooltip title="Account">
            <IconButton
              onClick={() => router.push('/settings/account')}
              color="inherit"
              size="small"
              sx={{ width: 34, height: 34, color: 'text.secondary' }}
            >
              <PersonIcon {...headerIconProps} fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton
              onClick={toggleMode}
              color="inherit"
              size="small"
              sx={{ width: 34, height: 34, color: 'text.secondary' }}
            >
              {mode === 'light' ? (
                <DarkModeIcon {...headerIconProps} fontSize="small" />
              ) : (
                <LightModeIcon {...headerIconProps} fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

