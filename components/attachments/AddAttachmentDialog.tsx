'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { FileIcon, LinkIcon, UploadIcon } from '@/components/Icons';

interface AddAttachmentDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  /** When set, the attachment is linked to this reservation instead of the trip. */
  reservationId?: string | null;
  onAdded: () => void;
}

export default function AddAttachmentDialog({
  open,
  onClose,
  tripId,
  reservationId = null,
  onAdded,
}: AddAttachmentDialogProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode('upload');
      setFile(null);
      setFileUrl('');
      setFileName('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const formData = new FormData();
    if (reservationId) formData.append('reservationId', reservationId);

    if (mode === 'upload') {
      if (!file) {
        setError('Choose a file to upload');
        return;
      }
      formData.append('file', file);
    } else {
      if (!fileUrl.trim()) {
        setError('Enter a file URL');
        return;
      }
      formData.append('fileUrl', fileUrl.trim());
      if (fileName.trim()) formData.append('fileName', fileName.trim());
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to attach file');
      }
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Attach file</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <RadioGroup row value={mode} onChange={(_, v) => setMode(v as 'upload' | 'url')}>
            <FormControlLabel value="upload" control={<Radio size="small" />} label="Upload" />
            <FormControlLabel value="url" control={<Radio size="small" />} label="File URL" />
          </RadioGroup>

          {mode === 'upload' ? (
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={file ? <FileIcon sx={{ fontSize: 18 }} /> : <UploadIcon sx={{ fontSize: 18 }} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start' }}
              >
                {file ? file.name : 'Choose a file'}
              </Button>
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                label="File URL"
                placeholder="https://example.com/boarding-pass.pdf"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <LinkIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
                  },
                }}
              />
              <TextField
                fullWidth
                label="Name (optional)"
                placeholder="Boarding pass"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? 'Attaching...' : 'Attach'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
