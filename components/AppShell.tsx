'use client';

import { type ReactNode } from 'react';
import ThemeProviderWrapper from './ThemeProviderWrapper';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProviderWrapper>
      <Sidebar>{children}</Sidebar>
    </ThemeProviderWrapper>
  );
}
