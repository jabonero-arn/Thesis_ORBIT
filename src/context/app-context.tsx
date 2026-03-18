'use client';

import * as React from 'react';
import type { InventoryItem, BorrowHistory } from '@/lib/types';
import { items as initialItems, borrowHistory as initialBorrowHistory } from '@/lib/data';

type AppContextType = {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  borrowHistory: BorrowHistory[];
  setBorrowHistory: React.Dispatch<React.SetStateAction<BorrowHistory[]>>;
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<InventoryItem[]>(initialItems);
  const [borrowHistory, setBorrowHistory] = React.useState<BorrowHistory[]>(initialBorrowHistory);

  const value = React.useMemo(() => ({
    items,
    setItems,
    borrowHistory,
    setBorrowHistory
  }), [items, borrowHistory]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
