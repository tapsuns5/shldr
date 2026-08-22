import { Modal as MuiModal } from '@mui/material';
import type { ModalProps } from '@mui/material';

export function Modal(props: ModalProps) {
  return <MuiModal {...props} />;
}
