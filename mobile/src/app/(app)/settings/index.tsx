import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar, List, RadioButton, useTheme } from 'react-native-paper';
import { useSession, signOut } from '@/lib/auth-client';
import { useColorMode } from '@/lib/color-mode';
import { Typography } from '@/components/ui';

const MODE_OPTIONS = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const { preference, setPreference } = useColorMode();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <List.Section title="Account">
        <List.Item title={session?.user.name ?? 'Signed in'} description={session?.user.email} />
      </List.Section>

      <List.Section title="Appearance">
        <RadioButton.Group value={preference} onValueChange={(v) => setPreference(v as typeof preference)}>
          {MODE_OPTIONS.map((option) => (
            <List.Item
              key={option.value}
              title={option.label}
              onPress={() => setPreference(option.value)}
              right={() => <RadioButton value={option.value} />}
            />
          ))}
        </RadioButton.Group>
      </List.Section>

      <List.Section title="Data">
        <List.Item
          title="Integrations"
          description="Gmail and TripIt"
          onPress={() => router.push('/settings/integrations')}
          left={(props) => <List.Icon {...props} icon="connection" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>

      <View style={styles.footer}>
        <List.Item
          title="Sign out"
          titleStyle={{ color: theme.colors.error }}
          onPress={handleSignOut}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
        />
      </View>

      <Typography variant="caption" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
        SHLDR mobile
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { marginTop: 16 },
  version: { textAlign: 'center', marginTop: 24 },
});
