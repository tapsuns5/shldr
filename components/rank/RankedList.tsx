'use client';

import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Box, Typography } from '@mui/material';
import RankedItemRow from './RankedItem';
import type { RankItem, RankTier } from '@/hooks/use-ranks';

interface RankedListProps {
  ranked: RankItem[];
  tiers: RankTier[];
  onReorder: (activeKey: string, overKey: string) => void;
  onRemove: (rankKey: string) => void;
  onUpdateTier: (rankKey: string, tierId: string | null) => void;
}

export default function RankedList({ ranked, tiers, onReorder, onRemove, onUpdateTier }: RankedListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  if (ranked.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No items ranked yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add items from the &ldquo;Not ranked yet&rdquo; section below.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ ml: 1 }}>
        Your ranking · {ranked.length}
      </Typography>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={ranked.map((item) => item.rankKey)} strategy={verticalListSortingStrategy}>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mt: 1 }}>
            {ranked.map((item, index) => (
              <RankedItemRow
                key={item.rankKey}
                item={item}
                rank={index + 1}
                tiers={tiers}
                onRemove={onRemove}
                onUpdateTier={onUpdateTier}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
      {activeId && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, ml: 1 }}>
          Dragging… release to drop.
        </Typography>
      )}
    </Box>
  );
}
