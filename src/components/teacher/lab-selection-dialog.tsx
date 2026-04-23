
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Input } from "@/components/ui/input";

type LabSelectionDialogProps = {
  open: boolean;
  onFinished: () => void;
};

export function LabSelectionDialog({ open, onFinished }: LabSelectionDialogProps) {
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
        newMap.set(channelId, "");
      }
      return newMap;
    });
  };

  const handleSubjectChange = (channelId: string, subject: string) => {
    setLabRequests(prev => {
        const newMap = new Map(prev);
        newMap.set(channelId, subject);
        return newMap;
    });
  }

  const handleSubmit = async () => {
    if (!user || !firestore) return;

    const validRequests = new Map<string, string>();
    for (const [channelId, subject] of labRequests.entries()) {
        if (subject.trim() !== "") {
            validRequests.set(channelId, subject);
        }
    }

    if (validRequests.size === 0) {
        toast({
            variant: "destructive",
            title: "No valid requests",
            description: "Please select at least one lab and provide a subject for it."
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
        
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, { hasCompletedLabSetup: true });

        await batch.commit();

        toast({
            title: "Requests Sent!",
            description: `Your access requests for ${validRequests.size} labs have been sent for approval.`
        });
        onFinished();

    } catch (error: any) {
        console.error("Lab selection error:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not send access requests." });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Laboratory Access</DialogTitle>
          <DialogDescription>
            Welcome, Teacher! Please select the laboratories you'll need access to and provide the subject you'll be handling for each.
          </DialogDescription>
        </DialogHeader>
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
                                            id={`lab-sel-${channel.id}`} 
                                            checked={labRequests.has(channel.id)}
                                            onCheckedChange={() => handleToggleChannel(channel.id)}
                                        />
                                        <Label htmlFor={`lab-sel-${channel.id}`} className="cursor-pointer font-medium">
                                            {channel.name.replace('#', '')}
                                        </Label>
                                    </div>
                                    {labRequests.has(channel.id) && (
                                        <div className="pl-6">
                                             <Label htmlFor={`lab-subj-${channel.id}`} className="text-xs text-muted-foreground">Subject / Purpose</Label>
                                            <Input 
                                                id={`lab-subj-${channel.id}`}
                                                value={labRequests.get(channel.id) || ''}
                                                onChange={(e) => handleSubjectChange(channel.id, e.target.value)}
                                                placeholder="e.g., CPE 101" 
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
          <Button onClick={handleSubmit} disabled={isLoading || labRequests.size === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Requests"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
