'use client';

import { useState } from 'react';
import { ToggleButtonGroup, ToggleButton, Button, Stack, Box } from '@mui/material';
import { AddIcon } from '@/components/Icons';
import AddTripDialog from './AddTripDialog';

interface SubTabsProps {
  value: number;
  onChange: (event: React.MouseEvent<HTMLElement>, newValue: number) => void;
  accountId: string;
  onTripCreated?: (trip: any) => void;
}

export default function SubTabs({ value, onChange, accountId, onTripCreated }: SubTabsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      justifyContent="space-between" 
      alignItems={{ xs: 'stretch', sm: 'center' }} 
      sx={{ mb: { xs: 3, sm: 4 } }}
      spacing={{ xs: 2, sm: 0 }}
    >
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newValue) => newValue !== null && onChange(_, newValue)}
        aria-label="trip switcher"
        sx={{
          justifyContent: { xs: 'center', sm: 'flex-start' },
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2, sm: 3 },
            py: 1,
            border: 1,
            borderColor: 'divider',
            fontSize: { xs: '0.875rem', sm: '1rem' },
            minWidth: { xs: 'auto', sm: '120px' },
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            },
          },
        }}
      >
        <ToggleButton value={0} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Upcoming</ToggleButton>
        <ToggleButton value={1} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Active</ToggleButton>
        <ToggleButton value={2} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Past</ToggleButton>
        <ToggleButton value={3} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Uncategorized</ToggleButton>
      </ToggleButtonGroup>
      <Button
        startIcon={<AddIcon sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '50%', p: 0.2 }} />}
        sx={{ 
          color: 'primary.main', 
          fontWeight: 600,
          px: { xs: 2, sm: 2 },
          py: { xs: 1, sm: 1 },
          fontSize: { xs: '0.875rem', sm: '1rem' },
          alignSelf: { xs: 'stretch', sm: 'auto' },
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}
        onClick={() => setDialogOpen(true)}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Add a Trip</Box>
        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Add Trip</Box>
      </Button>
    </Stack>

    <AddTripDialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      accountId={accountId}
      onTripCreated={onTripCreated}
    />
    </>
  );
}
