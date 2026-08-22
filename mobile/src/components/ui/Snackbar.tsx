import { Snackbar as PaperSnackbar, type SnackbarProps } from 'react-native-paper';

export function Snackbar(props: SnackbarProps) {
  return <PaperSnackbar duration={4000} {...props} />;
}
