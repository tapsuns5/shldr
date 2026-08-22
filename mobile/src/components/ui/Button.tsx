import { Button as PaperButton, type ButtonProps as PaperButtonProps } from 'react-native-paper';

interface ButtonProps extends Omit<PaperButtonProps, 'mode'> {
  variant?: 'contained' | 'outlined' | 'text';
}

const VARIANT_MAP: Record<NonNullable<ButtonProps['variant']>, PaperButtonProps['mode']> = {
  contained: 'contained',
  outlined: 'outlined',
  text: 'text',
};

export function Button({ variant = 'contained', ...props }: ButtonProps) {
  return <PaperButton mode={VARIANT_MAP[variant]} {...props} />;
}
