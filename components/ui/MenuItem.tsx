import { MenuItem as MuiMenuItem } from '@mui/material';
import type { MenuItemProps } from '@mui/material';

export function MenuItem(props: MenuItemProps) {
  return <MuiMenuItem {...props} />;
}
