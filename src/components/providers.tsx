'use client';

import { AppProvider } from '@/context/app-context';
import { FirebaseClientProvider } from '@/firebase';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AppProvider>{children}</AppProvider>
    </FirebaseClientProvider>
  );
}
