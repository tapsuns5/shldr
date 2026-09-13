'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { AttachIcon } from '@/components/Icons';
import AddAttachmentDialog from './AddAttachmentDialog';
import AttachmentChips from './AttachmentChips';
import AttachmentPreviewDialog from './AttachmentPreviewDialog';
import type { TripDocument } from './types';

interface AttachmentsSectionProps {
  tripId: string;
  /** When set, only documents attached to this reservation are shown/managed. */
  reservationId?: string | null;
  /** Hide add/delete controls — display only. */
  readOnly?: boolean;
  /** Provide documents from a parent fetch instead of fetching here. */
  documents?: TripDocument[];
  /** Called after a document is added or removed. */
  onChanged?: () => void;
}

export default function AttachmentsSection({
  tripId,
  reservationId = null,
  readOnly = false,
  documents: providedDocs,
  onChanged,
}: AttachmentsSectionProps) {
  const [fetchedDocs, setFetchedDocs] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(!providedDocs);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<TripDocument | null>(null);

  const fetchDocs = useCallback(async () => {
    if (providedDocs) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/documents`);
      if (!res.ok) throw new Error('Failed to load attachments');
      const data: TripDocument[] = await res.json();
      setFetchedDocs(data);
    } catch {
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [tripId, providedDocs]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const allDocs = providedDocs ?? fetchedDocs;
  const docs = allDocs.filter((d) =>
    reservationId ? d.reservationId === reservationId : !d.reservationId
  );

  const handleChanged = () => {
    fetchDocs();
    onChanged?.();
  };

  const handleDelete = async (doc: TripDocument) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      if (!providedDocs) {
        setFetchedDocs((prev) => prev.filter((d) => d.id !== doc.id));
      }
      onChanged?.();
    } catch {
      setError('Failed to delete attachment');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Attachments
        </Typography>
        {!readOnly && (
          <Button
            size="small"
            startIcon={<AttachIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => setAddOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0 }}
          >
            Attach file
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={18} />
      ) : docs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No attachments yet.
        </Typography>
      ) : (
        <AttachmentChips
          documents={docs}
          onPreview={setPreview}
          onDelete={readOnly ? undefined : handleDelete}
        />
      )}

      <AddAttachmentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tripId={tripId}
        reservationId={reservationId}
        onAdded={handleChanged}
      />

      <AttachmentPreviewDialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        attachment={preview}
        onDelete={readOnly ? undefined : handleDelete}
      />
    </Box>
  );
}
