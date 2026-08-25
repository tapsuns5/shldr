import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';
import { SolarIcon } from './SolarIcon';
import dayjs from 'dayjs';
import type { APIReservation, ReservationType } from '@shldr/shared';
import { API_URL } from '@/lib/config';

const ICONS: Record<ReservationType, string> = {
  flight: 'plain-line-duotone',
  hotel: 'bed-line-duotone',
  car: 'delivery-line-duotone',
  rail: 'tram-line-duotone',
  cruise: 'route-line-duotone',
  activity: 'ticket-line-duotone',
  restaurant: 'chef-hat-line-duotone',
  transport: 'bus-line-duotone',
  other: 'map-point-line-duotone',
};

const COLORS: Record<ReservationType, string> = {
  flight: '#16733d',
  hotel: '#1565c0',
  car: '#ef5b00',
  rail: '#6a1b9a',
  cruise: '#00695c',
  activity: '#0277bd',
  restaurant: '#c62828',
  transport: '#4527a0',
  other: '#546e7a',
};

type ReservationWithDetails = APIReservation & {
  details?: {
    flight?: {
      airline?: string | null;
      flightNumber?: string | null;
      departureAirport?: string | null;
      arrivalAirport?: string | null;
      departureTerminal?: string | null;
      seat?: string | null;
      ticketNumber?: string | null;
    };
    car?: {
      pickupLocation?: string | null;
      dropoffLocation?: string | null;
      pickupDateTime?: string | null;
      dropoffDateTime?: string | null;
      vehicleClass?: string | null;
    };
    hotel?: {
      address1?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      roomType?: string | null;
      checkIn?: string | null;
      checkOut?: string | null;
    };
    activity?: { venue?: string | null; address?: string | null; ticketCount?: string | null };
    transport?: {
      transportType?: string | null;
      operator?: string | null;
      departureLocation?: string | null;
      arrivalLocation?: string | null;
    };
  };
};

function getDisplayTime(reservation: APIReservation): { time: string; timezone: string } {
  const date = dayjs(reservation.startDateTime);
  if (!date.isValid() || reservation.type === 'hotel') return { time: '', timezone: '' };

  if (reservation.type === 'flight' && reservation.notes) {
    const departure = reservation.notes.match(/^Departs\s+(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{2,5}|[+-]\d{2}(?::\d{2})?)/im);
    if (departure) return { time: departure[1], timezone: departure[2] };
  }

  let timezone = 'Local';
  if (reservation.providerPhone) {
    try {
      timezone = new Intl.DateTimeFormat('en-US', {
        timeZone: reservation.providerPhone,
        timeZoneName: 'short',
      }).formatToParts(date.toDate()).find((part) => part.type === 'timeZoneName')?.value ?? reservation.providerPhone;
    } catch {
      timezone = reservation.providerPhone;
    }
  }
  return { time: date.format('h:mm A'), timezone };
}

type DetailLine = { text: string; address?: boolean };

function getDetails(reservation: ReservationWithDetails): DetailLine[] {
  const details = reservation.details;
  const lines: DetailLine[] = [];
  const add = (text: string | null | undefined, address = false) => {
    if (text) lines.push({ text, address });
  };

  if (reservation.type === 'flight' && details?.flight) {
    const flight = details.flight;
    add(flight.airline && flight.flightNumber ? `Flight Number ${flight.airline} ${flight.flightNumber}` : flight.flightNumber ? `Flight Number ${flight.flightNumber}` : null);
    add(flight.departureAirport && flight.arrivalAirport ? `${flight.departureAirport} → ${flight.arrivalAirport}` : null);
    add(reservation.confirmationNumber ? `Confirmation ${reservation.confirmationNumber}` : null);
    add(flight.departureTerminal ? `Terminal ${flight.departureTerminal}` : null);
    add(flight.seat ? `Seat ${flight.seat}` : null);
    add(flight.ticketNumber ? `Ticket: ${flight.ticketNumber}` : null);
  } else if (reservation.type === 'car' && details?.car) {
    const car = details.car;
    add(car.pickupDateTime ? `Pick up ${dayjs(car.pickupDateTime).format('h:mm A')}` : null);
    add(car.pickupLocation, true);
    add(car.dropoffDateTime ? `Drop off ${dayjs(car.dropoffDateTime).format('h:mm A')}` : null);
    add(car.dropoffLocation, true);
    add(car.vehicleClass ? `Vehicle: ${car.vehicleClass}` : null);
  } else if (reservation.type === 'hotel' && details?.hotel) {
    const hotel = details.hotel;
    add([hotel.address1, hotel.city, hotel.state, hotel.country].filter(Boolean).join(', '), true);
    add(hotel.checkIn ? `Check-in: ${dayjs(hotel.checkIn).format('MMM D, h:mm A')}` : null);
    add(hotel.checkOut ? `Check-out: ${dayjs(hotel.checkOut).format('MMM D, h:mm A')}` : null);
    add(hotel.roomType ? `Room: ${hotel.roomType}` : null);
  } else if (['activity', 'restaurant', 'cruise'].includes(reservation.type) && details?.activity) {
    add(details.activity.venue, true);
    add(details.activity.address, true);
    add(details.activity.ticketCount ? `Tickets: ${details.activity.ticketCount}` : null);
  } else if (details?.transport) {
    const transport = details.transport;
    add(transport.transportType);
    add(transport.operator);
    add(transport.departureLocation && transport.arrivalLocation ? `${transport.departureLocation} → ${transport.arrivalLocation}` : transport.departureLocation, true);
  }

  add(reservation.totalCost ? `Total paid: ${reservation.totalCost}${reservation.currency ? ` ${reservation.currency}` : ''}` : null);
  const notes = reservation.notes && !reservation.notes.startsWith('tripit::')
    ? reservation.notes.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  lines.push(...notes.filter((line) => reservation.type !== 'flight' || !/^Departs\s/i.test(line)).map((text) => ({ text })));
  return lines;
}

