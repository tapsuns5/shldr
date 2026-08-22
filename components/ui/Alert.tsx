import { Alert as MuiAlert } from '@mui/material';
import type { AlertProps } from '@mui/material';

export function Alert(props: AlertProps) {
  return <MuiAlert {...props} />;
}
