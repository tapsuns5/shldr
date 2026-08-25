import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, HelperText, IconButton, List, Snackbar, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { tripitFeedSchema } from '@shldr/shared';
import { Typography, TextField, Button } from '@/components/ui';

dayjs.extend(relativeTime);
import { useAccounts } from '@/hooks/use-accounts';
import {
  useGmailAccounts,
  useConnectGmail,
  useDisconnectGmail,
  useTripitFeed,
  useSaveTripitFeed,
  useDisconnectTripit,
  useSyncTripit,
} from '@/hooks/use-integrations';

export default function IntegrationsScreen() {
  const theme = useTheme();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;

  const { data: gmailAccounts, isLoading: gmailLoading } = useGmailAccounts(accountId);
  const connectGmail = useConnectGmail(accountId);
  const disconnectGmail = useDisconnectGmail(accountId);

  const { data: tripitFeed, isLoading: tripitLoading } = useTripitFeed(accountId);
  const saveTripit = useSaveTripitFeed(accountId);
  const disconnectTripit = useDisconnectTripit(accountId);
  const syncTripit = useSyncTripit(accountId);

  const [icalUrl, setIcalUrl] = useState('');
  const [tripitError, setTripitError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleConnectGmail = async () => {
    try {
      await connectGmail.mutateAsync();
    } catch {
      setSnackbar('Could not connect Gmail. Try again.');
    }
  };

  const handleSaveTripit = async () => {
    if (!accountId) return;
    setTripitError(null);
    const parsed = tripitFeedSchema.safeParse({ accountId, icalUrl: icalUrl.trim() });
    if (!parsed.success) {
      setTripitError(parsed.error.issues[0]?.message ?? 'Enter a valid .ics URL.');
      return;
    }
    try {
      await saveTripit.mutateAsync(parsed.data);
      setIcalUrl('');
    } catch {
      setTripitError('Could not save that feed. Check the URL and try again.');
    }
  };

  const handleSyncTripit = async () => {
    try {
      const result = await syncTripit.mutateAsync();
      setSnackbar(`Imported ${result.created} ${result.created === 1 ? 'trip' : 'trips'}.`);
    } catch {
      setSnackbar('Sync failed. Try again later.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <List.Section title="Gmail">
        <View style={styles.sectionBody}>
          <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant }}>
            Automatically import reservations from confirmation emails.
          </Typography>
        </View>

        {gmailLoading ? (
          <ActivityIndicator style={styles.inlineLoader} />
        ) : (
          gmailAccounts?.map((account) => (
            <List.Item
              key={account.id}
              title={account.email}
              description={
                account.lastSyncAt ? `Last synced ${dayjs(account.lastSyncAt).fromNow()}` : account.status
              }
              left={(props) => <List.Icon {...props} icon="email-check-outline" />}
              right={() => (
                <IconButton
                  icon="delete-outline"
                  onPress={() => disconnectGmail.mutate(account.id)}
                  iconColor={theme.colors.error}
                />
              )}
            />
          ))
        )}

        <View style={styles.sectionBody}>
          <Button
            variant="outlined"
            onPress={handleConnectGmail}
            loading={connectGmail.isPending}
            disabled={connectGmail.isPending || !accountId}
          >
            Connect another Gmail account
          </Button>
        </View>
      </List.Section>

      <List.Section title="TripIt">
        <View style={styles.sectionBody}>
          <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Paste your TripIt calendar feed URL (Settings → Connected Apps → iCal in TripIt) to import trips.
          </Typography>

          {tripitLoading ? (
            <ActivityIndicator />
          ) : tripitFeed ? (
            <View style={styles.gap}>
              <Typography variant="body2" numberOfLines={1}>
                {tripitFeed.icalUrl}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.onSurfaceVariant }}>
                {tripitFeed.status === 'error'
                  ? tripitFeed.lastError || 'Last sync failed'
                  : tripitFeed.lastSyncAt
                    ? `Last synced ${dayjs(tripitFeed.lastSyncAt).fromNow()}`
                    : 'Not synced yet'}
              </Typography>
              <View style={styles.row}>
                <Button
                  variant="outlined"
                  style={styles.rowButton}
                  onPress={handleSyncTripit}
                  loading={syncTripit.isPending}
                  disabled={syncTripit.isPending}
                >
                  Sync now
                </Button>
                <Button
                  variant="text"
                  textColor={theme.colors.error}
                  style={styles.rowButton}
                  onPress={() => disconnectTripit.mutate()}
                  disabled={disconnectTripit.isPending}
                >
                  Disconnect
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.gap}>
              <TextField
                label="iCal feed URL"
                value={icalUrl}
                onChangeText={setIcalUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              {tripitError ? <HelperText type="error">{tripitError}</HelperText> : null}
              <Button onPress={handleSaveTripit} loading={saveTripit.isPending} disabled={saveTripit.isPending}>
                Save feed
              </Button>
            </View>
          )}
        </View>
      </List.Section>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar(null)} duration={4000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 8 },
  inlineLoader: { marginVertical: 8 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  rowButton: { flex: 1 },
});
