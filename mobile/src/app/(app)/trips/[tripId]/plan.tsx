import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar, Button, HelperText, SegmentedButtons, TextInput, useTheme } from 'react-native-paper';
import { DateField } from '@/components/DateField';
import { apiClient } from '@/lib/api-client';

const TYPES = [
  { value: 'activity', label: 'Activity' },
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
];

export default function NewPlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId, date: initialDate } = useLocalSearchParams<{ tripId: string; date?: string }>();
  const [type, setType] = useState('activity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Enter a title, date, and time in HH:MM format.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await apiClient.post(`/api/trips/${tripId}/reservations`, {
        type,
        title: title.trim(),
        startDateTime: `${date}T${time}:00`,
        location: location.trim() || null,
      });
      router.back();
    } catch {
      setError('Could not add this plan. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <SegmentedButtons value={type} onValueChange={setType} buttons={TYPES} style={styles.types} />
          <TextInput
            mode="outlined"
            label="Plan title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <DateField label="Date" value={date} onChange={setDate} />
          <TextInput
            mode="outlined"
            label="Time"
            value={time}
            onChangeText={setTime}
            placeholder="12:00"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />
          {error ? <HelperText type="error">{error}</HelperText> : null}
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.save}>
            Add to itinerary
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  types: { marginBottom: 20 },
  input: { marginBottom: 12 },
  save: { marginTop: 8 },
});
