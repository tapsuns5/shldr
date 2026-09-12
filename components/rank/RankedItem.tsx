'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { AddIcon, DeleteIcon, DragHandleIcon, MoreHorizIcon, StarIcon } from '@/components/Icons';
import type { RankItem, RankTier } from '@/hooks/use-ranks';

interface RankedItemRowProps {
  item: RankItem;
  rank: number;
  tiers: RankTier[];
  onRemove: (rankKey: string) => void;
  onUpdateTier: (rankKey: string, tierId: string | null) => void;
}

const MEDAL_COLORS = ['#d4af37', '#a8a8a8', '#cd7f32'];

export default function RankedItemRow({
  item,
  rank,
  tiers,
  onRemove,
  onUpdateTier,
}: RankedItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.rankKey,
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : null;
  const tier = tiers.find((t) => t.id === item.tierId);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? 3 : 0,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
        '&::before': medalColor
          ? {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              bgcolor: medalColor,
            }
          : undefined,
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{ cursor: 'grab', color: 'text.secondary', touchAction: 'none' }}
        aria-label="Drag to reorder"
      >
        <DragHandleIcon sx={{ fontSize: 20 }} />
      </IconButton>

      <Box
        sx={{
          flexShrink: 0,
          width: { xs: 28, sm: 36 },
          height: { xs: 28, sm: 36 },
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: { xs: '0.9rem', sm: '1.1rem' },
          bgcolor: medalColor ? `${medalColor}22` : 'action.selected',
          color: medalColor ?? 'text.primary',
        }}
      >
        {rank}
      </Box>

      {item.image && (
        <Box
          component="img"
          src={item.image}
          alt=""
          sx={{
            width: { xs: 40, sm: 56 },
            height: { xs: 40, sm: 56 },
            borderRadius: 1.5,
            objectFit: 'cover',
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
          }}
        />
      )}

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {item.title}
          </Typography>
          {tier && (
            <Chip
              size="small"
              label={tier.label}
              sx={{
                height: 20,
                bgcolor: tier.color ?? undefined,
                color: tier.color ? '#fff' : undefined,
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {item.context}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {item.secondaryContext}
        </Typography>
        {item.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {item.tags.slice(0, 4).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
            ))}
          </Stack>
        )}
      </Box>

      <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Item actions">
        <MoreHorizIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { onRemove(item.rankKey); setMenuAnchor(null); }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText>Remove from ranking</ListItemText>
        </MenuItem>
        {tiers.length > 0 && [
          <MenuItem
            key="tier-none"
            onClick={() => { onUpdateTier(item.rankKey, null); setMenuAnchor(null); }}
            selected={!item.tierId}
          >
            <ListItemText inset>No tier</ListItemText>
          </MenuItem>,
          ...tiers.map((t) => (
            <MenuItem
              key={t.id}
              onClick={() => { onUpdateTier(item.rankKey, t.id); setMenuAnchor(null); }}
              selected={item.tierId === t.id}
            >
              <ListItemIcon>
                <StarIcon sx={{ fontSize: 18, color: t.color ?? undefined }} />
              </ListItemIcon>
              <ListItemText primary={t.label} secondary={t.description} />
            </MenuItem>
          )),
        ]}
      </Menu>
    </Box>
  );
}
