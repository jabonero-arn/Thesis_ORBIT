
"use client"

import * as React from "react"
import { useAuth, useFirestore, useUser } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type ForcePasswordChangeDialogProps = {
  open: boolean;
  onSuccess: () => void;
};

export function ForcePasswordChangeDialog({ open, onSuccess }: ForcePasswordChangeDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");

  const handleSubmit = async () => {
    if (!user || !user.email || !firestore) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all password fields.",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Passwords do not match." });
      return;
    }

    setIsLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, { passwordChangeRequired: false });

      toast({
        title: "Password Updated Successfully",
        description: "You may now proceed.",
      });
      onSuccess();
    } catch (error: any) {
      console.error(error);
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/wrong-password') {
        description = "The current password you entered is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        description = "Password is too weak. It must be at least 6 characters long.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Too many attempts. Please try again later.";
      }
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Update Your Password</DialogTitle>
          <DialogDescription>
            For your security, you must change the temporary password before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password-force">Current Password</Label>
            <Input
              id="current-password-force"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password-force">New Password</Label>
              <Input
                id="new-password-force"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-new-password-force">Confirm New Password</Label>
              <Input
                id="confirm-new-password-force"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
