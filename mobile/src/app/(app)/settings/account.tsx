import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Divider, List, Text, useTheme } from 'react-native-paper';
import { useSession, signOut } from '@/lib/auth-client';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.profile}>
          <Avatar.Text size={64} label={(session?.user.name ?? 'T').slice(0, 1).toUpperCase()} />
          <View>
            <Text variant="titleLarge" style={styles.name}>{session?.user.name ?? 'Traveler'}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{session?.user.email}</Text>
          </View>
        </View>
        <Divider style={styles.divider} />
        <List.Section title="Account information">
          <List.Item title="Name" description={session?.user.name ?? 'Not set'} />
          <List.Item title="Email" description={session?.user.email ?? 'Not set'} />
        </List.Section>
        <List.Item title="Sign out" onPress={handleSignOut} titleStyle={{ color: theme.colors.error }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  name: { fontWeight: '700', marginBottom: 4 },
  divider: { marginVertical: 24 },
});
