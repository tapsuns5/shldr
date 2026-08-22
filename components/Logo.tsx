'use client';

import { Box, SxProps, Theme } from '@mui/material';

interface LogoProps {
  height?: number;
  alt?: string;
  sx?: SxProps<Theme>;
}

export default function Logo({ height = 32, alt = 'ShldrTravel', sx }: LogoProps) {
  return (
    <Box
      component="img"
      src="/shldr-light.svg"
      alt={alt}
      sx={{
        height,
        width: 'auto',
        display: 'block',
        ...sx,
      }}
    />
  );
}
