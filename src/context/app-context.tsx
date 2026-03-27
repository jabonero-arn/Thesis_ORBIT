'use client';

import * as React from 'react';
import type { InventoryItem, BorrowHistory } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

type AppContextType = {
  items: InventoryItem[];
  borrowHistory: BorrowHistory[];
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'inventory_items') : null
  , [firestore]);
  
  const { data: itemsData } = useCollection<Omit<InventoryItem, 'id'>>(itemsQuery);

  const historyQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'borrowing_transactions'), orderBy('date', 'desc')) : null
  , [firestore]);

  const { data: historyData } = useCollection<Omit<BorrowHistory, 'id'>>(historyQuery);

  const value = React.useMemo(() => ({
    items: itemsData || [],
    borrowHistory: historyData || [],
  }), [itemsData, historyData]);

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
