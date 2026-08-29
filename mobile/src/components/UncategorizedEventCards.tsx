import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
import type { APIReservation, ReservationType, UITrip } from '@shldr/shared';
import { useReservations, useDeleteReservation, useMoveReservation, useCopyReservation } from '@/hooks/use-reservations';
import { useTrips } from '@/hooks/use-trips';
import { SolarIcon } from './SolarIcon';
import { BottomSheet } from './BottomSheet';

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

const TYPE_LABELS: Record<string, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  car: 'Car Rental',
  rail: 'Rail',
  cruise: 'Cruise',
  activity: 'Activity',
  restaurant: 'Restaurant',
  transport: 'Transport',
  other: 'Event',
};

type ActionMode = 'move' | 'copy';

interface UncategorizedEventCardsProps {
  trip: UITrip | null;
  tripsLoading: boolean;
  accountId: string | undefined;
  onOpenEvent: (tripId: string, reservationId: string) => void;
}

export function UncategorizedEventCards({
  trip,
  tripsLoading,
  accountId,
  onOpenEvent,
}: UncategorizedEventCardsProps) {
  const theme = useTheme();
  const tripId = trip?.id;
  const { data: reservations, isLoading, refetch } = useReservations(tripId);
  const { data: allTrips } = useTrips(accountId);
  const deleteReservation = useDeleteReservation(tripId ?? '');
  const moveReservation = useMoveReservation(tripId ?? '');
  const copyReservation = useCopyReservation(tripId ?? '');

  const [activeReservation, setActiveReservation] = useState<APIReservation | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>('move');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const movableTrips = useMemo(
    () => (allTrips ?? []).filter((t) => !t.isUncategorized && t.id !== tripId),
    [allTrips, tripId],
  );

  const openActions = (reservation: APIReservation) => {
    setActiveReservation(reservation);
    setActionSheetOpen(true);
  };

  const openMoveSheet = (mode: ActionMode) => {
    setActionMode(mode);
    setActionSheetOpen(false);
    setMoveSheetOpen(true);
  };

  const openDelete = () => {
    setActionSheetOpen(false);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!activeReservation) return;
    deleteReservation.mutate(activeReservation.id, {
      onSettled: () => {
        setDeleteOpen(false);
        setActiveReservation(null);
        refetch();
      },
    });
  };

  const selectTargetTrip = (targetTripId: string) => {
    if (!activeReservation) return;
    if (actionMode === 'move') {
      moveReservation.mutate(
        { reservationId: activeReservation.id, targetTripId },
        {
          onSettled: () => {
            setMoveSheetOpen(false);
            setActiveReservation(null);
            refetch();
          },
        },
      );
    } else {
      copyReservation.mutate(
        { reservation: activeReservation, targetTripId },
        {
          onSettled: () => {
            setMoveSheetOpen(false);
            setActiveReservation(null);
          },
        },
      );
    }
  };

  if (tripsLoading || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!trip || !reservations || reservations.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No uncategorized trip details.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reservations.map((reservation) => (
          <Pressable
            key={reservation.id}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
            onPress={() => tripId && onOpenEvent(tripId, reservation.id)}
          >
            <View style={styles.cardBody}>
              <View style={styles.cardMain}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS[reservation.type] }]}>
                  <SolarIcon name={ICONS[reservation.type]} size={22} color="#fff" />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.titleRow}>
                    <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
                      {reservation.title}
                    </Text>
                    <Text style={[styles.typeChip, { color: theme.colors.onSurfaceVariant, borderColor: theme.colors.outline }]}>
                      {TYPE_LABELS[reservation.type] ?? 'Event'}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {(reservation.source === 'email_import'
                      ? dayjs.utc(reservation.startDateTime)
                      : dayjs(reservation.startDateTime)
                    ).format('ddd, MMM D, YYYY [at] h:mm A')}
                  </Text>
                  {reservation.location ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                      {reservation.location}
                    </Text>
                  ) : null}
                  {reservation.providerName ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {reservation.providerName}
                    </Text>
                  ) : null}
                </View>
              </View>
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => openActions(reservation)}
                accessibilityLabel={`More options for ${reservation.title}`}
              />
            </View>
          </Pressable>
        ))}
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Action sheet */}
      <BottomSheet
        visible={actionSheetOpen}
        onDismiss={() => setActionSheetOpen(false)}
        detents={[0.34]}
        initialDetentIndex={0}
      >
        {() => (
          <View style={styles.actionSheet}>
            <Text variant="titleMedium" style={styles.actionTitle}>
              {activeReservation?.title}
            </Text>
            <Pressable style={styles.actionItem} onPress={() => activeReservation && tripId && onOpenEvent(tripId, activeReservation.id)}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.colors.primary} />
              <Text variant="bodyLarge">Edit Event Detail</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={() => openMoveSheet('move')}>
              <MaterialCommunityIcons name="file-move-outline" size={22} color={theme.colors.primary} />
              <Text variant="bodyLarge">Move Event Detail</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={() => openMoveSheet('copy')}>
              <MaterialCommunityIcons name="content-copy" size={22} color={theme.colors.primary} />
              <Text variant="bodyLarge">Copy Event Detail</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={openDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.colors.error} />
              <Text variant="bodyLarge" style={{ color: theme.colors.error }}>Delete Event Detail</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>

      {/* Move/Copy trip picker */}
      <BottomSheet
        visible={moveSheetOpen}
        onDismiss={() => setMoveSheetOpen(false)}
        detents={[0.5, 0.8]}
        initialDetentIndex={0}
      >
        {() => (
          <View style={styles.moveSheet}>
            <Text variant="titleMedium" style={styles.actionTitle}>
              {actionMode === 'move' ? 'Move to trip' : 'Copy to trip'}
            </Text>
            {movableTrips.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, padding: 16 }}>
                No other trips available.
              </Text>
            ) : (
              <ScrollView style={styles.moveList}>
                {movableTrips.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.moveItem, { borderBottomColor: theme.colors.outline }]}
                    onPress={() => selectTargetTrip(t.id)}
                    disabled={moveReservation.isPending || copyReservation.isPending}
                  >
                    <View style={styles.moveItemText}>
                      <Text variant="bodyLarge" numberOfLines={1}>{t.title}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {t.location || 'No destination'} · {t.date}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {(moveReservation.isPending || copyReservation.isPending) ? (
              <View style={styles.centerSmall}><ActivityIndicator /></View>
            ) : null}
          </View>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <Portal>
        <Dialog visible={deleteOpen} onDismiss={() => !deleteReservation.isPending && setDeleteOpen(false)}>
          <Dialog.Title>Delete Event?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This action cannot be undone. This event detail will be permanently removed.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteOpen(false)} disabled={deleteReservation.isPending}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              onPress={confirmDelete}
              loading={deleteReservation.isPending}
              disabled={deleteReservation.isPending}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerSmall: { paddingVertical: 16, alignItems: 'center' },
  card: { borderRadius: 16, marginBottom: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start' },
  cardMain: { flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontWeight: '700', flexShrink: 1 },
  typeChip: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  actionSheet: { paddingHorizontal: 8, paddingBottom: 16 },
  actionTitle: { fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  moveSheet: { flex: 1 },
  moveList: { flex: 1 },
  moveItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  moveItemText: { flex: 1, minWidth: 0, gap: 2 },
});
