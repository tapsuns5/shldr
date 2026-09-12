'use client';

import { Box, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { AddIcon, MoreHorizIcon, StarIcon } from '@/components/Icons';
import type { RankItem, RankTier } from '@/hooks/use-ranks';

interface TierBoardProps {
  ranked: RankItem[];
  unranked: RankItem[];
  tiers: RankTier[];
  onAddToRanking: (rankKey: string) => void;
  onUpdateTier: (rankKey: string, tierId: string | null) => void;
}

export default function TierBoard({
  ranked,
  unranked,
  tiers,
  onAddToRanking,
  onUpdateTier,
}: TierBoardProps) {
  const sections = [
    ...tiers.map((tier) => ({
      tier,
      items: ranked.filter((item) => item.tierId === tier.id),
    })),
    { tier: null, items: unranked },
  ];

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      {sections.map(({ tier, items }) => (
        <TierSection
          key={tier?.id ?? 'unranked'}
          tier={tier}
          items={items}
          allTiers={tiers}
          onAddToRanking={onAddToRanking}
          onUpdateTier={onUpdateTier}
        />
      ))}
    </Stack>
  );
}

interface TierSectionProps {
  tier: RankTier | null;
  items: RankItem[];
  allTiers: RankTier[];
  onAddToRanking: (rankKey: string) => void;
  onUpdateTier: (rankKey: string, tierId: string | null) => void;
}

function TierSection({ tier, items, allTiers, onAddToRanking, onUpdateTier }: TierSectionProps) {
  const isUnranked = tier === null;
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          bgcolor: tier?.color ? `${tier.color}1a` : 'action.hover',
          borderBottom: items.length > 0 ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        {tier?.color && (
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: tier.color }} />
        )}
        <Typography variant="subtitle1" fontWeight={700}>
          {tier?.label ?? 'Unranked'}
        </Typography>
        {tier?.description && (
          <Typography variant="body2" color="text.secondary">
            — {tier.description}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Chip size="small" label={items.length} sx={{ fontWeight: 600 }} />
      </Box>
      {items.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isUnranked ? 'Everything is ranked.' : 'No items in this tier.'}
          </Typography>
        </Box>
      ) : (
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {items.map((item) => (
            <TierItemRow
              key={item.rankKey}
              item={item}
              tiers={allTiers}
              isUnranked={isUnranked}
              onAddToRanking={onAddToRanking}
              onUpdateTier={onUpdateTier}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

interface TierItemRowProps {
  item: RankItem;
  tiers: RankTier[];
  isUnranked: boolean;
  onAddToRanking: (rankKey: string) => void;
  onUpdateTier: (rankKey: string, tierId: string | null) => void;
}

function TierItemRow({ item, tiers, isUnranked, onAddToRanking, onUpdateTier }: TierItemRowProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25 }}>
      {item.image && (
        <Box
          component="img"
          src={item.image}
          alt=""
          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
        />
      )}
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {item.context}
        </Typography>
      </Box>
      {item.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          {item.tags.slice(0, 2).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          ))}
        </Stack>
      )}
      {isUnranked ? (
        <IconButton size="small" onClick={() => onAddToRanking(item.rankKey)} aria-label="Add to ranking">
          <AddIcon sx={{ fontSize: 20 }} />
        </IconButton>
      ) : (
        <>
          <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Change tier">
            <MoreHorizIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => { onUpdateTier(item.rankKey, null); setAnchor(null); }} selected={!item.tierId}>
              <ListItemText inset>No tier</ListItemText>
            </MenuItem>
            {tiers.map((t) => (
              <MenuItem
                key={t.id}
                onClick={() => { onUpdateTier(item.rankKey, t.id); setAnchor(null); }}
                selected={item.tierId === t.id}
              >
                <ListItemIcon>
                  <StarIcon sx={{ fontSize: 18, color: t.color ?? undefined }} />
                </ListItemIcon>
                <ListItemText primary={t.label} secondary={t.description} />
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
}
