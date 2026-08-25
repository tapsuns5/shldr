import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as DocumentPicker from 'expo-document-picker';
import { ActivityIndicator, Button, List, Snackbar, Text, useTheme } from 'react-native-paper';
import { useAccounts } from '@/hooks/use-accounts';
import { useTrips } from '@/hooks/use-trips';
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
  const { data: accounts } = useAccounts();
  const { data: trips } = useTrips(accounts?.[0]?.id);
  const trip = trips?.[0];
  const { data: documents, isLoading } = useDocuments(trip?.id);
  const upload = useUploadDocument();
  const [error, setError] = useState(false);

  const handlePick = async () => {
    if (!trip) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      await upload.mutateAsync({
        tripId: trip.id,
        documentType: 'other',
        file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' },
      });
    } catch {
      setError(true);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {isLoading || upload.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : !trip ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Create a trip to add documents.</Text>
        </View>
      ) : !documents || documents.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No documents yet.</Text>
          <Button mode="contained" icon="upload" onPress={handlePick} style={styles.button}>
            Upload document
          </Button>
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
  button: { marginTop: 16 },
});
