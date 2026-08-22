import { Backdrop as MuiBackdrop } from '@mui/material';
import type { BackdropProps } from '@mui/material';

export function Backdrop(props: BackdropProps) {
  return <MuiBackdrop {...props} />;
}
