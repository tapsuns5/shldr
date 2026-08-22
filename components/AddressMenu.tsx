'use client';

import { useState } from 'react';
import { Menu, MenuItem, Typography } from '@mui/material';

interface AddressMenuProps {
  address: string;
  children?: React.ReactNode;
}

export default function AddressMenu({ address, children }: AddressMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank',
      'noopener,noreferrer',
    );
    handleClose();
  };

  const openAppleMaps = () => {
    window.open(
      `https://maps.apple.com/?q=${encodeURIComponent(address)}`,
      '_blank',
      'noopener,noreferrer',
    );
    handleClose();
  };

  return (
    <>
      <Typography
        component="span"
        variant="body2"
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOpen(e as unknown as React.MouseEvent<HTMLElement>);
          }
        }}
        sx={{
          color: 'primary.main',
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {children ?? address}
      </Typography>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={openGoogleMaps}>Open in Google Maps</MenuItem>
        <MenuItem onClick={openAppleMaps}>Open in Apple Maps</MenuItem>
      </Menu>
    </>
  );
}
