
"use client"

import * as React from "react"
import { useAuth, useFirestore, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User as UserType } from "@/lib/types"
import { useAppContext } from "@/context/app-context"
import { Checkbox } from "@/components/ui/checkbox"

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserType | null;
  displayRole: string;
};

export function EditProfileDialog({ open, onOpenChange, userProfile, displayRole }: EditProfileDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { departments } = useAppContext();

  const [isLoading, setIsLoading] = React.useState(false);
  
  // Form state
  const [displayName, setDisplayName] = React.useState("");
  // Student fields
  const [educationLevel, setEducationLevel] = React.useState("");
  const [idNumber, setIdNumber] = React.useState("");
  const [selectedDepartments, setSelectedDepartments] = React.useState<string[]>([]);
  // Staff/Teacher fields
  const [employeeId, setEmployeeId] = React.useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");

  React.useEffect(() => {
    if (userProfile && open) {
      setDisplayName(userProfile.displayName || "");
      if (displayRole === 'Student') {
          setIdNumber(userProfile.idNumber || "");
          setEducationLevel(userProfile.educationLevel || "");
          setSelectedDepartments(userProfile.departmentIds || []);
      } else {
          setEmployeeId(userProfile.employeeId || "");
      }
    } else if (!open) {
        // Reset fields when closed
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    }
  }, [userProfile, open, displayRole]);
  
  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(departmentId) 
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !firestore) return;

    if (newPassword && newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Passwords do not match." });
      return;
    }
    if (newPassword && !currentPassword) {
      toast({ variant: "destructive", title: "Current Password Required", description: "Please enter your current password to set a new one." });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update password if provided
      if (newPassword && currentPassword && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        toast({ title: "Password Updated Successfully" });
      }

      // 2. Update display name in Auth if changed
      if (user.displayName !== displayName) {
          await updateProfile(user, { displayName });
      }

      // 3. Update Firestore profile
      const userDocRef = doc(firestore, "users", user.uid);
      const updatedProfileData: Partial<UserType> = { displayName };

      if (displayRole === 'Student') {
        updatedProfileData.idNumber = idNumber;
        updatedProfileData.educationLevel = educationLevel as 'college' | 'shs';
        updatedProfileData.departmentIds = selectedDepartments;
      } else {
        updatedProfileData.employeeId = employeeId;
      }
      
      await updateDoc(userDocRef, updatedProfileData);

      toast({ title: "Profile Updated!", description: "Your information has been saved." });
      onOpenChange(false);

    } catch (error: any) {
      console.error(error);
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/wrong-password') {
          description = "The current password you entered is incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
          description = "Too many attempts. Please try again later.";
      } else if (error.code === 'auth/weak-password') {
        description = "Password is too weak. It must be at least 6 characters long.";
      }
      toast({ variant: "destructive", title: "Operation Failed", description });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStudentFields = () => (
    <>
      <div className="grid gap-2">
          <Label htmlFor="edit-id-number">ID Number</Label>
          <Input id="edit-id-number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
      </div>
      <div className="grid gap-2">
          <Label htmlFor="edit-education-level">Education Level</Label>
          <Select value={educationLevel} onValueChange={(value: "college" | "shs") => { setEducationLevel(value); }}>
              <SelectTrigger id="edit-education-level"><SelectValue placeholder="Select education level" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="shs">Senior High School</SelectItem>
              </SelectContent>
          </Select>
      </div>
      <div className="grid gap-2">
        <Label>Departments</Label>
        <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
            {departments.map(dept => (
                <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                        id={`edit-dept-${dept.id}`}
                        onCheckedChange={() => handleDepartmentChange(dept.id)}
                        checked={selectedDepartments.includes(dept.id)}
                    />
                    <Label htmlFor={`edit-dept-${dept.id}`} className="font-normal cursor-pointer">
                        {dept.name}
                    </Label>
                </div>
            ))}
        </div>
      </div>
    </>
  );

  const renderStaffFields = () => (
    <>
      <div className="grid gap-2">
        <Label htmlFor="edit-employeeId">Employee ID</Label>
        <Input id="edit-employeeId" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Make changes to your profile here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-displayName">Full Name</Label>
                    <Input id="edit-displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
                
                {displayRole === 'Student' ? renderStudentFields() : renderStaffFields()}

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
            <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
