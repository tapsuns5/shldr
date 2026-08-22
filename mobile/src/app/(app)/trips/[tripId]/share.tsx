import { useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar, HelperText, SegmentedButtons, useTheme } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import type { InviteTripInput } from '@shldr/shared';
import { Typography, Button } from '@/components/ui';
import { useCreateTripInvite } from '@/hooks/use-invite';

const ROLES: { value: InviteTripInput['role']; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'traveler', label: 'Traveler' },
];

export default function ShareTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const createInvite = useCreateTripInvite(tripId);

  const [role, setRole] = useState<InviteTripInput['role']>('viewer');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setCopied(false);
    const [invite] = await createInvite.mutateAsync({ role });
    setInviteUrl(invite?.inviteUrl ?? null);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    await Share.share({ message: inviteUrl, url: inviteUrl });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Share trip" />
      </Appbar.Header>

      <View style={styles.content}>
        <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Anyone with this link can join the trip with the role you choose below.
        </Typography>

        <SegmentedButtons value={role} onValueChange={(v) => setRole(v as InviteTripInput['role'])} buttons={ROLES} />

        <Button
          style={styles.generateButton}
          onPress={handleGenerate}
          loading={createInvite.isPending}
          disabled={createInvite.isPending}
        >
          {inviteUrl ? 'Generate a new link' : 'Create share link'}
        </Button>

        {createInvite.isError ? (
          <HelperText type="error">Could not create a share link. Try again.</HelperText>
        ) : null}

        {inviteUrl ? (
          <View style={styles.linkBox}>
            <Typography variant="body2" numberOfLines={2} style={styles.linkText}>
              {inviteUrl}
            </Typography>
            <View style={styles.linkActions}>
              <Button variant="outlined" onPress={handleCopy} style={styles.linkActionButton}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button onPress={handleShare} style={styles.linkActionButton}>
                Share
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  generateButton: { marginTop: 16 },
  linkBox: { marginTop: 20, gap: 12 },
  linkText: { fontFamily: 'monospace' },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkActionButton: { flex: 1 },
});
