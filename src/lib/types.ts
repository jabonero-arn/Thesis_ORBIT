export type Role = "Student" | "Teacher" | "Admin";

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
};
