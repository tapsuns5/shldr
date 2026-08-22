import { Card as MuiCard } from '@mui/material';
import type { CardProps } from '@mui/material';

export function Card(props: CardProps) {
  return <MuiCard {...props} />;
}
