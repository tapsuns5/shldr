import { useState } from 'react';
import { Image } from 'react-native';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import type { UITrip } from '@shldr/shared';
import { API_URL } from '@/lib/config';

export function TripCard({ trip, onPress }: { trip: UITrip; onPress: () => void }) {
  const theme = useTheme();
  const [useCoverImage, setUseCoverImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const location = trip.destinations[0]?.location || trip.location;
  const locationImage = location
    ? `${API_URL}/api/location-photo?location=${encodeURIComponent(location)}`
    : null;
  const imageUri = imageFailed ? null : useCoverImage ? trip.image : locationImage || trip.image;
  const handleImageError = () => {
    if (!useCoverImage && locationImage && trip.image) {
      setUseCoverImage(true);
    } else {
      setImageFailed(true);
    }
  };

  return (
    <Pressable onPress={onPress}>
      <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="titleLarge">
              {trip.title.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Card.Content style={styles.content}>
          <Text variant="titleMedium" numberOfLines={1}>
            {trip.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {trip.location || 'No destination set'}
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            {trip.date} · {trip.duration}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, overflow: 'hidden' },
  image: { width: '100%', height: 140 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 12, paddingBottom: 14, gap: 2 },
});
