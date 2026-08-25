import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getMobileTheme } from '@/lib/theme';
import { ColorModeProvider, useColorMode } from '@/lib/color-mode';
import { queryClient, asyncStoragePersister } from '@/lib/query-client';
import { useNotificationTap } from '@/lib/use-notification-tap';

function ThemedApp() {
  const { mode } = useColorMode();
  const theme = getMobileTheme(mode);
  useNotificationTap();

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
      >
        <ColorModeProvider>
          <ThemedApp />
        </ColorModeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
