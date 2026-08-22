import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, List, Snackbar, useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { Typography } from '@/components/ui';
import { useDocuments, useUploadDocument, type APIDocument } from '@/hooks/use-documents';

const TYPE_ICONS: Record<APIDocument['documentType'], string> = {
  passport: 'passport',
  visa: 'stamper',
  ticket: 'ticket-confirmation',
  insurance: 'shield-check',
  hotel: 'bed',
  receipt: 'receipt',
  other: 'file-document-outline',
};

export default function DocumentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: documents, isLoading } = useDocuments(tripId);
  const upload = useUploadDocument();
  const [error, setError] = useState(false);

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0] || !tripId) return;

    const asset = result.assets[0];
    try {
      await upload.mutateAsync({
        tripId,
        documentType: 'other',
        file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' },
      });
    } catch {
      setError(true);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Documents" />
        <Appbar.Action icon="upload" onPress={handlePick} disabled={upload.isPending} />
      </Appbar.Header>

      {isLoading || upload.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : !documents || documents.length === 0 ? (
        <View style={styles.center}>
          <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant }}>
            No documents yet. Tap upload to add a passport, ticket, or receipt.
          </Typography>
        </View>
      ) : (
        <FlashList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.fileName}
              description={item.documentType}
              left={(props) => <List.Icon {...props} icon={TYPE_ICONS[item.documentType]} />}
            />
          )}
        />
      )}

      <Snackbar visible={error} onDismiss={() => setError(false)} duration={4000}>
        Could not upload that file. Try again.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
});
