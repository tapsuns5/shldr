'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { DeleteIcon, FileIcon, LinkIcon } from '@/components/Icons';
import type { TripDocument } from './types';

interface AttachmentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  attachment: TripDocument | null;
  onDelete?: (doc: TripDocument) => void;
}

function previewKind(attachment: TripDocument): 'image' | 'iframe' | 'other' {
  const { mimeType, fileName, fileUrl } = attachment;
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    /\.(pdf|txt|html?|csv)$/i.test(fileName) ||
    /\.(pdf|txt|html?|csv)(?:[?#]|$)/i.test(fileUrl)
  ) {
    return 'iframe';
  }
  return 'other';
}

export default function AttachmentPreviewDialog({
  open,
  onClose,
  attachment,
  onDelete,
}: AttachmentPreviewDialogProps) {
  const [confirmingForId, setConfirmingForId] = useState<string | null>(null);

  if (!attachment) return null;
  const kind = previewKind(attachment);
  const confirming = confirmingForId === attachment.id;

  const handleClose = () => {
    setConfirmingForId(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: { xs: '70vh', sm: '80vh' } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileIcon sx={{ fontSize: 20 }} />
        <Typography component="span" variant="inherit" noWrap sx={{ minWidth: 0 }}>
          {attachment.fileName}
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
        }}
      >
        {kind === 'image' ? (
          <Box
            component="img"
            src={attachment.fileUrl}
            alt={attachment.fileName}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : kind === 'iframe' ? (
          <iframe
            src={attachment.fileUrl}
            title={attachment.fileName}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <FileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {attachment.fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This file can&apos;t be previewed here.
            </Typography>
            <Button
              variant="contained"
              component="a"
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LinkIcon sx={{ fontSize: 18 }} />}
              sx={{ textTransform: 'none' }}
            >
              Open file
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {onDelete && (
          <Button
            color="error"
            variant={confirming ? 'contained' : 'text'}
            startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
            onClick={() => {
              if (confirming) {
                onDelete(attachment);
                handleClose();
              } else {
                setConfirmingForId(attachment.id);
              }
            }}
            sx={{ textTransform: 'none' }}
          >
            {confirming ? 'Confirm delete' : 'Delete'}
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          component="a"
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textTransform: 'none' }}
        >
          Open in new tab
        </Button>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
