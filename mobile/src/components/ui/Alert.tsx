import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';

type Severity = 'info' | 'success' | 'warning' | 'error';

const ICONS: Record<Severity, string> = {
  info: 'information',
  success: 'check-circle',
  warning: 'alert',
  error: 'alert-circle',
};

/** Paper has no direct Alert equivalent; built on the same MD3 error/tertiary tokens. */
export function Alert({ severity = 'info', children }: { severity?: Severity; children: string }) {
  const theme = useTheme();
  const colorMap: Record<Severity, string> = {
    info: theme.colors.primary,
    success: theme.colors.primary,
    warning: theme.colors.tertiary,
    error: theme.colors.error,
  };
  const bgMap: Record<Severity, string> = {
    info: theme.colors.primaryContainer,
    success: theme.colors.primaryContainer,
    warning: theme.colors.tertiaryContainer,
    error: theme.colors.errorContainer,
  };

  return (
    <View style={[styles.container, { backgroundColor: bgMap[severity] }]}>
      <Icon source={ICONS[severity]} size={20} color={colorMap[severity]} />
      <Text variant="bodyMedium" style={[styles.text, { color: colorMap[severity] }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  text: { flex: 1 },
});
