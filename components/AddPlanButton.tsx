'use client';

import { useState } from 'react';
import {
  Button,
  Popover,
  Paper,
  Grid,
  Stack,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  AddIcon,
  FlightIcon,
  CarIcon,
  HotelIcon,
  RailIcon,
  BusIcon,
  RestaurantIcon,
  NoteIcon,
  ActivityIcon,
  TheaterIcon,
  ConcertIcon,
  ParkingIcon,
  CruiseIcon,
  DirectionsIcon,
  FerryIcon,
  TourIcon,
  MeetingIcon,
  MapIcon,
} from '@/components/Icons';

export type PlanType =
  | 'activity'
  | 'flight'
  | 'lodging'
  | 'car'
  | 'note'
  | 'concert'
  | 'parking'
  | 'cruise'
  | 'rail'
  | 'directions'
  | 'restaurant'
  | 'ferry'
  | 'theater'
  | 'map'
  | 'tour'
  | 'meeting'
  | 'transportation';

interface AddPlanButtonProps {
  onSelect: (type: PlanType, defaultDate?: string) => void;
  size?: 'small' | 'medium';
  defaultDate?: string;
}

const PLAN_OPTIONS: { type: PlanType; label: string; icon: React.ReactNode }[] = [
  { type: 'activity', label: 'Activity', icon: <ActivityIcon /> },
  { type: 'flight', label: 'Flight', icon: <FlightIcon /> },
  { type: 'lodging', label: 'Lodging', icon: <HotelIcon /> },
  { type: 'car', label: 'Car Rental', icon: <CarIcon /> },
  { type: 'note', label: 'Note', icon: <NoteIcon /> },
  { type: 'concert', label: 'Concert', icon: <ConcertIcon /> },
  { type: 'parking', label: 'Parking', icon: <ParkingIcon /> },
  { type: 'cruise', label: 'Cruise', icon: <CruiseIcon /> },
  { type: 'rail', label: 'Rail', icon: <RailIcon /> },
  { type: 'directions', label: 'Directions', icon: <DirectionsIcon /> },
  { type: 'restaurant', label: 'Restaurant', icon: <RestaurantIcon /> },
  { type: 'ferry', label: 'Ferry', icon: <FerryIcon /> },
  { type: 'theater', label: 'Theater', icon: <TheaterIcon /> },
  { type: 'map', label: 'Map', icon: <MapIcon /> },
  { type: 'tour', label: 'Tour', icon: <TourIcon /> },
  { type: 'meeting', label: 'Meeting', icon: <MeetingIcon /> },
  { type: 'transportation', label: 'Transportation', icon: <BusIcon /> },
];

export default function AddPlanButton({ onSelect, size = 'medium', defaultDate }: AddPlanButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (type: PlanType) => {
    onSelect(type, defaultDate);
    handleClose();
  };

  return (
    <>
      {size === 'small' ? (
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{
            borderRadius: 10,
            color: 'primary.main',
            borderColor: 'divider',
            bgcolor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Add a Plan
        </Button>
      ) : (
        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ bgcolor: 'white', color: 'primary.main', borderRadius: '50%', p: 0.1 }} />}
          onClick={handleOpen}
          sx={{
            borderRadius: 10,
            px: 3,
            py: 1.5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            bgcolor: 'white',
            color: 'primary.main',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Add a Plan
        </Button>
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: 360 } } }}
      >
        <Grid container spacing={2}>
          {PLAN_OPTIONS.map((option) => (
            <Grid size={6} key={option.type}>
              <IconButton
                onClick={() => handleSelect(option.type)}
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}
                >
                  {option.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {option.label}
                </Typography>
              </IconButton>
            </Grid>
          ))}
        </Grid>
      </Popover>
    </>
  );
}
