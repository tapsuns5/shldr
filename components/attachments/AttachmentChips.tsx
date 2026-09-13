'use client';

import { Chip, Stack } from '@mui/material';
import { AttachIcon, CloseIcon } from '@/components/Icons';
import type { TripDocument } from './types';

interface AttachmentChipsProps {
  documents: TripDocument[];
  onPreview: (doc: TripDocument) => void;
  onDelete?: (doc: TripDocument) => void;
  size?: 'small' | 'medium';
}

export default function AttachmentChips({ documents, onPreview, onDelete, size = 'small' }: AttachmentChipsProps) {
  if (documents.length === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {documents.map((doc) => (
        <Chip
          key={doc.id}
          size={size}
          icon={<AttachIcon sx={{ fontSize: '1rem !important' }} />}
          label={doc.fileName}
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(doc);
          }}
          onDelete={
            onDelete
              ? (e) => {
                  e.stopPropagation();
                  onDelete(doc);
                }
              : undefined
          }
          deleteIcon={<CloseIcon />}
          sx={{
            maxWidth: '100%',
            cursor: 'pointer',
            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />
      ))}
    </Stack>
  );
}
