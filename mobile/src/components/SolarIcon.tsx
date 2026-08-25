import rawSolar from '@iconify-json/solar/icons.json';
import { SvgXml } from 'react-native-svg';

type SolarIconSet = {
  icons: Record<string, { body: string; width?: number; height?: number }>;
};

type SolarIconProps = {
  name: string;
  size?: number;
  color?: string;
};

const solar = rawSolar as SolarIconSet;

export function SolarIcon({ name, size = 24, color = 'currentColor' }: SolarIconProps) {
  const icon = solar.icons[name];
  if (!icon) return null;

  const body = icon.body.replaceAll('currentColor', color);
  const width = icon.width ?? 24;
  const height = icon.height ?? 24;

  return <SvgXml xml={`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`} width={size} height={size} />;
}
