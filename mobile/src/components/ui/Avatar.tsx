import { Avatar as PaperAvatar } from 'react-native-paper';

export function Avatar({
  source,
  label,
  size = 40,
}: {
  source?: string | null;
  label: string;
  size?: number;
}) {
  if (source) {
    return <PaperAvatar.Image source={{ uri: source }} size={size} />;
  }
  return <PaperAvatar.Text label={label.slice(0, 2).toUpperCase()} size={size} />;
}
