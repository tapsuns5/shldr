'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { brand, gray } from '../lib/colors';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  MenuIcon,
  ChevronLeftIcon,
  HomeIcon,
  TripsIcon,
  SettingsIcon,
  LightModeIcon,
  DarkModeIcon,
  PersonIcon,
  DocumentsIcon,
  MapIcon,
} from '@/components/Icons';
import NotificationsMenu from './NotificationsMenu';
import Logo from './Logo';
import { useThemeMode } from './ThemeProviderWrapper';

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 65;

const navItems: { label: string; icon: typeof HomeIcon; path: string }[] = [
  { label: 'Home', icon: HomeIcon, path: '/' },
  { label: 'Trips', icon: TripsIcon, path: '/trips' },
  { label: 'Maps', icon: MapIcon, path: '/maps' },
  { label: 'Documents', icon: DocumentsIcon, path: '/documents' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

const sidebarIconProps = { strokeWidth: 2 };

const FULL_PAGE_ROUTES = ['/login', '/signup', '/invite'];
const MINIMAL_HEADER_ROUTES = ['/public'];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const pathname = usePathname();
  const router = useRouter();

  const { mode, toggleMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  const isFullPage = FULL_PAGE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isFullPage) return <>{children}</>;

  const isMinimalHeader = MINIMAL_HEADER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isMinimalHeader) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: '100vh',
            bgcolor: 'background.default',
            overscrollBehavior: 'none',
          }}
        >
          <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.default' }}>
            <Toolbar sx={{ justifyContent: 'flex-end' }}>
              <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                <IconButton onClick={toggleMode} color="inherit" size="small" sx={{ width: 32, height: 32 }}>
                  {mode === 'light' ? <DarkModeIcon {...sidebarIconProps} fontSize="small" /> : <LightModeIcon {...sidebarIconProps} fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>
          {children}
        </Box>
      </Box>
    );
  }

  const handleDrawerToggle = () => {
    if (isDesktop) {
      setDesktopCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    if (!isDesktop) setMobileOpen(false);
  };

  const drawerWidth = isDesktop
    ? desktopCollapsed
      ? drawerWidthCollapsed
      : drawerWidthExpanded
    : drawerWidthExpanded;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: desktopCollapsed && isDesktop ? 'center' : 'space-between',
          px: desktopCollapsed && isDesktop ? 1.5 : 2.5,
          minHeight: '64px !important',
        }}
      >
        {(!desktopCollapsed || !isDesktop) && (
          <Logo height={40} />
        )}
        {isDesktop && (
          <IconButton onClick={handleDrawerToggle} size="small" sx={{ width: 32, height: 32, p: 0.5 }}>
            {desktopCollapsed ? (
              <MenuIcon {...sidebarIconProps} sx={{ fontSize: 18 }} />
            ) : (
              <ChevronLeftIcon {...sidebarIconProps} sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: isDesktop && desktopCollapsed ? 0.5 : 1.5, pt: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const button = (
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                minHeight: 30,
                py: 0.5,
                justifyContent: isDesktop && desktopCollapsed ? 'center' : 'initial',
                px: isDesktop && desktopCollapsed ? 1 : 1.5,
                bgcolor: active ? gray[200] : 'transparent',
                color: active ? 'text.primary' : 'text.secondary',
                '&:hover': {
                  bgcolor: active ? gray[300] : 'action.hover',
                },
                ...(theme.palette.mode === 'dark' && {
                  bgcolor: active ? gray[700] : 'transparent',
                  color: active ? '#ffffff' : gray[400],
                  '&:hover': {
                    bgcolor: active ? gray[600] : 'rgba(255, 255, 255, 0.08)',
                  },
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isDesktop && desktopCollapsed ? 0 : 0.75,
                  justifyContent: 'center',
                  color: active ? 'text.primary' : 'text.secondary',
                  ...(theme.palette.mode === 'dark' && {
                    color: active ? '#ffffff' : gray[400],
                  }),
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    transform: isDesktop && desktopCollapsed ? 'scale(0.9)' : 'scale(1)',
                    transformOrigin: 'center',
                  }}
                >
                  <item.icon {...sidebarIconProps} fontSize="small" />
                </Box>
              </ListItemIcon>
              {(!desktopCollapsed || !isDesktop) && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: active ? 600 : 500 }}
                />
              )}
            </ListItemButton>
          );

          if (isDesktop && desktopCollapsed) {
            return (
              <Tooltip key={item.label} title={item.label} placement="right">
                {button}
              </Tooltip>
            );
          }

          return <ListItem key={item.label} disablePadding>{button}</ListItem>;
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
    </Box>
  );

  const header = (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.default' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isDesktop && (
            <IconButton onClick={handleDrawerToggle} edge="start" size="small" sx={{ mr: 1.5, width: 32, height: 32 }}>
              <MenuIcon {...sidebarIconProps} fontSize="small" />
            </IconButton>
          )}
          <Logo height={40} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <NotificationsMenu />
          <Tooltip title="Account">
            <IconButton onClick={() => router.push('/settings/account')} color="inherit" size="small" sx={{ width: 32, height: 32 }}>
              <PersonIcon {...sidebarIconProps} fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton onClick={toggleMode} color="inherit" size="small" sx={{ width: 32, height: 32 }}>
              {mode === 'light' ? <DarkModeIcon {...sidebarIconProps} fontSize="small" /> : <LightModeIcon {...sidebarIconProps} fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile temporary drawer */}
      {!isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidthExpanded,
              boxSizing: 'border-box',
              bgcolor: 'background.default',
              backgroundImage: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Desktop permanent drawer (mini variant) */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          open={!desktopCollapsed}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              overflowX: 'hidden',
              bgcolor: 'background.default',
              backgroundImage: 'none',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard,
              }),
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          minWidth: 0,
          minHeight: '100vh',
          bgcolor: 'background.default',
          overscrollBehavior: 'none',
        }}
      >
        {header}
        {children}
      </Box>
    </Box>
  );
}

export { drawerWidthExpanded, drawerWidthCollapsed };
