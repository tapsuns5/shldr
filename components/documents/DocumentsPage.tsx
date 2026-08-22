'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Stack,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Avatar,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  ListItem,
} from '@mui/material';
import {
  DocumentsIcon,
  AddIcon,
  DeleteIcon,
  EditIcon,
  NoteIcon,
  CloseIcon,
  PersonIcon,
  CheckIcon,
} from '@/components/Icons';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

interface AccountMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; image: string | null };
}

interface TravelDoc {
  id: string;
  label: string;
  fieldType: 'text' | 'file';
  value: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  isDefault: boolean;
  createdAt: string;
}

export default function DocumentsPage() {
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<TravelDoc[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<TravelDoc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingField, setEditingField] = useState<{ id: string; value: string } | null>(null);
  const [savingField, setSavingField] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to load account');
      const accounts = await res.json();
      if (!accounts[0]) {
        setLoadingMembers(false);
        return;
      }
      const membersRes = await fetch(`/api/accounts/${accounts[0].id}/members`);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
        setSelectedUserId(data[0]?.user.id ?? null);
      }
    } catch {
      setError('Failed to load account members');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const fetchDocs = useCallback(async () => {
    if (!selectedUserId) return;
    setLoadingDocs(true);
    setError(null);
    try {
      const res = await fetch(`/api/user-travel-docs?userId=${selectedUserId}`);
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocs(data);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (selectedUserId) fetchDocs();
  }, [selectedUserId, fetchDocs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/user-travel-docs?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    } catch {
      setError('Failed to delete document');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSaveField = async () => {
    if (!editingField) return;
    setSavingField(true);
    try {
      const res = await fetch('/api/user-travel-docs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingField.id, value: editingField.value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingField(null);
    } catch {
      setError('Failed to save');
    } finally {
      setSavingField(false);
    }
  };

  const selectedMember = members.find((m) => m.user.id === selectedUserId);
  const textDocs = docs.filter((d) => d.fieldType === 'text');
  const fileDocs = docs.filter((d) => d.fieldType === 'file');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Documents
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Store essential travel details and documents for each person in your account — Global Entry numbers, TSA Pre-Check, birth dates, and more. All sensitive data is encrypted.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loadingMembers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : members.length === 0 ? (
          <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                No account members found.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Select Person
                </Typography>
                <List sx={{ display: 'flex', flexDirection: 'row', gap: 1, p: 0, flexWrap: 'wrap' }}>
                  {members.map((member) => {
                    const active = member.user.id === selectedUserId;
                    return (
                      <ListItem key={member.id} sx={{ width: 'auto', p: 0 }}>
                        <ListItemButton
                          onClick={() => setSelectedUserId(member.user.id)}
                          selected={active}
                          sx={{
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            border: 1,
                            borderColor: active ? 'primary.main' : 'divider',
                            bgcolor: active ? 'action.selected' : 'transparent',
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar
                              src={member.user.image || undefined}
                              sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}
                            >
                              {member.user.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={active ? 700 : 500}>
                                {member.user.name}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>

            {selectedMember && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={selectedMember.user.image || undefined}
                    sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                  >
                    {selectedMember.user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {selectedMember.user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedMember.user.email}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => {
                    setEditDoc(null);
                    setDialogOpen(true);
                  }}
                >
                  Add Field
                </Button>
              </Box>
            )}

            {loadingDocs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : docs.length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                    <DocumentsIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    No documents yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Default fields will appear here automatically.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={3}>
                {textDocs.length > 0 && (
                  <DocSection
                    title="Travel Details"
                    docs={textDocs}
                    onDelete={(id) => setDeleteId(id)}
                    onEdit={(doc) => {
                      setEditDoc(doc);
                      setDialogOpen(true);
                    }}
                    editingField={editingField}
                    onEditField={(id, value) => setEditingField({ id, value })}
                    onSaveField={handleSaveField}
                    onCancelEdit={() => setEditingField(null)}
                    savingField={savingField}
                  />
                )}
                {fileDocs.length > 0 && (
                  <DocSection
                    title="Files"
                    docs={fileDocs}
                    onDelete={(id) => setDeleteId(id)}
                    onEdit={(doc) => {
                      setEditDoc(doc);
                      setDialogOpen(true);
                    }}
                  />
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>

      <AddFieldDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditDoc(null);
        }}
        onSaved={() => {
          setDialogOpen(false);
          setEditDoc(null);
          fetchDocs();
        }}
        editDoc={editDoc}
        targetUserId={selectedUserId}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete field?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. The field and any associated file will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function DocSection({
  title,
  docs,
  onDelete,
  onEdit,
  editingField,
  onEditField,
  onSaveField,
  onCancelEdit,
  savingField,
}: {
  title: string;
  docs: TravelDoc[];
  onDelete: (id: string) => void;
  onEdit: (doc: TravelDoc) => void;
  editingField?: { id: string; value: string } | null;
  onEditField?: (id: string, value: string) => void;
  onSaveField?: () => void;
  onCancelEdit?: () => void;
  savingField?: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <NoteIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {docs.map((doc) => {
            const isEditing = editingField?.id === doc.id;
            return (
              <Stack
                key={doc.id}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {doc.label}
                    </Typography>
                    {doc.isDefault && (
                      <Chip label="Default" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </Stack>
                  {doc.fieldType === 'text' ? (
                    isEditing ? (
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
                        {doc.label === 'Birth Date' ? (
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              value={editingField?.value ? dayjs(editingField.value) : null}
                              onChange={(newDate: Dayjs | null) => onEditField?.(doc.id, newDate ? newDate.format('YYYY-MM-DD') : '')}
                              slotProps={{ textField: { size: 'small', autoFocus: true, sx: { flex: 1 } } }}
                            />
                          </LocalizationProvider>
                        ) : (
                          <TextField
                            size="small"
                            value={editingField?.value ?? ''}
                            onChange={(e) => onEditField?.(doc.id, e.target.value)}
                            autoFocus
                            sx={{ flex: 1 }}
                          />
                        )}
                        <IconButton size="small" onClick={onSaveField} disabled={savingField}>
                          {savingField ? <CircularProgress size={18} /> : <CheckIcon fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={onCancelEdit}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" fontWeight={500} sx={{ wordBreak: 'break-all' }}>
                          {doc.value ? (doc.label === 'Birth Date' ? dayjs(doc.value).format('MMM D, YYYY') : doc.value) : '—'}
                        </Typography>
                        <IconButton size="small" onClick={() => onEditField?.(doc.id, doc.value ?? '')}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1" fontWeight={500} noWrap>
                        {doc.fileName || '—'}
                      </Typography>
                      {doc.size != null && (
                        <Chip label={formatFileSize(doc.size)} size="small" variant="outlined" />
                      )}
                    </Stack>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5}>
                  {doc.fieldType === 'file' && doc.fileUrl && (
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        component="a"
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <NoteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!doc.isDefault && (
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(doc.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function AddFieldDialog({
  open,
  onClose,
  onSaved,
  editDoc,
  targetUserId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editDoc: TravelDoc | null;
  targetUserId: string | null;
}) {
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'file'>('text');
  const [textValue, setTextValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editDoc) {
        setLabel(editDoc.label);
        setFieldType(editDoc.fieldType);
        setTextValue(editDoc.value ?? '');
        setFile(null);
      } else {
        setLabel('');
        setFieldType('text');
        setTextValue('');
        setFile(null);
      }
      setError(null);
    }
  }, [open, editDoc]);

  const handleSave = async () => {
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (fieldType === 'text' && !textValue.trim()) {
      setError('Value is required');
      return;
    }
    if (fieldType === 'file' && !file && !editDoc) {
      setError('File is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editDoc) {
        if (fieldType === 'text') {
          const res = await fetch('/api/user-travel-docs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editDoc.id, label, value: textValue }),
          });
          if (!res.ok) throw new Error('Failed to save');
        } else if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('label', label);
          formData.append('targetUserId', targetUserId ?? '');
          const res = await fetch('/api/user-travel-docs', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to save');
          await fetch(`/api/user-travel-docs?id=${editDoc.id}`, { method: 'DELETE' });
        }
      } else {
        if (fieldType === 'text') {
          const res = await fetch('/api/user-travel-docs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, fieldType: 'text', value: textValue, targetUserId }),
          });
          if (!res.ok) throw new Error('Failed to save');
        } else {
          const formData = new FormData();
          formData.append('file', file!);
          formData.append('label', label);
          formData.append('targetUserId', targetUserId ?? '');
          const res = await fetch('/api/user-travel-docs', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to save');
        }
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editDoc ? 'Edit Field' : 'Add Field'}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Field Name"
            placeholder="e.g., Global Entry Number"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            fullWidth
            autoFocus
          />

          <FormControl>
            <FormLabel>Type</FormLabel>
            <RadioGroup
              row
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as 'text' | 'file')}
            >
              <FormControlLabel value="text" control={<Radio size="small" />} label="Text" />
              <FormControlLabel value="file" control={<Radio size="small" />} label="File Upload" />
            </RadioGroup>
          </FormControl>

          {fieldType === 'text' ? (
            label === 'Birth Date' ? (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Birth Date"
                  value={textValue ? dayjs(textValue) : null}
                  onChange={(newDate: Dayjs | null) => setTextValue(newDate ? newDate.format('YYYY-MM-DD') : '')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            ) : (
            <TextField
              label="Value"
              placeholder="e.g., 1234567890"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              fullWidth
              type="text"
            />
            )
          ) : (
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<NoteIcon fontSize="small" />}
                fullWidth
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {file ? file.name : editDoc?.fileName ?? 'Choose a file to upload'}
              </Button>
              {file && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatFileSize(file.size)} • Will be encrypted and stored securely
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : editDoc ? 'Save Changes' : 'Add Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSensitiveLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('number') ||
    lower.includes('passport') ||
    lower.includes('global entry') ||
    lower.includes('tsa') ||
    lower.includes('pre-check') ||
    lower.includes('precheck') ||
    lower.includes('known traveler') ||
    lower.includes('redress') ||
    lower.includes('birth') ||
    lower.includes('ssn') ||
    lower.includes('social security') ||
    lower.includes('password') ||
    lower.includes('secret')
  );
}

function maskValue(value: string): string {
  if (value.length <= 4) return '••••';
  return '•'.repeat(Math.min(value.length - 4, 12)) + value.slice(-4);
}
