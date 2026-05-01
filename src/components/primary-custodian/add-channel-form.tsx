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
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import type { Department } from "@/lib/types";
import { createActivityLog } from "@/lib/logging";

type AddChannelFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
};

export function AddChannelForm({ open, onOpenChange, department }: AddChannelFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if(!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsLoading(false);
  }

  const handleCreateChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !description || !department) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out all fields and ensure a department is selected.",
      });
      return;
    }
    setIsLoading(true);

    try {
        if (!firestore) {
         throw new Error("Firestore is not available");
        }
        
        const channelsCollection = collection(firestore, "channels");
        await addDoc(channelsCollection, { 
            name: `#${name}`, 
            description,
            departmentId: department.id
        });

        createActivityLog(
            firestore,
            user?.uid || 'sys',
            user?.displayName || 'Admin',
            'Created Room',
            `New laboratory room created: #${name} in ${department.name}`,
            'Management'
        );

        toast({
            title: "Room Created",
            description: `The room "${name}" has been added to ${department.name}.`
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("Channel creation error:", error);
       toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create the room.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
          <DialogDescription>
            Create a new room or laboratory within the "{department?.name}" department.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateChannel}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="room-name">Room Name</Label>
                    <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Main Floor or Room 301" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="room-description">Description</Label>
                    <Input id="room-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., For general purpose use" required />
                </div>
            </div>
            <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Room
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
