'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AddIcon, DeleteIcon, ExpandMoreIcon } from '@/components/Icons';
import type { RankTier } from '@/hooks/use-ranks';

interface RankTiersDialogProps {
  open: boolean;
  onClose: () => void;
  tiers: RankTier[];
  onAdd: (label: string, sortOrder: number, color?: string, description?: string) => Promise<unknown>;
  onUpdate: (
    id: string,
    updates: { label?: string; description?: string | null; sortOrder?: number; color?: string | null },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

export default function RankTiersDialog({
  open,
  onClose,
  tiers,
  onAdd,
  onUpdate,
  onDelete,
}: RankTiersDialogProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const sortOrder = tiers.length > 0 ? Math.max(...tiers.map((t) => t.sortOrder)) + 1 : 0;
      await onAdd(newLabel.trim(), sortOrder, newColor.trim() || undefined, newDescription.trim() || undefined);
      setNewLabel('');
      setNewColor('');
      setNewDescription('');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (tier: RankTier, delta: number) => {
    const idx = tiers.findIndex((t) => t.id === tier.id);
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= tiers.length) return;
    const swapTarget = tiers[swapIdx];
    await onUpdate(tier.id, { sortOrder: swapTarget.sortOrder });
    await onUpdate(swapTarget.id, { sortOrder: tier.sortOrder });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Manage Tiers</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {tiers.map((tier, idx) => (
            <Stack key={tier.id} direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: tier.color ?? 'transparent',
                  border: tier.color ? 'none' : '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              />
              <TextField
                size="small"
                value={tier.label}
                onChange={(e) => onUpdate(tier.id, { label: e.target.value })}
                sx={{ width: 90 }}
              />
              <TextField
                size="small"
                type="color"
                value={tier.color ?? '#cccccc'}
                onChange={(e) => onUpdate(tier.id, { color: e.target.value })}
                sx={{ width: 56, '& input': { padding: 0, height: 28 } }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" disabled={idx === 0} onClick={() => handleMove(tier, -1)}>
                  <ExpandMoreIcon sx={{ transform: 'rotate(180deg)', fontSize: 18 }} />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={idx === tiers.length - 1}
                  onClick={() => handleMove(tier, 1)}
                >
                  <ExpandMoreIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => onDelete(tier.id)}>
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Stack>
          ))}
          {tiers.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No tiers yet. Add one below.
            </Typography>
          )}
        </Stack>

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Add tier
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                sx={{ width: 120 }}
              />
              <TextField
                size="small"
                type="color"
                value={newColor || '#cccccc'}
                onChange={(e) => setNewColor(e.target.value)}
                sx={{ width: 56, '& input': { padding: 0, height: 28 } }}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={handleAdd}
                disabled={saving || !newLabel.trim()}
                size="small"
              >
                Add
              </Button>
            </Stack>
            <TextField
              size="small"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              fullWidth
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
