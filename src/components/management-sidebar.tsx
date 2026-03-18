"use client"
import { Users, Package, PackageOpen, History as HistoryIcon, LayoutGrid } from "lucide-react";
import { Button } from "./ui/button";
import type { Role } from "@/lib/types";

export type AdminView = 'dashboard' | 'inventory' | 'transactions' | 'history' | 'users';
export type StaffView = 'inventory' | 'transactions' | 'history';

type ManagementSidebarProps = {
  role: Extract<Role, "Admin" | "Staff">;
  activeView: AdminView | StaffView;
  onViewChange: (view: AdminView | StaffView) => void;
};

export function ManagementSidebar({ role, activeView, onViewChange }: ManagementSidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutGrid />, roles: ["Admin"] },
    { id: "inventory", label: "Inventory", icon: <Package />, roles: ["Admin", "Staff"] },
    { id: "transactions", label: "Transactions", icon: <PackageOpen />, roles: ["Admin", "Staff"] },
    { id: "history", label: "History", icon: <HistoryIcon />, roles: ["Admin", "Staff"] },
    { id: "users", label: "Users", icon: <Users />, roles: ["Admin"] },
  ];

  const availableItems = navItems.filter(item => item.roles.includes(role));

  return (
    <nav className="hidden md:flex flex-col gap-2 bg-[#141821] p-4 border-r border-border/50 w-64">
      {availableItems.map(item => (
        <Button
          key={item.id}
          variant={activeView === item.id ? "secondary" : "ghost"}
          className="justify-start gap-2"
          onClick={() => onViewChange(item.id as any)}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
