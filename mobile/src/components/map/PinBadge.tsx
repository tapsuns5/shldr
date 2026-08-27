import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

export function PinBadge({
  label,
  color,
  textColor = '#ffffff',
  size = 26,
  icon,
}: {
  label: string;
  color: string;
  textColor?: string;
  size?: number;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={size * 0.48} color={textColor} /> : <Text style={[styles.label, { color: textColor, fontSize: size * 0.42 }]}>{label}</Text>}
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
