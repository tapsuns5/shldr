import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native-paper';
import { ProgressBar as PaperProgressBar, type ProgressBarProps } from 'react-native-paper';

export function CircularProgress(props: ActivityIndicatorProps) {
  return <ActivityIndicator {...props} />;
}

export function LinearProgress(props: ProgressBarProps) {
  return <PaperProgressBar {...props} />;
}
