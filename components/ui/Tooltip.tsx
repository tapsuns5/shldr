import { Tooltip as MuiTooltip } from '@mui/material';
import type { TooltipProps } from '@mui/material';

export function Tooltip(props: TooltipProps) {
  return <MuiTooltip {...props} />;
}
