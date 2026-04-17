
export type Role = "Student" | "Teacher" | "Admin" | "Staff" | "Primary Custodian";

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  
  // Student specific
  idNumber?: string;
  educationLevel?: string;
  courseOrStrand?: string;
  yearLevel?: string;
  
  // Teacher/Staff/Admin specific
  department?: string;
  employeeId?: string;
  passwordChangeRequired?: boolean;

  // This is not in Firestore, can be added from auth user if needed for display
  avatarUrl?: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
};

export type ItemStatus = "Available" | "Locked" | "Borrowed";

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  channelId: string;
  status: ItemStatus;
  imageUrl: string;
  imageHint: string;
  quantity: number;
};

export type BorrowHistoryStatus = 'Pending' | 'Approved' | 'Denied' | 'Active' | 'Returned' | 'Pending Return' | 'Cancelled' | 'Reserved';

export type BorrowHistory = {
    id: string;
    studentName: string;
    itemName: string;
    date: string;
    status: BorrowHistoryStatus;
    teacherId?: string;
    checkoutSessionId?: string;
    borrowerUserId?: string;
    startTime?: string;
    endTime?: string;
};

export type CartItem = {
    item: InventoryItem;
    quantity: number;
};
