import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { List, RadioButton, Text, useTheme } from 'react-native-paper';
import { useColorMode } from '@/lib/color-mode';

const MODE_OPTIONS = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function PreferencesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preference, setPreference } = useColorMode();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}> 
      <List.Section title="Appearance">
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>Choose how SHLDR looks on this device.</Text>
        <RadioButton.Group value={preference} onValueChange={(value) => setPreference(value as typeof preference)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  description: { paddingHorizontal: 16, marginBottom: 8 },
});
