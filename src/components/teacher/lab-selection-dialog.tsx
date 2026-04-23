
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

  const handleToggleDepartment = (departmentId: string) => {
    setLabRequests(prev => {
        const newMap = new Map(prev);
        if (newMap.has(departmentId)) {
            newMap.delete(departmentId);
        } else {
            newMap.set(departmentId, ""); // Add with empty subject
        }
        return newMap;
    });
  };

  const handleSubjectChange = (departmentId: string, subject: string) => {
    setLabRequests(prev => {
        const newMap = new Map(prev);
        newMap.set(departmentId, subject);
        return newMap;
    });
  }

  const handleSubmit = async () => {
    if (!user || !firestore) return;

    const validRequests = new Map<string, string>();
    for (const [departmentId, subject] of labRequests.entries()) {
        if (subject.trim() !== "") {
            validRequests.set(departmentId, subject);
        }
    }

    if (validRequests.size === 0) {
        toast({
            variant: "destructive",
            title: "No valid requests",
            description: "Please select at least one department and provide a subject for it."
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const requestsCollection = collection(firestore, 'channel_access_requests');
        const now = new Date().toISOString();
        let totalChannelsRequested = 0;

        validRequests.forEach((subject, departmentId) => {
            const department = departments.find(d => d.id === departmentId);
            if (!department) return;

            const channelsInDept = channels.filter(c => c.departmentId === departmentId);
            totalChannelsRequested += channelsInDept.length;

            channelsInDept.forEach(channel => {
                 const newRequestRef = doc(requestsCollection);
                 batch.set(newRequestRef, {
                    teacherId: user.uid,
                    teacherName: user.displayName || 'Unknown Teacher',
                    channelId: channel.id,
                    channelName: channel.name,
                    departmentId: department.id,
                    subject: subject,
                    status: 'pending',
                    requestedAt: now,
                });
            });
        });
        
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, { hasCompletedLabSetup: true });

        await batch.commit();

        toast({
            title: "Requests Sent!",
            description: `Your access requests for ${totalChannelsRequested} lab(s) have been sent.`
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
            Welcome, Teacher! Please select the departments you'll need access to and provide the subject you'll be handling for each.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            {departments.map(dept => (
                <div key={dept.id} className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id={`dept-sel-${dept.id}`} 
                            checked={labRequests.has(dept.id)}
                            onCheckedChange={() => handleToggleDepartment(dept.id)}
                        />
                        <Label htmlFor={`dept-sel-${dept.id}`} className="cursor-pointer font-semibold text-lg">
                            {dept.name}
                        </Label>
                    </div>
                    {labRequests.has(dept.id) && (
                        <div className="pl-8">
                             <Label htmlFor={`dept-subj-${dept.id}`} className="text-xs text-muted-foreground">Subject / Purpose for all labs in {dept.name}</Label>
                            <Input 
                                id={`dept-subj-${dept.id}`}
                                value={labRequests.get(dept.id) || ''}
                                onChange={(e) => handleSubjectChange(dept.id, e.target.value)}
                                placeholder="e.g., CPE 101" 
                                required
                                className="h-9"
                            />
                        </div>
                    )}
                </div>
            ))}
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
