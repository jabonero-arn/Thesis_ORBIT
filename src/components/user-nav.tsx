"use client"

import Link from "next/link"
import {
  User,
  History,
  Settings,
  HelpCircle,
  LogOut,
  LayoutGrid,
  Inbox,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { currentUser } from "@/lib/data"
import { HelpDialog } from "./help-dialog"
import type { Role } from "@/lib/types"
import { Button } from "./ui/button"

export function UserNav({ role }: { role?: Role }) {
  const displayRole = role || currentUser.role;

  const getDashboardPath = () => {
    switch (displayRole) {
        case 'Admin':
            return '/admin/dashboard';
        case 'Staff':
            return '/staff/dashboard';
        case 'Teacher':
            return '/teacher/dashboard';
        case 'Student':
        default:
            return '/dashboard';
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayRole}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={getDashboardPath()} className="w-full flex items-center">
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <History className="mr-2 h-4 w-4" />
            <span>Borrow History</span>
          </DropdownMenuItem>
           <DropdownMenuItem className="cursor-pointer">
            <Inbox className="mr-2 h-4 w-4" />
            <span>Inbox</span>
          </DropdownMenuItem>
           <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <HelpDialog>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </DropdownMenuItem>
        </HelpDialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
           <Link href="/" className="w-full flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
