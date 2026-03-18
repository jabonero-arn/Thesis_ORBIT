'use client';

import { AppProvider } from '@/context/app-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
