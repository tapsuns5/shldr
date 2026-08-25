import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export function StatChip({ label, value }: { label: string; value: string | number }) {
  const theme = useTheme();

  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 84,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
