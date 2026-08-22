import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { IconButton, useTheme, Chip } from 'react-native-paper';
import type { WishlistDestination } from '@shldr/shared';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@/components/ui';
import { useDeleteWishlistItem, useUpdateWishlistItem } from '@/hooks/use-wishlist';

function WishlistRow({
  item,
  accountId,
}: {
  item: WishlistDestination;
  accountId: string;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const deleteItem = useDeleteWishlistItem(accountId);
  const updateItem = useUpdateWishlistItem(accountId);

  const label = item.type === 'country' ? item.country : `${item.city}, ${item.country}`;

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteItem.mutateAsync(item.id);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisited = async () => {
    setBusy(true);
    try {
      await updateItem.mutateAsync({ id: item.id, visited: !item.visited });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={styles.rowMain}>
        <Typography variant="body2">{label}</Typography>
        {item.note ? (
          <Typography variant="caption" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {item.note}
          </Typography>
        ) : null}
        <Chip
          compact
          onPress={handleToggleVisited}
          disabled={busy}
          style={styles.chip}
          selected={item.visited}
        >
          {item.visited ? 'Visited' : 'Not visited'}
        </Chip>
      </View>
      <IconButton icon="delete-outline" onPress={handleDelete} disabled={busy} />
    </View>
  );
}

export function WishlistListDialog({
  visible,
  onDismiss,
  accountId,
  items,
  onAddPress,
}: {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
  items: WishlistDestination[];
  onAddPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <DialogTitle>Wishlist</DialogTitle>
      <DialogContent>
        {items.length === 0 ? (
          <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 12 }}>
            No destinations yet. Add somewhere you want to go.
          </Typography>
        ) : (
          <ScrollView style={styles.list}>
            {items.map((item) => (
              <WishlistRow key={item.id} item={item} accountId={accountId} />
            ))}
          </ScrollView>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onDismiss}>
          Close
        </Button>
        <Button onPress={onAddPress}>Add destination</Button>
      </DialogActions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, gap: 2 },
  chip: { alignSelf: 'flex-start', marginTop: 4 },
});
