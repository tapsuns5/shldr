import { Rating as MuiRating } from '@mui/material';
import type { RatingProps } from '@mui/material';

export function Rating(props: RatingProps) {
  return <MuiRating {...props} />;
}
