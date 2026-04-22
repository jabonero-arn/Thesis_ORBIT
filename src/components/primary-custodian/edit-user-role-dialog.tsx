
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import type { Role, User as UserType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/app-context";

type EditUserRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
};

const editableRoles: Exclude<Role, "Student" | "Head Supervisor" | "Teacher">[] = ["Supervisor", "Staff"];

export function EditUserRoleDialog({ open, onOpenChange, user }: EditUserRoleDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { departments } = useAppContext();

  const [newRole, setNewRole] = React.useState<Role | "">("");
  const [newDepartmentId, setNewDepartmentId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (user && open) {
      setNewRole(user.role);
      setNewDepartmentId(user.assignedDepartmentId || "");
    } else if (!open) {
      // Reset form when dialog is closed
      setNewRole("");
      setNewDepartmentId("");
      setIsLoading(false);
    }
  }, [user, open]);
  
  const handleRoleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newRole || !newDepartmentId || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select a role and department.",
      });
      return;
    }

    if (newRole === user.role && newDepartmentId === user.assignedDepartmentId) {
        toast({ title: "No Changes", description: "No changes were made to the user's role or department." });
        onOpenChange(false);
        return;
    }
    
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);

        // 1. Update the user document
        const userDocRef = doc(firestore, "users", user.id);
        batch.update(userDocRef, {
            role: newRole,
            assignedDepartmentId: newDepartmentId,
        });

        // 2. Manage role flag collections if role has changed
        if (newRole !== user.role) {
            const oldRoleCollection = user.role === 'Supervisor' ? 'roles_supervisor' : 'roles_staff';
            const newRoleCollection = newRole === 'Supervisor' ? 'roles_supervisor' : 'roles_staff';
            
            const oldRoleDocRef = doc(firestore, oldRoleCollection, user.id);
            batch.delete(oldRoleDocRef);
            
            const newRoleDocRef = doc(firestore, newRoleCollection, user.id);
            batch.set(newRoleDocRef, {
                role: newRole,
                assignedAt: serverTimestamp(),
            });
        }
        
        await batch.commit();

        toast({
            title: "User Updated",
            description: `${user.displayName}'s role and assignment have been updated.`,
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("User role update error:", error);
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update the user.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            Modify the role and department assignment for {user.displayName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRoleUpdate}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)} required>
                      <SelectTrigger id="edit-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {editableRoles.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="edit-department">Assign Department</Label>
                    <Select value={newDepartmentId} onValueChange={setNewDepartmentId} required>
                      <SelectTrigger id="edit-department">
                        <SelectValue placeholder="Select a department to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map(department => (
                          <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
