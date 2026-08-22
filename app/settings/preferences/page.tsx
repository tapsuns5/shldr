'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  Avatar,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { MapIcon, LocationIcon } from '@/components/Icons';
import LocationImage from '@/components/LocationImage';
import type { LocationDisplayMode } from '@/lib/location-image';
import { useSettings } from '../SettingsShell';

export default function PreferencesPage() {
  const { primaryAccount } = useSettings();
  const [displayMode, setDisplayMode] = useState<LocationDisplayMode>(primaryAccount?.locationDisplayMode ?? 'map');
  const [savingDisplayMode, setSavingDisplayMode] = useState(false);
  const [displayModeError, setDisplayModeError] = useState<string | null>(null);

  useEffect(() => {
    if (primaryAccount?.locationDisplayMode) {
      setDisplayMode(primaryAccount.locationDisplayMode);
    }
  }, [primaryAccount?.locationDisplayMode]);

  const handleDisplayModeChange = useCallback(async (_: unknown, newMode: LocationDisplayMode | null) => {
    if (!newMode || !primaryAccount || newMode === displayMode) return;
    setDisplayMode(newMode);
    setSavingDisplayMode(true);
    setDisplayModeError(null);
    try {
      const res = await fetch(`/api/accounts/${primaryAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationDisplayMode: newMode }),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch {
      setDisplayModeError('Failed to save preference. Please try again.');
      setDisplayMode(primaryAccount.locationDisplayMode ?? 'map');
    } finally {
      setSavingDisplayMode(false);
    }
  }, [primaryAccount, displayMode]);

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
              <MapIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>
              Trip Details
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <Box>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                Map / Image Display
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose how trip locations are displayed on trip cards and trip detail pages.
              </Typography>

              <ToggleButtonGroup
                value={displayMode}
                exclusive
                onChange={handleDisplayModeChange}
                disabled={savingDisplayMode || !primaryAccount}
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="map" sx={{ textTransform: 'none', px: 3 }}>
                  <MapIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Map
                </ToggleButton>
                <ToggleButton value="image" sx={{ textTransform: 'none', px: 3 }}>
                  <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Image
                </ToggleButton>
              </ToggleButtonGroup>

              {savingDisplayMode && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">Saving…</Typography>
                </Box>
              )}
              {displayModeError && (
                <Alert severity="error" sx={{ mb: 1 }}>{displayModeError}</Alert>
              )}
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <LocationImage
                    locations={['Paris, France']}
                    fallbackImage="https://picsum.photos/seed/paris-preview/400/250"
                    displayMode={displayMode}
                    width={300}
                    height={180}
                    borderRadius={2}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    Paris, France
                  </Typography>
                </Box>
                <Box>
                  <LocationImage
                    locations={['Tokyo, Japan']}
                    fallbackImage="https://picsum.photos/seed/tokyo-preview/400/250"
                    displayMode={displayMode}
                    width={300}
                    height={180}
                    borderRadius={2}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    Tokyo, Japan
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
