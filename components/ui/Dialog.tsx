import { Dialog as MuiDialog } from '@mui/material';
import type { DialogProps } from '@mui/material';

export function Dialog(props: DialogProps) {
  return <MuiDialog {...props} />;
}
