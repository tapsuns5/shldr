import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/lib/auth-client';
import { useAccounts } from '@/hooks/use-accounts';
import { useRegisterPushToken } from '@/hooks/use-register-push-token';

export default function AppLayout() {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: accounts, isPending: accountsPending } = useAccounts({ enabled: Boolean(session) });
  const pathname = usePathname();

  // Deferred until the user has an account (post-onboarding) rather than
  // asking for permission on first launch, per docs/mobile-app-plan.md §7.
  useRegisterPushToken(Boolean(session) && Boolean(accounts && accounts.length > 0));

  if (sessionPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  // New sign-ups have no account yet — everything past this layout assumes one.
  if (!accountsPending && accounts && accounts.length === 0 && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
