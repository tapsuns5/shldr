import { Dialog as PaperDialog, Portal } from 'react-native-paper';
import type { ReactNode } from 'react';

export function Dialog({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <Portal>
      <PaperDialog visible={visible} onDismiss={onDismiss}>
        {children}
      </PaperDialog>
    </Portal>
  );
}

export const DialogTitle = PaperDialog.Title;
export const DialogContent = PaperDialog.Content;
export const DialogActions = PaperDialog.Actions;
