
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import type { Role, Department } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type CreateUserFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleToCreate: Exclude<Role, "Student">;
};

export function CreateUserForm({ open, onOpenChange, roleToCreate }: CreateUserFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const [assignedDepartmentId, setAssignedDepartmentId] = React.useState('');

  const departmentsQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, 'departments') : null
  , [firestore]);
  const { data: departments } = useCollection<Department>(departmentsQuery);

  React.useEffect(() => {
    if(!open) {
      // Reset form when dialog is closed
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setAssignedDepartmentId('');
    setIsLoading(false);
  }

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!displayName || !email || !password || !roleToCreate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out all fields.",
      });
      return;
    }
     if ((roleToCreate === 'Supervisor' || roleToCreate === 'Staff') && !assignedDepartmentId) {
      toast({
        variant: "destructive",
        title: "Missing assignment",
        description: `Please assign a department for the ${roleToCreate}.`,
      });
      return;
    }

    setIsLoading(true);

    const tempAppName = `user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        email,
        password
      );
      const newUser = userCredential.user;

      if (!newUser) {
        throw new Error("User creation failed in authentication step.");
      }

      if (!firestore) {
         throw new Error("Firestore is not available");
      }
      const batch = writeBatch(firestore);

      const userDocRef = doc(firestore, "users", newUser.uid);
      
      const userProfileData: any = {
        id: newUser.uid,
        displayName: displayName,
        email: email,
        role: roleToCreate,
        passwordChangeRequired: true,
      };

      if (roleToCreate === 'Supervisor' || roleToCreate === 'Staff') {
        userProfileData.assignedDepartmentId = assignedDepartmentId;
      }
      
      batch.set(userDocRef, userProfileData);

      let roleCollectionName = "";
      switch (roleToCreate) {
          case "Supervisor": roleCollectionName = "roles_supervisor"; break;
          case "Head Supervisor": roleCollectionName = "roles_head_supervisor"; break;
          case "Property Custodian": roleCollectionName = "roles_property_custodian"; break;
          case "Staff": roleCollectionName = "roles_staff"; break;
          case "Teacher": roleCollectionName = "roles_teachers"; break;
      }
      const roleDocRef = doc(firestore, roleCollectionName, newUser.uid);
      batch.set(roleDocRef, {
          role: roleToCreate,
          assignedAt: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: "User Created Successfully",
        description: `${displayName} (${email}) has been created with the role ${roleToCreate}.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("User creation error:", error);
      let description = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
          description = "An account with this email address already exists.";
      } else if (error.code === 'auth/weak-password') {
          description = "The password is too weak. It must be at least 6 characters.";
      }
       toast({
        variant: "destructive",
        title: "Creation Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
      await deleteApp(tempApp);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New {roleToCreate}</DialogTitle>
          <DialogDescription>
            Create an account for a new member. They will be assigned the {roleToCreate} role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Juan Dela Cruz" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Must be at least 6 characters" required />
                </div>
                {(roleToCreate === 'Supervisor' || roleToCreate === 'Staff') && (
                  <div className="grid gap-2">
                    <Label htmlFor="department-id">Assign Department</Label>
                    <Select value={assignedDepartmentId} onValueChange={setAssignedDepartmentId} required>
                      <SelectTrigger id="department-id">
                        <SelectValue placeholder="Select a department to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map(department => (
                          <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>
            <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
