import { Skeleton as MuiSkeleton } from '@mui/material';
import type { SkeletonProps } from '@mui/material';

export function Skeleton(props: SkeletonProps) {
  return <MuiSkeleton {...props} />;
}
