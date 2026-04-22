
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/app-context";
import type { Department, Channel } from "@/lib/types";

type AssignMaterialsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (departmentId: string) => void;
};

export function AssignMaterialsDialog({ open, onOpenChange, onAssign }: AssignMaterialsDialogProps) {
  const { departments } = useAppContext();
  const { toast } = useToast();
  
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');

  React.useEffect(() => {
      if(!open) {
          setSelectedDepartmentId('');
      }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedDepartmentId) {
        toast({ variant: "destructive", title: "Please select a department." });
        return;
    }
    onAssign(selectedDepartmentId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Department</DialogTitle>
          <DialogDescription>
            Select the department to assign the selected materials to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="assign-department">Department</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger id="assign-department">
                        <SelectValue placeholder="Select a department..." />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedDepartmentId}>
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
