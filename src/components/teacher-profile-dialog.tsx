"use client"

import * as React from "react"
import { useAuth, useFirestore, useUser, FirestorePermissionError, errorEmitter } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

type TeacherProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const departments = [
  "Science Department",
  "Social Studies",
  "English Department",
  "College of Computer Studies",
  "IT Services",
  "Facilities Management",
];

export function TeacherProfileDialog({ open, onOpenChange }: TeacherProfileDialogProps) {
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = React.useState(false)
  const [department, setDepartment] = React.useState("")
  const [employeeId, setEmployeeId] = React.useState("")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("")

  const handleSubmit = async () => {
    if (!user) return
    if (!department || !employeeId) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill out your department and employee ID." })
      return
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Passwords do not match." })
      return
    }
    if (newPassword && !currentPassword) {
      toast({ variant: "destructive", title: "Current Password Required", description: "Please enter your current password to set a new one." })
      return
    }

    setIsLoading(true)

    try {
      // 1. Update password if provided
      if (newPassword && currentPassword && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword)
        await reauthenticateWithCredential(user, credential)
        await updatePassword(user, newPassword)
        toast({ title: "Password Updated Successfully" })
      }

      // 2. Update Firestore profile
      const userProfile = {
        department: department,
        employeeId: employeeId,
        role: "Teacher",
        displayName: user.displayName,
        email: user.email,
        id: user.uid,
      }
      const userDocRef = doc(firestore, "users", user.uid)
      
      setDoc(userDocRef, userProfile, { merge: true })
        .then(() => {
          toast({ title: "Profile Updated!", description: "Your information has been saved." })
          onOpenChange(false) // Close dialog on success
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: userProfile,
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({ variant: "destructive", title: "Update Failed", description: "Could not save your profile. Please try again." })
        })

    } catch (error: any) {
      console.error(error)
      let description = "An unexpected error occurred."
      if (error.code === 'auth/wrong-password') {
          description = "The current password you entered is incorrect."
      } else if (error.code === 'auth/too-many-requests') {
          description = "Too many attempts. Please try again later."
      }
      toast({ variant: "destructive", title: "Operation Failed", description })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Teacher Profile</DialogTitle>
          <DialogDescription>Please provide some additional information to finish setting up your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input id="employeeId" value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="EMP-12345" />
          </div>
          <div className="border-t pt-4 space-y-4">
             <p className="text-sm text-muted-foreground">Optionally, you can change your password below.</p>
             <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                </div>
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}