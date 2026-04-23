
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

type LabSelectionDialogProps = {
  open: boolean;
  onFinished: () => void;
};

export function LabSelectionDialog({ open, onFinished }: LabSelectionDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, channels } = useAppContext();
  
  const [selectedChannels, setSelectedChannels] = React.useState<Set<string>>(new Set());
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

  const handleSubmit = async () => {
    if (!user || !firestore) return;
    if (selectedChannels.size === 0) {
        toast({
            variant: "destructive",
            title: "No labs selected",
            description: "Please select at least one lab to request access."
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
                subject: 'Initial Access Request', // Generic subject for initial setup
                status: 'pending',
                requestedAt: now,
            });
        });
        
        // Mark setup as complete
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, { hasCompletedLabSetup: true });

        await batch.commit();

        toast({
            title: "Requests Sent!",
            description: `Your access requests for ${selectedChannels.size} labs have been sent for approval.`
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
            Welcome, Teacher! Please select the laboratories you'll need access to for your subjects. Your requests will be sent to the department supervisors for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
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
                                        id={`ch-${channel.id}`} 
                                        checked={selectedChannels.has(channel.id)}
                                        onCheckedChange={() => handleToggleChannel(channel.id)}
                                    />
                                    <Label htmlFor={`ch-${channel.id}`} className="cursor-pointer">
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
          <Button onClick={handleSubmit} disabled={isLoading || selectedChannels.size === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Requests"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
