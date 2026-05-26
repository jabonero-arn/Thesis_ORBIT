
"use client"

import { useRouter } from "next/navigation"
import {
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { HelpDialog } from "./help-dialog"
import type { Role } from "@/lib/types"
import { Button } from "./ui/button"

export function UserNav({ role }: { role?: Role }) {
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const displayRole = role || "Student";

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/')
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
            <p className="text-sm font-medium leading-none">{user?.email || "Guest"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayRole}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <HelpDialog>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help</span>
          </DropdownMenuItem>
        </HelpDialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
           <LogOut className="mr-2 h-4 w-4" />
           <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
