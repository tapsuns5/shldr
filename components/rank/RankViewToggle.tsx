'use client';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ListIcon, TierIcon } from '@/components/Icons';

export type RankDisplayView = 'ranking' | 'tiers';

interface RankViewToggleProps {
  value: RankDisplayView;
  onChange: (value: RankDisplayView) => void;
}

export default function RankViewToggle({ value, onChange }: RankViewToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      size="small"
      onChange={(_, next) => next && onChange(next as RankDisplayView)}
      sx={{
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          fontWeight: 600,
          px: 2,
          py: 0.5,
          border: 1,
          borderColor: 'divider',
          gap: 1,
        },
      }}
    >
      <ToggleButton value="ranking" aria-label="Ranked list view">
        <ListIcon sx={{ fontSize: 18 }} /> Ranking
      </ToggleButton>
      <ToggleButton value="tiers" aria-label="Tier board view">
        <TierIcon sx={{ fontSize: 18 }} /> Tiers
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
