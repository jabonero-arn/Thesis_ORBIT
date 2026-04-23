
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
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Checkbox } from "@/components/ui/checkbox";


type RequestLabAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RequestLabAccessDialog({ open, onOpenChange }: RequestLabAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, channels } = useAppContext();

  const [selectedChannels, setSelectedChannels] = React.useState<Set<string>>(new Set());
  const [subject, setSubject] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleToggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedChannels(new Set());
    setSubject('');
    setIsLoading(false);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedChannels.size === 0 || !subject || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select at least one lab and provide a subject/purpose.",
      });
      return;
    }
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const requestsCollection = collection(firestore, 'channel_access_requests');
        const now = new Date().toISOString();

        selectedChannels.forEach(channelId => {
            const channel = channels.find(c => c.id === channelId);
            if (!channel) return;
            const department = departments.find(d => d.id === channel.departmentId);
            if (!department) return;

            const newRequestRef = doc(requestsCollection);
            batch.set(newRequestRef, {
                teacherId: user.uid,
                teacherName: user.displayName || 'Unknown Teacher',
                channelId: channelId,
                channelName: channel.name,
                departmentId: department.id,
                subject: subject,
                status: 'pending',
                requestedAt: now,
            });
        });

        await batch.commit();

        toast({
            title: "Request Sent",
            description: `Your access requests for ${selectedChannels.size} lab(s) have been sent.`
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("Access request error:", error);
       toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Could not send your request(s).",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Laboratory Access</DialogTitle>
          <DialogDescription>
            Select the labs you need access to and provide the reason (e.g., subject name).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                <div className="grid gap-2 px-1">
                    <Label htmlFor="req-subject">Subject / Purpose</Label>
                    <Input id="req-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Embedded Systems 101" required />
                </div>
                 {departments.map(dept => {
                    const deptChannels = channels.filter(c => c.departmentId === dept.id);
                    if (deptChannels.length === 0) return null;
                    return (
                        <div key={dept.id}>
                            <h3 className="font-semibold text-lg mb-2">{dept.name}</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {deptChannels.map(channel => (
                                    <div key={channel.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent/50">
                                        <Checkbox 
                                            id={`req-ch-${channel.id}`} 
                                            checked={selectedChannels.has(channel.id)}
                                            onCheckedChange={() => handleToggleChannel(channel.id)}
                                        />
                                        <Label htmlFor={`req-ch-${channel.id}`} className="cursor-pointer">
                                            {channel.name.replace('#', '')}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || selectedChannels.size === 0}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request(s)
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
