
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
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudentDepartmentAccessRequest, User } from "@/lib/types";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";

type RequestDepartmentAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// State for each request line
type RequestLine = {
    subject: string;
    teacherId: string;
};

export function StudentRequestDepartmentAccessDialog({ open, onOpenChange }: RequestDepartmentAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, studentDepartmentAccessRequests, allUsers } = useAppContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDepts, setSelectedDepts] = React.useState<Map<string, RequestLine>>(new Map());

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedDepts(new Map());
    setIsLoading(false);
  }

  const alreadyRequestedDeptIds = React.useMemo(() =>
    new Set(studentDepartmentAccessRequests.filter(r => r.studentId === user?.uid).map(r => r.departmentId))
  , [studentDepartmentAccessRequests, user]);

  const availableDepartments = React.useMemo(() =>
    departments.filter(d => !alreadyRequestedDeptIds.has(d.id))
  , [departments, alreadyRequestedDeptIds]);

  const teachers = React.useMemo(() =>
      allUsers.filter(u => u.role === 'Teacher')
  , [allUsers]);

  const handleDeptToggle = (checked: boolean, departmentId: string) => {
      setSelectedDepts(prev => {
          const newMap = new Map(prev);
          if (checked) {
              newMap.set(departmentId, { subject: '', teacherId: '' });
          } else {
              newMap.delete(departmentId);
          }
          return newMap;
      });
  };

  const handleRequestChange = (departmentId: string, field: 'subject' | 'teacherId', value: string) => {
      setSelectedDepts(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(departmentId);
          if (current) {
              newMap.set(departmentId, { ...current, [field]: value });
          }
          return newMap;
      });
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !firestore || selectedDepts.size === 0) {
      return;
    }
    
    // Validate that all selected departments have both a subject and a teacher
    for (const [deptId, req] of selectedDepts.entries()) {
        if (!req.subject.trim() || !req.teacherId) {
            const deptName = departments.find(d => d.id === deptId)?.name || 'the selected department';
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: `Please provide a subject and select a teacher for ${deptName}.`,
            });
            return;
        }
    }
    
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const requestsCollection = collection(firestore, 'student_department_access_requests');
        const now = new Date().toISOString();

        selectedDepts.forEach((requestData, departmentId) => {
            const department = departments.find(d => d.id === departmentId);
            if (!department) return;

            const newRequest: Omit<StudentDepartmentAccessRequest, 'id'> = {
                studentId: user.uid,
                studentName: user.displayName || 'Unknown Student',
                departmentId: department.id,
                departmentName: department.name,
                subject: requestData.subject,
                teacherId: requestData.teacherId,
                status: 'pending',
                requestedAt: now,
            };
            const newDocRef = doc(requestsCollection);
            batch.set(newDocRef, newRequest);
        });

        await batch.commit();

        toast({
            title: "Requests Sent",
            description: `Your access requests have been sent for approval.`
        });
        onOpenChange(false);
    } catch (error: any) {
      console.error("Access request error:", error);
       toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Could not send your requests.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Department Access</DialogTitle>
          <DialogDescription>
            Select the departments you need access to, then provide the subject and teacher for each.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                 {availableDepartments.length > 0 ? availableDepartments.map(d => (
                    <div key={d.id} className="space-y-3 rounded-lg border border-transparent p-2 data-[checked=true]:border-border data-[checked=true]:bg-black/20" data-checked={selectedDepts.has(d.id)}>
                        <div className="flex items-center space-x-3">
                            <Checkbox 
                                id={`dept-${d.id}`}
                                checked={selectedDepts.has(d.id)}
                                onCheckedChange={(checked) => handleDeptToggle(!!checked, d.id)}
                            />
                             <Label htmlFor={`dept-${d.id}`} className="font-semibold text-base cursor-pointer">
                                {d.name}
                            </Label>
                        </div>
                        {selectedDepts.has(d.id) && (
                            <div className="pl-8 space-y-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`subject-${d.id}`}>Subject Name</Label>
                                    <Input
                                        id={`subject-${d.id}`}
                                        placeholder="e.g., CPE 101"
                                        value={selectedDepts.get(d.id)?.subject || ''}
                                        onChange={(e) => handleRequestChange(d.id, 'subject', e.target.value)}
                                        required
                                    />
                                </div>
                                 <div className="grid gap-1.5">
                                    <Label htmlFor={`teacher-${d.id}`}>Teacher</Label>
                                    <Select
                                        value={selectedDepts.get(d.id)?.teacherId || ''}
                                        onValueChange={(value) => handleRequestChange(d.id, 'teacherId', value)}
                                        required
                                    >
                                        <SelectTrigger id={`teacher-${d.id}`}>
                                            <SelectValue placeholder="Select a teacher..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                 )) : (
                    <p className="text-center text-sm text-muted-foreground py-8">
                        You have already requested access to all available departments.
                    </p>
                 )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || selectedDepts.size === 0}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request(s)
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
