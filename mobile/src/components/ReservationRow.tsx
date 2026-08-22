import { View, StyleSheet } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import type { APIReservation, ReservationType } from '@shldr/shared';

const ICONS: Record<ReservationType, string> = {
  flight: 'airplane',
  hotel: 'bed',
  car: 'car',
  rail: 'train',
  cruise: 'ferry',
  activity: 'ticket',
  restaurant: 'silverware-fork-knife',
  transport: 'bus',
  other: 'map-marker',
};

export function ReservationRow({ reservation }: { reservation: APIReservation }) {
  const theme = useTheme();

  return (
    <List.Item
      title={reservation.title}
      description={[
        dayjs(reservation.startDateTime).format('MMM D, h:mm A'),
        reservation.location,
      ]
        .filter(Boolean)
        .join(' · ')}
      left={(props) => (
        <View style={styles.iconWrap}>
          <List.Icon {...props} icon={ICONS[reservation.type]} color={theme.colors.primary} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  iconWrap: { justifyContent: 'center' },
});
