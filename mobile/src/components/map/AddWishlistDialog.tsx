import { useState } from 'react';
import { HelperText, SegmentedButtons } from 'react-native-paper';
import { createWishlistSchema, getCityCoords, getCountryCode, COUNTRY_CENTROIDS } from '@shldr/shared';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from '@/components/ui';
import { useCreateWishlistItem } from '@/hooks/use-wishlist';

export function AddWishlistDialog({
  visible,
  onDismiss,
  accountId,
}: {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
}) {
  const [type, setType] = useState<'city' | 'country'>('city');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createItem = useCreateWishlistItem(accountId);

  const reset = () => {
    setType('city');
    setCity('');
    setCountry('');
    setNote('');
    setError(null);
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleSubmit = async () => {
    setError(null);

    // No Google Places autocomplete on mobile — resolve coordinates from the
    // same city/country lookup tables the account-wide map already uses
    // (packages/shared/src/map/cityCoords.ts), falling back to a country
    // centroid exactly like getCityCoords does for the web app.
    const countryCode = getCountryCode(country.trim());
    const coords =
      type === 'city'
        ? getCityCoords(city.trim(), country.trim())
        : COUNTRY_CENTROIDS[countryCode]
          ? { ...COUNTRY_CENTROIDS[countryCode], countryCode }
          : null;

    const parsed = createWishlistSchema.safeParse({
      accountId,
      type,
      city: type === 'city' ? city.trim() : undefined,
      country: country.trim(),
      countryCode,
      lat: coords?.lat,
      lng: coords?.lng,
      note: note.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the destination details.');
      return;
    }

    try {
      await createItem.mutateAsync(parsed.data);
      handleDismiss();
    } catch {
      setError('Could not add that destination. Try again.');
    }
  };

  return (
    <Dialog visible={visible} onDismiss={handleDismiss}>
      <DialogTitle>Add to wishlist</DialogTitle>
      <DialogContent>
        <Stack gap={12}>
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as 'city' | 'country')}
            buttons={[
              { value: 'city', label: 'City' },
              { value: 'country', label: 'Whole country' },
            ]}
          />
          {type === 'city' ? (
            <TextField label="City" value={city} onChangeText={setCity} autoFocus />
          ) : null}
          <TextField label="Country" value={country} onChangeText={setCountry} />
          <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline numberOfLines={2} />
          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={handleDismiss} disabled={createItem.isPending}>
          Cancel
        </Button>
        <Button
          onPress={handleSubmit}
          loading={createItem.isPending}
          disabled={createItem.isPending || !country.trim() || (type === 'city' && !city.trim())}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
