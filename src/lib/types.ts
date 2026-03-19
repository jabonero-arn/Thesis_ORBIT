export type Role = "Student" | "Teacher" | "Admin" | "Staff";

export type User = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string;
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

export type BorrowHistoryStatus = 'Pending' | 'Approved' | 'Denied' | 'Active' | 'Returned';

export type BorrowHistory = {
    id: string;
    studentName: string;
    itemName: string;
    date: string;
    status: BorrowHistoryStatus;
};

export type CartItem = {
    item: InventoryItem;
    quantity: number;
};
