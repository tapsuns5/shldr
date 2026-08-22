'use client';

import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton as MuiIconButton,
} from '@mui/material';
import { NotificationsIcon, CheckIcon, CloseIcon } from '@/components/Icons';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  tripId: string | null;
  reservationId: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsMenu() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // silently ignore
      }
    };

    doFetch();
    const interval = setInterval(doFetch, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    setOpen(true);
    fetchNotifications();
  };

  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    handleClose();
    if (notification.link) {
      router.push(notification.link);
    } else if (notification.tripId) {
      router.push(`/tripdetails/${notification.tripId}`);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleOpen}
          size="small"
          sx={{ width: 32, height: 32 }}
        >
          <Badge badgeContent={unreadCount} color="error" overlap="circular">
            <NotificationsIcon strokeWidth={2} fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              mt: 1,
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllRead} sx={{ textTransform: 'none', fontSize: 12 }}>
                Mark all read
              </Button>
            )}
            <MuiIconButton size="small" onClick={handleClose} sx={{ p: 0.25 }}>
              <CloseIcon fontSize="small" />
            </MuiIconButton>
          </Box>
        </Box>
        <Divider />
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && notifications.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        )}
        {!loading && notifications.length > 0 && (
          <List sx={{ py: 0, maxHeight: 380, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <Box key={notification.id}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    !notification.read && (
                      <MuiIconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        <CheckIcon fontSize="small" />
                      </MuiIconButton>
                    )
                  }
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemButton
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ py: 1, pr: 6 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {!notification.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            fontWeight={notification.read ? 400 : 600}
                            noWrap
                          >
                            {notification.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          {notification.body && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {notification.body}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" component="span" sx={{ display: 'block', mt: 0.25 }}>
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                <Divider component="li" />
              </Box>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