function AddressMenu({ address, onDismiss }: { address: string; onDismiss: () => void }) {
  const theme = useTheme();
  const openMap = (provider: 'google' | 'apple') => {
    const url = provider === 'google'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
    onDismiss();
    void Linking.openURL(url);
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <View style={[styles.mapMenu, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.menuTitle}>Open address in…</Text>
          <Pressable style={styles.menuItem} onPress={() => openMap('google')}>
            <SvgUri uri={`${API_URL}/google-maps.svg`} width={26} height={26} />
            <Text variant="bodyLarge">Google Maps</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => openMap('apple')}>
            <SvgUri uri={`${API_URL}/apple-maps.svg`} width={26} height={26} />
            <Text variant="bodyLarge">Apple Maps</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export function ReservationRow({
  reservation,
  onPress,
}: {
  reservation: APIReservation;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const item = reservation as ReservationWithDetails;
  const { time, timezone } = getDisplayTime(reservation);
  const details = getDetails(item);
  const description = [time, reservation.location].filter(Boolean).join(' · ');
  const displayLines = details.length > 0
    ? (reservation.location && !details.some((line) => line.address)
      ? [{ text: reservation.location, address: true }, ...details]
      : details)
    : description ? [{ text: description, address: Boolean(reservation.location) }] : [];
  const [address, setAddress] = useState<string | null>(null);

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.timeColumn}>
        <Text variant="titleMedium" style={styles.time} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {time}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {timezone}
        </Text>
      </View>
      <View style={styles.iconColumn}>
        <View style={[styles.iconCircle, { backgroundColor: COLORS[reservation.type] }]}>
          <SolarIcon name={ICONS[reservation.type]} size={22} color="#fff" />
        </View>
      </View>
      <View style={styles.content}>
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]} numberOfLines={2}>
          {reservation.title}
        </Text>
        {displayLines.map((line, index) => (
          <Pressable
            key={`${line.text}-${index}`}
            disabled={!line.address}
            onPress={(event) => {
              event.stopPropagation();
              setAddress(line.text);
            }}
          >
            <Text variant="bodyMedium" style={[styles.detail, line.address && { color: theme.colors.primary, textDecorationLine: 'underline' }]} numberOfLines={3}>
              {line.text}
            </Text>
          </Pressable>
        ))}
      </View>
      {address ? <AddressMenu address={address} onDismiss={() => setAddress(null)} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 82, paddingVertical: 8 },
  timeColumn: { width: 60, alignItems: 'flex-end', paddingTop: 2, paddingRight: 5 },
  time: { fontWeight: '700', fontSize: 14, lineHeight: 17, textAlign: 'right' },
  iconColumn: { width: 44, alignItems: 'center', minHeight: 72 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  content: { flex: 1, minWidth: 0, paddingLeft: 7 },
  title: { fontWeight: '600', lineHeight: 23 },
  detail: { color: '#454545', lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapMenu: { width: '100%', maxWidth: 360, borderRadius: 18, paddingVertical: 10, elevation: 8 },
  menuTitle: { fontWeight: '700', paddingHorizontal: 18, paddingVertical: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 13 },
});
