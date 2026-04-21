
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
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";

type AddDepartmentFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddDepartmentForm({ open, onOpenChange }: AddDepartmentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = React.useState("");
  const [prefix, setPrefix] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if(!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setPrefix("");
    setIsLoading(false);
  }

  const handleCreateDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !prefix) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out all fields.",
      });
      return;
    }
    setIsLoading(true);

    try {
        if (!firestore) {
         throw new Error("Firestore is not available");
        }
        
        const departmentsCollection = collection(firestore, "departments");
        await addDoc(departmentsCollection, { name, prefix });

        toast({
            title: "Department Created",
            description: `The "${name}" department has been added.`
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("Department creation error:", error);
       toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create the department.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
          <DialogDescription>
            Create a new department or laboratory grouping. The prefix is a unique ID used for sorting (e.g., 'chem').
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateDepartment}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="dept-name">Department Name</Label>
                    <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chemistry Lab" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="dept-prefix">Unique Prefix</Label>
                    <Input id="dept-prefix" type="text" value={prefix} onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/\s/g, '-'))} placeholder="chem-lab" required />
                </div>
            </div>
            <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Department
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
