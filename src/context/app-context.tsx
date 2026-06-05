
'use client';

import * as React from 'react';
import type { InventoryItem, BorrowHistory, User, Department, Channel, ChannelAccessRequest, StudentDepartmentAccessRequest, ActivityLog } from '@/lib/types';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
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
  const { user } = useUser();

  // Fetch user profile to check roles for sensitive data
  const userProfileRef = useMemoFirebase(() => 
    (firestore && user) ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  // Core Data Queries - Gated by authentication and split get/list for performance/security
  const itemsQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'inventory_items'), orderBy('name')) : null
  , [firestore, user]);
  const { data: itemsData } = useCollection<Omit<InventoryItem, 'id'>>(itemsQuery);

  const historyQuery = useMemoFirebase(() => 
    (firestore && user) ? query(collection(firestore, 'borrowing_transactions'), orderBy('date', 'desc')) : null
  , [firestore, user]);
  const { data: historyData } = useCollection<Omit<BorrowHistory, 'id'>>(historyQuery);

  const departmentsQuery = useMemoFirebase(() => 
      (firestore && user) ? query(collection(firestore, 'departments'), orderBy('name', 'asc')) : null
  , [firestore, user]);
  const { data: departmentsData } = useCollection<Omit<Department, 'id'>>(departmentsQuery);

  const channelsQuery = useMemoFirebase(() =>
    (firestore && user) ? query(collection(firestore, 'channels'), orderBy('name', 'asc')) : null
  , [firestore, user]);
  const { data: channelsData } = useCollection<Omit<Channel, 'id'>>(channelsQuery);

  const accessRequestsQuery = useMemoFirebase(() =>
    (firestore && user) ? query(collection(firestore, 'channel_access_requests'), orderBy('requestedAt', 'desc')) : null
  , [firestore, user]);
  const { data: accessRequestsData } = useCollection<Omit<ChannelAccessRequest, 'id'>>(accessRequestsQuery);

  const studentAccessRequestsQuery = useMemoFirebase(() =>
    (firestore && user) ? query(collection(firestore, 'student_department_access_requests'), orderBy('requestedAt', 'desc')) : null
  , [firestore, user]);
  const { data: studentAccessRequestsData } = useCollection<Omit<StudentDepartmentAccessRequest, 'id'>>(studentAccessRequestsQuery);

  // Sensitive Data Queries - Gated by Supervisor role
  const logsQuery = useMemoFirebase(() =>
    (firestore && userProfile?.role === 'Supervisor') ? query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc')) : null
  , [firestore, userProfile]);
  const { data: logsData } = useCollection<Omit<ActivityLog, 'id'>>(logsQuery);

  const usersQuery = useMemoFirebase(() =>
    (firestore && userProfile?.role === 'Supervisor') ? query(collection(firestore, 'users'), orderBy('displayName', 'asc')) : null
  , [firestore, userProfile]);
  const { data: usersData } = useCollection<Omit<User, 'id'>>(usersQuery);


  // Auto-cancellation logic for reservations
  const processedReservationIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!firestore || !historyData) return;

    const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
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
            const reservationDateTimeUtc = new Date(
                reservationDateUtc.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000)
            );
            if (now.getTime() > reservationDateTimeUtc.getTime() + tenMinutes) {
              reservationsToCancel.push(record as BorrowHistory);
            }
          }
        } catch (e) {
          console.error("Error parsing reservation date/time:", e);
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
        processedReservationIds.current.add(record.id);
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
