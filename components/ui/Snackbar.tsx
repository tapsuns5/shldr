import { Snackbar as MuiSnackbar } from '@mui/material';
import type { SnackbarProps } from '@mui/material';

export function Snackbar(props: SnackbarProps) {
  return <MuiSnackbar {...props} />;
}
