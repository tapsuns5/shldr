import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Divider, HelperText, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTripSchema } from '@shldr/shared';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateTrip } from '@/hooks/use-trips';
import { DateField } from './DateField';
import { BottomSheet } from './BottomSheet';
import { Button, TextField } from './ui';

const DETENT = 0.62;
const HANDLE_HEIGHT = 32; // paddingTop 12 + handle 5 + paddingBottom 15

export function NewTripSheet({
  visible,
  onDismiss,
  onCreated,
}: {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (tripId: string) => void;
}) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const createTrip = useCreateTrip();
  const createdTripId = useRef<string | null>(null);
  const [title, setTitle] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The visible content area at the detent (what the user sees).
  const visibleContentHeight = DETENT * windowHeight - HANDLE_HEIGHT;

  const handleDismiss = () => {
    const tripId = createdTripId.current;
    createdTripId.current = null;
    if (tripId) onCreated(tripId);
    else onDismiss();
  };

  return (
    <BottomSheet visible={visible} onDismiss={handleDismiss} detents={[DETENT]} initialDetentIndex={0}>
      {(close) => {
        const handleSave = async () => {
          setError(null);
          if (!accountId) {
            setError('No account found yet.');
            return;
          }

          const parsed = createTripSchema.safeParse({
            accountId,
            title: title.trim(),
            startDate,
            endDate,
            destinationCity: destinationCity.trim() || undefined,
            destinationCountry: destinationCountry.trim() || undefined,
          });

          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Check the trip details.');
            return;
          }

          try {
            const trip = await createTrip.mutateAsync(parsed.data);
            createdTripId.current = trip.id;
            close();
          } catch {
            setError('Could not create the trip. Try again.');
          }
        };

        return (
          <View style={{ height: visibleContentHeight }}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>Add trip</Text>
              </View>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextField label="Trip title" value={title} onChangeText={setTitle} style={styles.input} />
                <TextField
                  label="Destination city"
                  value={destinationCity}
                  onChangeText={setDestinationCity}
                  style={styles.input}
                />
                <TextField
                  label="Destination country"
                  value={destinationCountry}
                  onChangeText={setDestinationCountry}
                  style={styles.input}
                />
                <DateField label="Start date" value={startDate} onChange={setStartDate} />
                <DateField label="End date" value={endDate} onChange={setEndDate} />
                {error ? <HelperText type="error">{error}</HelperText> : null}
              </ScrollView>
              <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
              <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <Button
                  onPress={handleSave}
                  loading={createTrip.isPending}
                  disabled={createTrip.isPending}
                  style={styles.footerButton}
                >
                  Create trip
                </Button>
              </View>
            </KeyboardAvoidingView>
          </View>
        );
      }}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontWeight: '700' },
  form: { paddingHorizontal: 20, paddingBottom: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 14 },
  footerButton: { width: '100%' },
  input: { marginBottom: 12 },
});
