'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { gray } from '../lib/colors';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  HomeIcon,
  TripsIcon,
  SettingsIcon,
  DocumentsIcon,
  MapIcon,
  RankIcon,
} from '@/components/Icons';
import Header, { HEADER_HEIGHT } from './Header';

const drawerWidthExpanded = 220;
const drawerWidthCollapsed = 68;

const navItems: { label: string; icon: typeof HomeIcon; path: string }[] = [
  { label: 'Home', icon: HomeIcon, path: '/' },
  { label: 'Trips', icon: TripsIcon, path: '/trips' },
  { label: 'Rank', icon: RankIcon, path: '/rank' },
  { label: 'Maps', icon: MapIcon, path: '/maps' },
  { label: 'Documents', icon: DocumentsIcon, path: '/documents' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

const sidebarIconProps = { strokeWidth: 2 };

const FULL_PAGE_ROUTES = ['/login', '/signup', '/invite', '/onboarding', '/team-invite', '/forgot-password', '/reset-password'];
const MINIMAL_HEADER_ROUTES = ['/public'];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  const isFullPage = FULL_PAGE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isFullPage) return <>{children}</>;

  const isMinimalHeader = MINIMAL_HEADER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isMinimalHeader) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Header />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            bgcolor: 'background.default',
            borderRadius: { xs: 0, md: '14px' },
            m: { xs: 0, md: '0 10px 10px 10px' },
            overflow: 'auto',
            overscrollBehavior: 'none',
          }}
        >
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 1.5 }}>
      <List sx={{ px: isDesktop && desktopCollapsed ? 1 : 1.5, py: 0 }}>
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const button = (
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              sx={{
                borderRadius: '10px',
                mb: 0.75,
                minHeight: 42,
                py: 0.75,
                justifyContent: isDesktop && desktopCollapsed ? 'center' : 'initial',
                px: isDesktop && desktopCollapsed ? 1 : 1.5,
                bgcolor: active
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.07)'
                  : 'transparent',
                color: active ? 'text.primary' : 'text.secondary',
                '&:hover': {
                  bgcolor: active
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'rgba(0, 0, 0, 0.1)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isDesktop && desktopCollapsed ? 0 : 1.5,
                  justifyContent: 'center',
                  color: active ? 'text.primary' : 'text.secondary',
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon {...sidebarIconProps} sx={{ fontSize: 22 }} />
                </Box>
              </ListItemIcon>
              {(!desktopCollapsed || !isDesktop) && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: active ? 600 : 500,
                  }}
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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100vw',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* Slack-like Top Header Layer */}
      <Header
        onDrawerToggle={handleDrawerToggle}
        isDesktop={isDesktop}
        desktopCollapsed={desktopCollapsed}
      />

      {/* Slack-like Unified Body Layer with Sidebar and Curved Main Workspace */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          height: `calc(100dvh - ${HEADER_HEIGHT}px)`,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
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
                bgcolor: 'background.paper',
                backgroundImage: 'none',
                borderRight: 'none',
                top: `${HEADER_HEIGHT}px`,
                height: `calc(100% - ${HEADER_HEIGHT}px)`,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        {/* Desktop permanent drawer */}
        {isDesktop && (
          <Box
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              bgcolor: 'background.paper',
              height: '100%',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard,
              }),
            }}
          >
            {drawerContent}
          </Box>
        )}

        {/* Main curved inner canvas */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
            borderRadius: { xs: 0, md: '14px' },
            mr: { xs: 0, md: 1.25 },
            mb: { xs: 0, md: 1.25 },
            overflow: 'auto',
            overscrollBehavior: 'none',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export { drawerWidthExpanded, drawerWidthCollapsed };

