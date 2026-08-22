import { Select as MuiSelect } from '@mui/material';
import type { SelectProps } from '@mui/material';

export function Select<T = unknown>(props: SelectProps<T>) {
  return <MuiSelect {...props} />;
}
