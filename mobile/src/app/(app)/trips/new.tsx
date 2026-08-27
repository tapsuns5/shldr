import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { NewTripSheet } from '@/components/NewTripSheet';

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <NewTripSheet
        visible
        onDismiss={() => router.back()}
        onCreated={(tripId) => router.replace(`/trips/${tripId}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
