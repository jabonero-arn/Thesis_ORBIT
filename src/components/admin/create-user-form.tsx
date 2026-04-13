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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { firebaseConfig } from "@/firebase/config";
import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import type { Role } from "@/lib/types";

type CreateUserFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const roles: Exclude<Role, "Student">[] = [
  "Primary Custodian",
  "Admin",
  "Staff",
  "Teacher",
];

export function CreateUserForm({ open, onOpenChange }: CreateUserFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role | "">("");
  const [isLoading, setIsLoading] = React.useState(false);

  const resetForm = () => {
    setDisplayName("");
    setEmail("");
    setPassword("");
    setRole("");
    setIsLoading(false);
  }

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!displayName || !email || !password || !role) {
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
      // 1. Create user in the temporary Auth instance
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        email,
        password
      );
      const newUser = userCredential.user;

      if (!newUser) {
        throw new Error("User creation failed in authentication step.");
      }

      // 2. Create user profile and role flag in Firestore using a batch write
      if (!firestore) {
         throw new Error("Firestore is not available");
      }
      const batch = writeBatch(firestore);

      // User profile document
      const userDocRef = doc(firestore, "users", newUser.uid);
      batch.set(userDocRef, {
        id: newUser.uid,
        displayName: displayName,
        email: email,
        role: role,
      });

      // Role flag document
      let roleCollectionName = "";
      switch (role) {
          case "Admin": roleCollectionName = "roles_admin"; break;
          case "Primary Custodian": roleCollectionName = "roles_primary_custodian"; break;
          case "Staff": roleCollectionName = "roles_staff"; break;
          case "Teacher": roleCollectionName = "roles_teachers"; break;
      }
      const roleDocRef = doc(firestore, roleCollectionName, newUser.uid);
      batch.set(roleDocRef, {
          role: role,
          assignedAt: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: "User Created Successfully",
        description: `${displayName} (${email}) has been created with the role ${role}.`,
      });

      resetForm();
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
      // 3. Clean up the temporary app instance
      await deleteApp(tempApp);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create an account for a new member and assign them a role.
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
                <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                     <Select value={role} onValueChange={(value) => setRole(value as Role)} required>
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
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
                Create User
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
