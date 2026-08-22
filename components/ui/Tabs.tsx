import { Tabs as MuiTabs, Tab as MuiTab } from '@mui/material';
import type { TabsProps, TabProps } from '@mui/material';

export function Tabs(props: TabsProps) {
  return <MuiTabs {...props} />;
}

export function Tab(props: TabProps) {
  return <MuiTab {...props} />;
}
