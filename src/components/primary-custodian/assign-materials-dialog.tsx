
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
  onAssign: (channelId: string) => void;
};

export function AssignMaterialsDialog({ open, onOpenChange, onAssign }: AssignMaterialsDialogProps) {
  const { departments, channels } = useAppContext();
  const { toast } = useToast();
  
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');
  const [selectedChannelId, setSelectedChannelId] = React.useState('');
  
  const dialogChannels = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return channels.filter(c => c.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId, channels]);

  React.useEffect(() => {
    // Reset channel when department changes
    setSelectedChannelId('');
  }, [selectedDepartmentId]);

  React.useEffect(() => {
      if(!open) {
          setSelectedDepartmentId('');
          setSelectedChannelId('');
      }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedChannelId) {
        toast({ variant: "destructive", title: "Please select a room." });
        return;
    }
    onAssign(selectedChannelId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Laboratory</DialogTitle>
          <DialogDescription>
            Select the department and the specific room to assign the selected materials to.
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
             <div className="grid gap-2">
                <Label htmlFor="assign-channel">Specific Room</Label>
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId} disabled={!selectedDepartmentId}>
                    <SelectTrigger id="assign-channel">
                        <SelectValue placeholder="Select a room..." />
                    </SelectTrigger>
                    <SelectContent>
                        {dialogChannels.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name.replace(/#/g, '')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedChannelId}>
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    