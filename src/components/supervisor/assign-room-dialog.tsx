
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
import type { Channel } from "@/lib/types";

type AssignRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (channelId: string) => void;
  channels: Channel[];
};

export function AssignRoomDialog({ open, onOpenChange, onAssign, channels }: AssignRoomDialogProps) {
  const { toast } = useToast();
  const [selectedChannelId, setSelectedChannelId] = React.useState('');

  React.useEffect(() => {
    if (!open) {
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
          <DialogTitle>Assign to Room</DialogTitle>
          <DialogDescription>
            Select the specific room to assign the selected materials to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assign-channel">Room</Label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger id="assign-channel">
                <SelectValue placeholder="Select a room..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map(c => (
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
