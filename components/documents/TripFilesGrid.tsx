'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { DeleteIcon, FileIcon, TripsIcon } from '@/components/Icons';
import AttachmentPreviewDialog from '@/components/attachments/AttachmentPreviewDialog';
import type { TripDocument } from '@/components/attachments/types';

interface TripDocumentWithRefs extends TripDocument {
  trip: { id: string; title: string } | null;
  reservation: { id: string; title: string } | null;
}

function isImage(doc: TripDocument): boolean {
  return doc.mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.fileName);
}

function formatFileSize(size: number): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TripFilesGrid() {
  const [docs, setDocs] = useState<TripDocumentWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TripDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) throw new Error('Failed to load files');
        const data: TripDocumentWithRefs[] = await res.json();
        if (!cancelled) setDocs(data);
      } catch {
        if (!cancelled) setError('Failed to load trip files');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (doc: TripDocument) => {
    try {
      const res = await fetch(`/api/trips/${doc.tripId}/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      setError('Failed to delete attachment');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (docs.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <FileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No trip files yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Attach files to a trip or a plan and they will show up here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {docs.map((doc) => (
          <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              variant="outlined"
              onClick={() => setPreview(doc)}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                height: '100%',
                '&:hover': { boxShadow: 2 },
              }}
            >
              <Box
                sx={{
                  height: 140,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {isImage(doc) ? (
                  <Box
                    component="img"
                    src={doc.fileUrl}
                    alt={doc.fileName}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <FileIcon sx={{ fontSize: 44, color: 'text.secondary' }} />
                )}
                <IconButton
                  size="small"
                  aria-label="Delete file"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" fontWeight={600} noWrap title={doc.fileName}>
                  {doc.fileName}
                </Typography>
                {doc.size > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(doc.size)}
                  </Typography>
                )}
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {doc.trip && (
                    <Link
                      component={NextLink}
                      href={`/tripdetails/${doc.trip.id}`}
                      variant="caption"
                      underline="hover"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}
                    >
                      <TripsIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                      <Box
                        component="span"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                      >
                        {doc.trip.title}
                      </Box>
                    </Link>
                  )}
                  {doc.trip && doc.reservation && (
                    <Link
                      component={NextLink}
                      href={`/tripdetails/${doc.trip.id}/event/${doc.reservation.id}`}
                      variant="caption"
                      underline="hover"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                    >
                      <FileIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                      <Box
                        component="span"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                      >
                        {doc.reservation.title}
                      </Box>
                    </Link>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <AttachmentPreviewDialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        attachment={preview}
        onDelete={handleDelete}
      />
    </>
  );
}
