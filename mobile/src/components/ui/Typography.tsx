import { Text as PaperText, type TextProps as PaperTextProps } from 'react-native-paper';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline';

const VARIANT_MAP: Record<TypographyVariant, PaperTextProps<never>['variant']> = {
  h1: 'displaySmall',
  h2: 'headlineLarge',
  h3: 'headlineMedium',
  h4: 'headlineSmall',
  h5: 'titleLarge',
  h6: 'titleMedium',
  body1: 'bodyLarge',
  body2: 'bodyMedium',
  caption: 'bodySmall',
  overline: 'labelSmall',
};

interface TypographyProps extends Omit<PaperTextProps<never>, 'variant'> {
  variant?: TypographyVariant;
}

/** Mirrors the web design system's <Typography variant="..."> API over Paper's <Text>. */
export function Typography({ variant = 'body1', ...props }: TypographyProps) {
  return <PaperText variant={VARIANT_MAP[variant]} {...props} />;
}
