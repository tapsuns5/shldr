'use client';

import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import { AddIcon } from '@/components/Icons';
import type { RankItem } from '@/hooks/use-ranks';

interface UnrankedListProps {
  unranked: RankItem[];
  onAdd: (rankKey: string) => void;
}

export default function UnrankedList({ unranked, onAdd }: UnrankedListProps) {
  if (unranked.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="overline" color="text.secondary" sx={{ ml: 1 }}>
        Not ranked yet · {unranked.length}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {unranked.map((item) => (
          <Box
            key={item.rankKey}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.25,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'action.hover',
            }}
          >
            {item.image && (
              <Box
                component="img"
                src={item.image}
                alt=""
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  objectFit: 'cover',
                  flexShrink: 0,
                  display: { xs: 'none', sm: 'block' },
                }}
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
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => onAdd(item.rankKey)}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
            >
              Add
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
