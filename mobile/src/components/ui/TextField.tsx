import { TextInput as PaperTextInput, type TextInputProps } from 'react-native-paper';

export function TextField(props: TextInputProps) {
  return <PaperTextInput mode="outlined" {...props} />;
}
