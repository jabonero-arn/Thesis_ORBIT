
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
import { Loader2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, doc, where, query, getDocs } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudentDepartmentAccessRequest } from "@/lib/types";

type RequestDepartmentAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StudentRequestDepartmentAccessDialog({ open, onOpenChange }: RequestDepartmentAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, studentDepartmentAccessRequests } = useAppContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');
  
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedDepartmentId('');
    setIsLoading(false);
  }
  
  const alreadyRequestedDeptIds = React.useMemo(() => 
    new Set(studentDepartmentAccessRequests.filter(r => r.studentId === user?.uid).map(r => r.departmentId))
  , [studentDepartmentAccessRequests, user]);
  
  const availableDepartments = React.useMemo(() => 
    departments.filter(d => !alreadyRequestedDeptIds.has(d.id))
  , [departments, alreadyRequestedDeptIds]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedDepartmentId || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select a department.",
      });
      return;
    }
    setIsLoading(true);

    try {
        const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);
        if (!selectedDepartment) throw new Error("Selected department not found.");

        const newRequest: Omit<StudentDepartmentAccessRequest, 'id'> = {
            studentId: user.uid,
            studentName: user.displayName || 'Unknown Student',
            departmentId: selectedDepartment.id,
            departmentName: selectedDepartment.name,
            status: 'pending',
            requestedAt: new Date().toISOString(),
        };

        const requestsCollection = collection(firestore, 'student_department_access_requests');
        await addDoc(requestsCollection, newRequest);
        
        toast({
            title: "Request Sent",
            description: `Your access request for the ${selectedDepartment.name} department has been sent for approval.`
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
          <DialogTitle>Request Department Access</DialogTitle>
          <DialogDescription>
            Select a department to request access from a staff member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
                 <div className="grid gap-2">
                    <Label htmlFor="req-dept-select">Department</Label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                        <SelectTrigger id="req-dept-select">
                            <SelectValue placeholder="Select a department..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableDepartments.length > 0 ? availableDepartments.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            )) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">No new departments to request.</div>
                            )}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !selectedDepartmentId}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
