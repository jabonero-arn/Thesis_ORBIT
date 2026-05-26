
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
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
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
        throw new Error("User creation failed.");
      }
      
      await sendEmailVerification(newUser);

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

      if (roleToCreate === 'Supervisor' && assignedDepartmentId) {
        userProfileData.assignedDepartmentId = assignedDepartmentId;
      }
      
      batch.set(userDocRef, userProfileData);

      let roleCollectionName = "";
      switch (roleToCreate) {
          case "Supervisor": roleCollectionName = "roles_supervisor"; break;
          case "Property Custodian": roleCollectionName = "roles_property_custodian"; break;
          case "Teacher": roleCollectionName = "roles_teachers"; break;
      }
      if (roleCollectionName) {
        const roleDocRef = doc(firestore, roleCollectionName, newUser.uid);
        batch.set(roleDocRef, {
            role: roleToCreate,
            assignedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast({
        title: "User Created Successfully",
        description: `${displayName} has been created as ${roleToCreate}.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
       toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message,
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
            Account for a new member. They will be assigned the {roleToCreate} role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full Name" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                </div>
                {roleToCreate === 'Supervisor' && (
                  <div className="grid gap-2">
                    <Label htmlFor="department-id">Assign Lab Department (Optional)</Label>
                    <Select value={assignedDepartmentId} onValueChange={setAssignedDepartmentId}>
                      <SelectTrigger id="department-id">
                        <SelectValue placeholder="Select a department" />
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
