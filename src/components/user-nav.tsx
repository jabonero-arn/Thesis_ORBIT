
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  HelpCircle,
  LogOut,
  User,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { HelpDialog } from "./help-dialog"
import type { Role } from "@/lib/types"
import { Button } from "./ui/button"
import { UserProfileModal } from "./user-profile-modal"

export function UserNav({ role }: { role?: Role }) {
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const displayRole = role || "Student";
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
  }

  return (
    <>
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
              <p className="text-sm font-medium leading-none">{user?.email || "Guest"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {displayRole}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <UserProfileModal role={displayRole}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
          </UserProfileModal>
          <HelpDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem>
          </HelpDialog>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault()
              setShowLogoutDialog(true)
            }} 
            className="cursor-pointer"
          >
             <LogOut className="mr-2 h-4 w-4" />
             <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
