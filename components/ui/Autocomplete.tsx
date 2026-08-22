import { Autocomplete as MuiAutocomplete } from '@mui/material';
import type { AutocompleteProps } from '@mui/material';

export function Autocomplete<T = unknown, Multiple extends boolean | undefined = undefined, DisableClearable extends boolean | undefined = undefined, FreeSolo extends boolean | undefined = undefined>(props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return <MuiAutocomplete {...props} />;
}
