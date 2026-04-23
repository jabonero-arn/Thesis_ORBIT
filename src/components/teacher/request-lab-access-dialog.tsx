
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
  
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setLabRequests(new Map());
    setIsLoading(false);
  }

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


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validRequests = new Map<string, string>();
    for (const [departmentId, subject] of labRequests.entries()) {
        if (subject.trim() !== "") {
            validRequests.set(departmentId, subject);
        }
    }

    if (validRequests.size === 0 || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select at least one department and provide a subject/purpose for it.",
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

        await batch.commit();

        toast({
            title: "Request Sent",
            description: `Your access requests for ${totalChannelsRequested} lab(s) have been sent.`
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
            Select the departments you need access to and provide the reason (e.g., subject name).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                 {departments.map(dept => (
                    <div key={dept.id} className="space-y-3">
                         <div className="flex items-center space-x-2">
                            <Checkbox 
                                id={`req-dept-${dept.id}`} 
                                checked={labRequests.has(dept.id)}
                                onCheckedChange={() => handleToggleDepartment(dept.id)}
                            />
                            <Label htmlFor={`req-dept-${dept.id}`} className="cursor-pointer font-semibold text-lg">
                                {dept.name}
                            </Label>
                        </div>
                        {labRequests.has(dept.id) && (
                            <div className="pl-8">
                                 <Label htmlFor={`req-subj-${dept.id}`} className="text-xs text-muted-foreground">Subject / Purpose for all labs in {dept.name}</Label>
                                <Input 
                                    id={`req-subj-${dept.id}`}
                                    value={labRequests.get(dept.id) || ''}
                                    onChange={(e) => handleSubjectChange(dept.id, e.target.value)}
                                    placeholder="e.g., Embedded Systems 101" 
                                    required
                                    className="h-9"
                                />
                            </div>
                        )}
                    </div>
                ))}
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
