import { View, type ViewProps } from 'react-native';

interface StackProps extends ViewProps {
  direction?: 'row' | 'column';
  gap?: number;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
}

/** Mirrors the web design system's <Stack>: a flex layout primitive with a gap prop. */
export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  style,
  ...props
}: StackProps) {
  return (
    <View
      style={[
        { flexDirection: direction, gap, alignItems: align, justifyContent: justify },
        style,
      ]}
      {...props}
    />
  );
}
