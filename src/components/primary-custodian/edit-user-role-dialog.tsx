
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

const editableRoles: Role[] = ["Supervisor", "Property Custodian", "Teacher", "Student"];

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
      setNewRole("");
      setNewDepartmentId("");
      setIsLoading(false);
    }
  }, [user, open]);
  
  const handleRoleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newRole || !firestore) return;

    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, "users", user.id);
        
        const updateData: any = { role: newRole };
        if (newRole === 'Supervisor') updateData.assignedDepartmentId = newDepartmentId;
        else updateData.assignedDepartmentId = "";
        
        batch.update(userDocRef, updateData);

        if (newRole !== user.role) {
            const getCol = (r: Role) => {
                if (r === 'Supervisor') return 'roles_supervisor';
                if (r === 'Property Custodian') return 'roles_property_custodian';
                if (r === 'Teacher') return 'roles_teachers';
                return '';
            }
            const oldCol = getCol(user.role);
            const nextCol = getCol(newRole);
            
            if (oldCol) batch.delete(doc(firestore, oldCol, user.id));
            if (nextCol) batch.set(doc(firestore, nextCol, user.id), { role: newRole, assignedAt: serverTimestamp() });
        }
        
        await batch.commit();
        toast({ title: "User Updated" });
        onOpenChange(false);
    } catch (error: any) {
       toast({ variant: "destructive", title: "Update Failed" });
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
        </DialogHeader>
        <form onSubmit={handleRoleUpdate}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                      <SelectTrigger id="edit-role"><SelectValue/></SelectTrigger>
                      <SelectContent>{editableRoles.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                {newRole === 'Supervisor' && (
                    <div className="grid gap-2">
                        <Label htmlFor="edit-department">Assign Department</Label>
                        <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                        <SelectTrigger id="edit-department"><SelectValue placeholder="Select Department"/></SelectTrigger>
                        <SelectContent>{departments?.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>Save Changes</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
