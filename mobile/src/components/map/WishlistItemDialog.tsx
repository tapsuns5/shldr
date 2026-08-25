import { useState } from 'react';
import { useTheme } from 'react-native-paper';
import type { WishlistDestination } from '@shldr/shared';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@/components/ui';
import { useDeleteWishlistItem, useUpdateWishlistItem } from '@/hooks/use-wishlist';

export function WishlistItemDialog({
  item,
  accountId,
  onDismiss,
}: {
  item: WishlistDestination;
  accountId: string;
  onDismiss: () => void;
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
      onDismiss();
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
    <Dialog visible onDismiss={onDismiss}>
      <DialogTitle>{label}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" style={{ color: item.visited ? theme.colors.primary : theme.colors.tertiary }}>
          {item.visited ? 'Visited' : 'Bucket list'}
        </Typography>
        {item.note ? (
          <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {item.note}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={handleDelete} disabled={busy} textColor={theme.colors.error}>
          Remove
        </Button>
        <Button variant="outlined" onPress={handleToggleVisited} disabled={busy}>
          {item.visited ? 'Mark not visited' : 'Mark visited'}
        </Button>
        <Button onPress={onDismiss}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
