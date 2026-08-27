import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useAccountMembers,
  useCreateTravelDoc,
  useUpdateTravelDoc,
  useUploadTravelDoc,
  useUserTravelDocs,
  type TravelDoc,
} from '@/hooks/use-documents';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@/components/ui';

export default function DocumentsScreen() {
  const theme = useTheme();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const accountId = accounts?.[0]?.id;
  const { data: members, isLoading: membersLoading } = useAccountMembers(accountId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedMember = members?.find((member) => member.user.id === selectedUserId);
  const { data: docs, isLoading: docsLoading, isFetching } = useUserTravelDocs(selectedUserId);
  const updateDoc = useUpdateTravelDoc();
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUserId && members?.[0]) setSelectedUserId(members[0].user.id);
  }, [members, selectedUserId]);

  const textDocs = useMemo(() => docs?.filter((doc) => doc.fieldType === 'text') ?? [], [docs]);
  const fileDocs = useMemo(() => docs?.filter((doc) => doc.fieldType === 'file') ?? [], [docs]);
  const busy = accountsLoading || membersLoading || docsLoading || isFetching;

  const saveField = async () => {
    if (!editing || !selectedUserId) return;
    try {
      await updateDoc.mutateAsync({ id: editing.id, value: editing.value, userId: selectedUserId });
      setEditing(null);
    } catch {
      setError('Could not save this field. Try again.');
    }
  };

  if (busy && !docs) {
    return <View style={[styles.center, { backgroundColor: theme.colors.background }]}><ActivityIndicator /></View>;
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={styles.title}>Documents</Text>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Store essential travel details and documents for each person in your account. All sensitive data is encrypted.
        </Text>

        {!members?.length ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="bodyMedium">No account members found.</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card mode="outlined" style={styles.card}>
              <Card.Content>
                <Text variant="labelMedium" style={[styles.overline, { color: theme.colors.onSurfaceVariant }]}>SELECT PERSON</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
                  {members.map((member) => {
                    const active = member.user.id === selectedUserId;
                    return (
                      <Button
                        key={member.id}
                        mode={active ? 'contained-tonal' : 'outlined'}
                        compact
                        icon={() => (
                          <Avatar.Text
                            size={28}
                            label={member.user.name.slice(0, 1).toUpperCase()}
                            style={{ backgroundColor: active ? theme.colors.primary : theme.colors.secondaryContainer }}
                            color={active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer}
                          />
                        )}
                        onPress={() => { setSelectedUserId(member.user.id); setEditing(null); }}
                        style={styles.personButton}
                        labelStyle={styles.personLabel}
                      >
                        {member.user.name}
                      </Button>
                    );
                  })}
                </ScrollView>
              </Card.Content>
            </Card>

            {selectedMember && (
              <View style={styles.personHeader}>
                <View style={styles.personInfo}>
                  <Avatar.Text size={38} label={selectedMember.user.name.slice(0, 1).toUpperCase()} />
                  <View>
                    <Text variant="titleMedium" style={styles.personName}>{selectedMember.user.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{selectedMember.user.email}</Text>
                  </View>
                </View>
                <Button mode="contained" compact icon="plus" onPress={() => setDialogVisible(true)}>Add field</Button>
              </View>
            )}

            {docsLoading ? <ActivityIndicator style={styles.loader} /> : docs?.length ? (
              <>
                {textDocs.length > 0 && (
                  <DocSection
                    title="Travel Details"
                    docs={textDocs}
                    editing={editing}
                    onEdit={(doc) => setEditing({ id: doc.id, value: doc.value ?? '' })}
                    onChange={(value) => setEditing((current) => current ? { ...current, value } : current)}
                    onSave={saveField}
                    onCancel={() => setEditing(null)}
                    saving={updateDoc.isPending}
                  />
                )}
                {fileDocs.length > 0 && <DocSection title="Files" docs={fileDocs} />}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {selectedUserId && (
        <AddFieldDialog
          visible={dialogVisible}
          userId={selectedUserId}
          onDismiss={() => setDialogVisible(false)}
          onError={setError}
        />
      )}
      <Snackbar visible={Boolean(error)} onDismiss={() => setError(null)}>{error}</Snackbar>
    </View>
  );
}

function DocSection({
  title, docs, editing, onEdit, onChange, onSave, onCancel, saving,
}: {
  title: string;
  docs: TravelDoc[];
  editing?: { id: string; value: string } | null;
  onEdit?: (doc: TravelDoc) => void;
  onChange?: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}) {
  const theme = useTheme();
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <Avatar.Icon size={38} icon="file-document-outline" />
          <Text variant="titleMedium" style={styles.sectionTitle}>{title}</Text>
        </View>
        <Divider />
        {docs.map((doc) => {
          const isEditing = editing?.id === doc.id;
          return (
            <View key={doc.id} style={styles.fieldRow}>
              <View style={styles.fieldBody}>
                <View style={styles.labelRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{doc.label}</Text>
                  {doc.isDefault && <Chip compact style={styles.defaultChip} textStyle={styles.chipText}>Default</Chip>}
                </View>
                {doc.fieldType === 'file' ? (
                  <Text variant="bodyLarge" style={styles.value}>{doc.fileName ?? '—'}</Text>
                ) : isEditing ? (
                  <View style={styles.editRow}>
                    <TextInput
                      mode="outlined"
                      dense
                      value={editing.value}
                      onChangeText={onChange}
                      placeholder={doc.label === 'Birth Date' ? 'YYYY-MM-DD' : undefined}
                      style={styles.editInput}
                      autoFocus
                    />
                    <IconButton icon="check" onPress={onSave} disabled={saving} />
                    <IconButton icon="close" onPress={onCancel} disabled={saving} />
                  </View>
                ) : (
                  <View style={styles.valueRow}>
                    <Text variant="bodyLarge" style={styles.value}>{formatValue(doc)}</Text>
                    <IconButton icon="pencil-outline" size={18} onPress={() => onEdit?.(doc)} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

function AddFieldDialog({ visible, userId, onDismiss, onError }: {
  visible: boolean;
  userId: string;
  onDismiss: () => void;
  onError: (message: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'text' | 'file'>('text');
  const [value, setValue] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const createDoc = useCreateTravelDoc();
  const uploadDoc = useUploadTravelDoc();

  useEffect(() => {
    if (visible) { setLabel(''); setType('text'); setValue(''); setFile(null); }
  }, [visible]);

  const save = async () => {
    if (!label.trim() || (type === 'text' && !value.trim()) || (type === 'file' && !file)) {
      onError(type === 'file' ? 'Field name and file are required.' : 'Field name and value are required.');
      return;
    }
    try {
      if (type === 'text') await createDoc.mutateAsync({ label: label.trim(), value, targetUserId: userId });
      else await uploadDoc.mutateAsync({
        label: label.trim(), targetUserId: userId,
        file: { uri: file!.uri, name: file!.name, mimeType: file!.mimeType ?? 'application/octet-stream' },
      });
      onDismiss();
    } catch {
      onError('Could not add this field. Try again.');
    }
  };

  const saving = createDoc.isPending || uploadDoc.isPending;
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <DialogTitle>Add field</DialogTitle>
      <DialogContent>
        <View style={styles.dialogContent}>
          <TextInput label="Field name" placeholder="e.g. Emergency Contact" value={label} onChangeText={setLabel} mode="outlined" autoFocus />
          <SegmentedButtons value={type} onValueChange={(next) => setType(next as 'text' | 'file')} buttons={[{ value: 'text', label: 'Text' }, { value: 'file', label: 'File upload' }]} />
          {type === 'text' ? (
            <TextInput label="Value" value={value} onChangeText={setValue} mode="outlined" />
          ) : (
            <>
              <Button mode="outlined" icon="file-upload-outline" onPress={async () => {
                const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
                if (!result.canceled) setFile(result.assets[0]);
              }}>
                {file?.name ?? 'Choose a file'}
              </Button>
              <HelperText type="info">Files are stored securely.</HelperText>
            </>
          )}
        </View>
      </DialogContent>
      <DialogActions>
        <Button mode="text" onPress={onDismiss} disabled={saving}>Cancel</Button>
        <Button mode="contained" onPress={save} loading={saving} disabled={saving}>Add field</Button>
      </DialogActions>
    </Dialog>
  );
}

function formatValue(doc: TravelDoc) {
  if (!doc.value) return '—';
  if (doc.label === 'Birth Date') {
    const date = new Date(`${doc.value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return doc.value;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 110 },
  title: { fontWeight: '800', marginBottom: 4 },
  description: { lineHeight: 21, marginBottom: 20 },
  card: { borderRadius: 16, marginBottom: 16 },
  overline: { fontWeight: '700', marginBottom: 8 },
  peopleRow: { gap: 8, paddingBottom: 2 },
  personButton: { borderRadius: 10 },
  personLabel: { marginHorizontal: 4 },
  personHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  personInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  personName: { fontWeight: '700' },
  loader: { marginVertical: 28 },
  emptyContent: { alignItems: 'center', paddingVertical: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionTitle: { fontWeight: '700' },
  fieldRow: { paddingVertical: 13 },
  fieldBody: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  defaultChip: { height: 22 },
  chipText: { fontSize: 11, marginVertical: 0 },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  value: { fontWeight: '600', flex: 1 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  editInput: { flex: 1 },
  dialogContent: { gap: 14 },
});
