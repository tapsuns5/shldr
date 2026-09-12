'use client';

import { useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { SettingsIcon, StarIcon } from '@/components/Icons';
import RankedList from './RankedList';
import UnrankedList from './UnrankedList';
import TierBoard from './TierBoard';
import RankViewToggle, { type RankDisplayView } from './RankViewToggle';
import RankTiersDialog from '../RankTiersDialog';
import AssistedRankDialog from './AssistedRankDialog';
import { useRanks, type RankView } from '@/hooks/use-ranks';

const VIEW_LABELS: Record<RankView, string> = {
  trips: 'Trips',
  restaurants: 'Restaurants',
  cities: 'Cities',
  hotels: 'Hotels',
  activities: 'Activities',
};

const VIEW_HINTS: Record<RankView, string> = {
  trips: 'Drag to rank your favorite trips.',
  restaurants: 'Drag to rank restaurants you have visited.',
  cities: 'Drag to rank cities you have been to.',
  hotels: 'Drag to rank hotels you have stayed at.',
  activities: 'Drag to rank activities you have experienced.',
};

interface RankExperienceProps {
  accountId: string;
  view: RankView;
}

export default function RankExperience({ accountId, view }: RankExperienceProps) {
  const {
    ranked,
    unranked,
    tiers,
    counts,
    loading,
    error,
    moveRankedItem,
    applyAssistedRanking,
    addToRanking,
    removeFromRanking,
    updateItem,
    addTier,
    updateTier,
    deleteTier,
  } = useRanks(accountId, view);

  const [displayView, setDisplayView] = useState<RankDisplayView>('ranking');
  const [tiersDialogOpen, setTiersDialogOpen] = useState(false);
  const [assistedDialogOpen, setAssistedDialogOpen] = useState(false);

  if (loading && counts.total === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button size="small" sx={{ mt: 1 }} onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Your {VIEW_LABELS[view]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {VIEW_HINTS[view]} · {counts.ranked} ranked · {counts.unranked} not ranked
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<StarIcon sx={{ fontSize: 18 }} />}
            onClick={() => setAssistedDialogOpen(true)}
            disabled={counts.total < 3}
            title={counts.total < 3 ? 'Add at least three items to use assisted ranking' : undefined}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Help me rank
          </Button>
          <RankViewToggle value={displayView} onChange={setDisplayView} />
          <IconButton
            size="small"
            onClick={() => setTiersDialogOpen(true)}
            aria-label="Manage tiers"
            title="Manage tiers"
          >
            <SettingsIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Stack>

      {displayView === 'ranking' ? (
        <>
          <RankedList
            ranked={ranked}
            tiers={tiers}
            onReorder={moveRankedItem}
            onRemove={removeFromRanking}
            onUpdateTier={(rankKey, tierId) => updateItem(rankKey, { tierId })}
          />
          <UnrankedList unranked={unranked} onAdd={addToRanking} />
        </>
      ) : (
        <TierBoard
          ranked={ranked}
          unranked={unranked}
          tiers={tiers}
          onAddToRanking={addToRanking}
          onUpdateTier={(rankKey, tierId) => updateItem(rankKey, { tierId })}
        />
      )}

      <AssistedRankDialog
        open={assistedDialogOpen}
        onClose={() => setAssistedDialogOpen(false)}
        view={view}
        ranked={ranked}
        unranked={unranked}
        onApply={applyAssistedRanking}
      />

      <RankTiersDialog
        open={tiersDialogOpen}
        onClose={() => setTiersDialogOpen(false)}
        tiers={tiers}
        onAdd={(label, sortOrder, color) => addTier(label, sortOrder, color)}
        onUpdate={updateTier}
        onDelete={deleteTier}
      />
    </Box>
  );
}
