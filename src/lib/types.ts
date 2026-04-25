

export type Role = "Student" | "Teacher" | "Supervisor" | "Staff" | "Head Supervisor" | "Property Custodian";

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  
  // Student specific
  idNumber?: string;
  educationLevel?: string;
  
  // Teacher/Staff/Supervisor specific
  employeeId?: string;
  passwordChangeRequired?: boolean;
  assignedDepartmentId?: string;
  hasCompletedLabSetup?: boolean;

  // This is not in Firestore, can be added from auth user if needed for display
  avatarUrl?: string;
};

export type Department = {
  id: string;
  name: string;
  prefix: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
};

export type ItemStatus = "Available" | "Locked" | "Borrowed" | "Pending Receipt" | "Inaccurate";

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  channelId?: string;
  status: ItemStatus;
  imageUrl?: string;
  imageHint?: string;
  quantity: number;
  createdAt?: string;
  verifiedAt?: string;
  inaccuracyReason?: string;
  isVisibleToStudents?: boolean;
};

export type BorrowHistoryStatus = 'Pending' | 'Approved' | 'Denied' | 'Active' | 'Returned' | 'Pending Return' | 'Cancelled' | 'Reserved';
export type ChannelAccessRequestStatus = 'pending' | 'approved' | 'denied';
export type StudentDepartmentAccessRequestStatus = 'pending' | 'approved' | 'denied';

export type ChannelAccessRequest = {
    id: string;
    teacherId: string;
    teacherName: string;
    channelId: string;
    channelName: string;
    departmentId: string;
    subject: string;
    status: ChannelAccessRequestStatus;
    requestedAt: string;
}

export type StudentDepartmentAccessRequest = {
    id: string;
    studentId: string;
    studentName: string;
    departmentId: string;
    departmentName: string;
    subject: string;
    teacherId: string;
    status: StudentDepartmentAccessRequestStatus;
    requestedAt: string;
}

export type BorrowHistory = {
    id: string;
    studentName: string;
    itemName: string;
    inventoryItemId?: string;
    itemQuantity?: number;
    date: string;
    status: BorrowHistoryStatus;
    teacherId?: string;
    checkoutSessionId?: string;
    borrowerUserId?: string;
    startTime?: string;
    endTime?: string;
    reservationId?: string;
    borrowingType?: 'Individual' | 'Group';
    groupNumber?: string;
    groupSubject?: string;
    groupMembers?: string;
    returnCondition?: 'Good' | 'Defected' | 'Broken' | 'Lost';
    resolutionStatus?: 'Pending' | 'Resolved';
};

export type CartItem = {
    item: InventoryItem;
    quantity: number;
};
