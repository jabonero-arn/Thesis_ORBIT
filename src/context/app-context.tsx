'use client';

import * as React from 'react';
import type { InventoryItem, BorrowHistory, User, Department, Channel, ChannelAccessRequest, StudentDepartmentAccessRequest, ActivityLog } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type AppContextType = {
  items: InventoryItem[];
  borrowHistory: BorrowHistory[];
  allUsers: User[];
  departments: Department[];
  channels: Channel[];
  channelAccessRequests: ChannelAccessRequest[];
  studentDepartmentAccessRequests: StudentDepartmentAccessRequest[];
  activityLogs: ActivityLog[];
};

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const itemsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'inventory_items'), orderBy('name')) : null
  , [firestore]);
  
  const { data: itemsData } = useCollection<Omit<InventoryItem, 'id'>>(itemsQuery);

  const historyQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'borrowing_transactions'), orderBy('date', 'desc')) : null
  , [firestore]);

  const { data: historyData } = useCollection<Omit<BorrowHistory, 'id'>>(historyQuery);

  const logsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc')) : null
  , [firestore]);
  const { data: logsData } = useCollection<Omit<ActivityLog, 'id'>>(logsQuery);

  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), orderBy('displayName', 'asc')) : null
  , [firestore]);
  
  const { data: usersData } = useCollection<Omit<User, 'id'>>(usersQuery);
  
  const departmentsQuery = useMemoFirebase(() => 
      firestore ? query(collection(firestore, 'departments'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: departmentsData } = useCollection<Omit<Department, 'id'>>(departmentsQuery);

  const channelsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'channels'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: channelsData } = useCollection<Omit<Channel, 'id'>>(channelsQuery);

  const accessRequestsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'channel_access_requests'), orderBy('requestedAt', 'desc')) : null
  , [firestore]);
  const { data: accessRequestsData } = useCollection<Omit<ChannelAccessRequest, 'id'>>(accessRequestsQuery);

  const studentAccessRequestsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'student_department_access_requests'), orderBy('requestedAt', 'desc')) : null
  , [firestore]);
  const { data: studentAccessRequestsData } = useCollection<Omit<StudentDepartmentAccessRequest, 'id'>>(studentAccessRequestsQuery);


  // This ref is to prevent the effect from running multiple times for the same set of cancellations
  const processedReservationIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!firestore || !historyData) return;

    // --- Timezone-aware logic for PHT (UTC+8) ---
    const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

    // Function to get 'YYYY-MM-DD' string in PHT
    const toPHTDateString = (date: Date): string => {
        const phtDate = new Date(date.getTime() + PHT_OFFSET_MS);
        return phtDate.toISOString().split('T')[0];
    };

    const now = new Date();
    const todayInPHT = toPHTDateString(now);
    const tenMinutes = 10 * 60 * 1000;
    const reservationsToCancel: BorrowHistory[] = [];

    historyData.forEach(record => {
      if (record.status === 'Reserved' && record.date && record.startTime && !processedReservationIds.current.has(record.id)) {
        try {
          const reservationDateUtc = new Date(record.date);
          const reservationDayInPHT = toPHTDateString(reservationDateUtc);

          if (reservationDayInPHT === todayInPHT) {
            const [hours, minutes] = record.startTime.split(':').map(Number);
            
            // Construct the exact reservation datetime in UTC by adding the start time to the reservation date (which is midnight PHT in UTC)
            const reservationDateTimeUtc = new Date(
                reservationDateUtc.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000)
            );

            // Check if current time (UTC) is 10 minutes past the reservation time (UTC)
            if (now.getTime() > reservationDateTimeUtc.getTime() + tenMinutes) {
              reservationsToCancel.push(record as BorrowHistory);
            }
          }
        } catch (e) {
          console.error("Error parsing reservation date/time for auto-cancellation:", e);
        }
      }
    });

    if (reservationsToCancel.length > 0) {
      const batch = writeBatch(firestore);
      const studentNames = new Set<string>();
      
      reservationsToCancel.forEach(record => {
        const docRef = doc(firestore, 'borrowing_transactions', record.id);
        batch.update(docRef, { status: 'Cancelled' });
        studentNames.add(record.studentName);
        processedReservationIds.current.add(record.id); // Mark as processed
      });

      batch.commit().then(() => {
        toast({
          variant: "destructive",
          title: "Reservation(s) Cancelled",
          description: `Unclaimed reservation(s) for ${Array.from(studentNames).join(', ')} were automatically cancelled.`,
        });
      }).catch(error => {
        console.error("Error auto-cancelling reservations:", error);
      });
    }
  }, [historyData, firestore, toast]);


  const value = React.useMemo(() => ({
    items: itemsData || [],
    borrowHistory: historyData || [],
    allUsers: usersData || [],
    departments: departmentsData || [],
    channels: channelsData || [],
    channelAccessRequests: accessRequestsData || [],
    studentDepartmentAccessRequests: studentAccessRequestsData || [],
    activityLogs: logsData || [],
  }), [itemsData, historyData, usersData, departmentsData, channelsData, accessRequestsData, studentAccessRequestsData, logsData]);

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