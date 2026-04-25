
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
import { doc, updateDoc } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import type { ChannelAccessRequest } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EditLabAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ChannelAccessRequest | null;
};

export function EditLabAccessDialog({ open, onOpenChange, request }: EditLabAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, channels } = useAppContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState("");
  const [selectedChannelId, setSelectedChannelId] = React.useState("");
  const [subject, setSubject] = React.useState("");

  React.useEffect(() => {
    if (request && open) {
      setSelectedDepartmentId(request.departmentId);
      setSelectedChannelId(request.channelId);
      setSubject(request.subject);
    } else if (!open) {
      // Reset form on close
      setSelectedDepartmentId("");
      setSelectedChannelId("");
      setSubject("");
    }
  }, [request, open]);

  const availableChannels = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return channels.filter(c => c.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId, channels]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !firestore || !request) return;

    if (!selectedDepartmentId || !selectedChannelId || !subject) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill out all fields." });
      return;
    }
    
    setIsLoading(true);

    try {
      const docRef = doc(firestore, 'channel_access_requests', request.id);
      const selectedChannel = channels.find(c => c.id === selectedChannelId);

      await updateDoc(docRef, {
        departmentId: selectedDepartmentId,
        channelId: selectedChannelId,
        channelName: selectedChannel?.name || 'Unknown',
        subject: subject,
        status: 'pending', // Reset status on edit
        requestedAt: new Date().toISOString(), // Update timestamp
      });
      
      toast({ title: "Request Updated", description: "Your access request has been updated and sent for re-approval." });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the access request." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lab Access Request</DialogTitle>
          <DialogDescription>
            Modify the laboratory or subject for your access request. This will require re-approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-req-dept">Department</Label>
                    <Select value={selectedDepartmentId} onValueChange={(value) => { setSelectedDepartmentId(value); setSelectedChannelId(''); }}>
                        <SelectTrigger id="edit-req-dept"><SelectValue placeholder="Select a department..." /></SelectTrigger>
                        <SelectContent>
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="edit-req-channel">Laboratory / Room</Label>
                    <Select value={selectedChannelId} onValueChange={setSelectedChannelId} disabled={!selectedDepartmentId}>
                        <SelectTrigger id="edit-req-channel"><SelectValue placeholder="Select a room..." /></SelectTrigger>
                        <SelectContent>
                            {availableChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.name.replace('#','')}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="edit-req-subject">Subject / Purpose</Label>
                    <Input id="edit-req-subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
