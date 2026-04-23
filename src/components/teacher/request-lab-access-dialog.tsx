
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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Department, Channel } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/app-context";


type RequestLabAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RequestLabAccessDialog({ open, onOpenChange }: RequestLabAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, channels } = useAppContext();

  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');
  const [selectedChannelId, setSelectedChannelId] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  
  const availableChannels = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return channels.filter(c => c.departmentId === selectedDepartmentId);
  }, [channels, selectedDepartmentId]);

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);
  
   React.useEffect(() => {
    setSelectedChannelId('');
  }, [selectedDepartmentId]);

  const resetForm = () => {
    setSelectedDepartmentId('');
    setSelectedChannelId('');
    setSubject('');
    setIsLoading(false);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedChannelId || !subject || !user || !firestore || !selectedDepartmentId) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill out all fields.",
      });
      return;
    }
    setIsLoading(true);

    try {
        const selectedChannel = channels.find(c => c.id === selectedChannelId);
        if (!selectedChannel) throw new Error("Selected channel not found.");

        const accessRequest = {
            teacherId: user.uid,
            teacherName: user.displayName || 'Unknown Teacher',
            channelId: selectedChannelId,
            channelName: selectedChannel.name,
            departmentId: selectedDepartmentId,
            subject: subject,
            status: 'pending',
            requestedAt: new Date().toISOString(),
        }

        await addDoc(collection(firestore, 'channel_access_requests'), accessRequest);

        toast({
            title: "Request Sent",
            description: `Your request to access ${selectedChannel.name.replace('#','')} has been sent for approval.`
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("Access request error:", error);
       toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Could not send your request.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Laboratory Access</DialogTitle>
          <DialogDescription>
            Select the lab you need access to and provide the reason (e.g., subject name).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                    <Label htmlFor="req-department">Department</Label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} required>
                      <SelectTrigger id="req-department"><SelectValue placeholder="Select a department..." /></SelectTrigger>
                      <SelectContent>{departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="req-channel">Laboratory / Room</Label>
                    <Select value={selectedChannelId} onValueChange={setSelectedChannelId} required disabled={!selectedDepartmentId}>
                      <SelectTrigger id="req-channel"><SelectValue placeholder="Select a room..." /></SelectTrigger>
                      <SelectContent>{availableChannels.map(c => (<SelectItem key={c.id} value={c.id}>{c.name.replace('#','')}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="req-subject">Subject / Purpose</Label>
                    <Input id="req-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Embedded Systems 101" required />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
