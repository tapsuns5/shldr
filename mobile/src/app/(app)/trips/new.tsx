import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar, HelperText, useTheme } from 'react-native-paper';
import { createTripSchema } from '@shldr/shared';
import { TextField, Button } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateTrip } from '@/hooks/use-trips';

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const createTrip = useCreateTrip();

  const [title, setTitle] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      router.replace(`/trips/${trip.id}`);
    } catch {
      setError('Could not create the trip. Try again.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="New trip" />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form}>
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

          <Button onPress={handleSave} loading={createTrip.isPending} disabled={createTrip.isPending}>
            Create trip
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12 },
});
