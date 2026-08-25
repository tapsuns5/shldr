import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiClient } from '@/lib/api-client';

/**
 * Registers this device for push once there's a signed-in session. Only asks
 * for permission — never registers silently on first launch — the caller
 * decides when that's earned (see AppLayout, which mounts this once the user
 * has at least one trip's worth of context, not on cold start).
 */
export function useRegisterPushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== 'granted') {
          const { status: requested } = await Notifications.requestPermissionsAsync();
          status = requested;
        }
        if (status !== 'granted' || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;

        await apiClient.post('/api/notifications/push-token', {
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceId: Constants.sessionId,
        });
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
