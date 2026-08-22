import { CircularProgress as MuiCircularProgress, LinearProgress as MuiLinearProgress } from '@mui/material';
import type { CircularProgressProps, LinearProgressProps } from '@mui/material';

export function CircularProgress(props: CircularProgressProps) {
  return <MuiCircularProgress {...props} />;
}

export function LinearProgress(props: LinearProgressProps) {
  return <MuiLinearProgress {...props} />;
}
