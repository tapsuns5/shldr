import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function PinBadge({
  label,
  color,
  textColor = '#ffffff',
  size = 26,
}: {
  label: string;
  color: string;
  textColor?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.label, { color: textColor, fontSize: size * 0.42 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  label: {
    fontWeight: '700',
  },
});
