
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

  const [labRequests, setLabRequests] = React.useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleToggleChannel = (channelId: string) => {
    setLabRequests(prev => {
      const newMap = new Map(prev);
      if (newMap.has(channelId)) {
        newMap.delete(channelId);
      } else {
        newMap.set(channelId, ""); // Initialize with empty subject
      }
      return newMap;
    });
  };
  
  const handleSubjectChange = (channelId: string, subject: string) => {
    setLabRequests(prev => {
        const newMap = new Map(prev);
        newMap.set(channelId, subject); // Update subject
        return newMap;
    });
  }

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setLabRequests(new Map());
    setIsLoading(false);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validRequests = new Map<string, string>();
    for (const [channelId, subject] of labRequests.entries()) {
        if (subject.trim() !== "") {
            validRequests.set(channelId, subject);
        }
    }

    if (validRequests.size === 0 || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select at least one lab and provide a subject/purpose for it.",
      });
      return;
    }
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const requestsCollection = collection(firestore, 'channel_access_requests');
        const now = new Date().toISOString();

        validRequests.forEach((subject, channelId) => {
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
            description: `Your access requests for ${validRequests.size} lab(s) have been sent.`
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
            Select the labs you need access to and provide the reason (e.g., subject name) for each.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                 {departments.map(dept => {
                    const deptChannels = channels.filter(c => c.departmentId === dept.id);
                    if (deptChannels.length === 0) return null;
                    return (
                        <div key={dept.id} className="space-y-3">
                            <h3 className="font-semibold text-lg mb-2">{dept.name}</h3>
                            <div className="pl-2 space-y-4">
                                {deptChannels.map(channel => (
                                    <div key={channel.id} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`req-ch-${channel.id}`} 
                                                checked={labRequests.has(channel.id)}
                                                onCheckedChange={() => handleToggleChannel(channel.id)}
                                            />
                                            <Label htmlFor={`req-ch-${channel.id}`} className="cursor-pointer font-medium">
                                                {channel.name.replace('#', '')}
                                            </Label>
                                        </div>
                                        {labRequests.has(channel.id) && (
                                            <div className="pl-6">
                                                <Label htmlFor={`req-subj-${channel.id}`} className="text-xs text-muted-foreground">Subject / Purpose</Label>
                                                <Input 
                                                    id={`req-subj-${channel.id}`}
                                                    value={labRequests.get(channel.id) || ''}
                                                    onChange={(e) => handleSubjectChange(channel.id, e.target.value)}
                                                    placeholder="e.g., Embedded Systems 101" 
                                                    required
                                                    className="h-8"
                                                />
                                            </div>
                                        )}
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
                <Button type="submit" disabled={isLoading || labRequests.size === 0}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request(s)
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
