import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Deep-links from a tapped push notification to the relevant trip. */
export function useNotificationTap() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { tripId?: string } | undefined;
      if (data?.tripId) {
        router.push(`/trips/${data.tripId}`);
      }
    });
    return () => sub.remove();
  }, [router]);
}
