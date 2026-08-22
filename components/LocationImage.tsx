'use client';

import { useState, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@/components/Icons';
import { getLocationImage, type LocationDisplayMode } from '../lib/location-image';

interface LocationImageProps {
  locations: string[];
  fallbackImage: string;
  displayMode?: LocationDisplayMode;
  width?: number | string | { xs?: number | string; sm?: number | string; md?: number | string };
  height?: number | string | { xs?: number | string; sm?: number | string; md?: number | string };
  borderRadius?: number;
}

export default function LocationImage({
  locations,
  fallbackImage,
  displayMode = 'map',
  width = 300,
  height,
  borderRadius = 0,
}: LocationImageProps) {
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgError(false);
    setIndex((prev) => (prev - 1 + locations.length) % locations.length);
  }, [locations.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgError(false);
    setIndex((prev) => (prev + 1) % locations.length);
  }, [locations.length]);

  const currentLocation = locations[index];
  const computedUrl = getLocationImage(currentLocation, fallbackImage, displayMode);
  const imageUrl = imgError ? fallbackImage : computedUrl;
  const hasMultiple = locations.length > 1;

  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        alignSelf: 'stretch',
      }}
    >
      {/* Hidden img to detect load errors for the API-proxied photo */}
      {computedUrl !== fallbackImage && !imgError && (
        <img
          src={computedUrl}
          alt=""
          style={{ display: 'none' }}
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
        />
      )}
      {hasMultiple && (
        <>
          <IconButton
            onClick={handlePrev}
            size="small"
            sx={{
              position: 'absolute',
              left: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              bgcolor: 'rgba(255,255,255,0.7)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              '&:active': { transform: 'translateY(-50%)' },
              zIndex: 1,
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton
            onClick={handleNext}
            size="small"
            sx={{
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              bgcolor: 'rgba(255,255,255,0.7)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              '&:active': { transform: 'translateY(-50%)' },
              zIndex: 1,
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              borderRadius: 1,
              px: 1,
              py: 0.25,
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              {index + 1} / {locations.length}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
