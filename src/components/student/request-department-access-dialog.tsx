
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, X, Building2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  const [selectedDeptIds, setSelectedDeptIds] = React.useState<Set<string>>(new Set());
  const [purpose, setPurpose] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedDeptIds(new Set());
    setPurpose("");
    setIsLoading(false);
  }

  const alreadyRequestedDeptIds = React.useMemo(() =>
    new Set(studentDepartmentAccessRequests.filter(r => r.studentId === user?.uid).map(r => r.departmentId))
  , [studentDepartmentAccessRequests, user]);

  const availableDepartments = React.useMemo(() =>
    departments.filter(d => !alreadyRequestedDeptIds.has(d.id))
  , [departments, alreadyRequestedDeptIds]);

  const handleToggleDept = (departmentId: string) => {
    setSelectedDeptIds(prev => {
        const next = new Set(prev);
        if (next.has(departmentId)) {
            next.delete(departmentId);
        } else {
            next.add(departmentId);
        }
        return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !firestore || selectedDeptIds.size === 0) {
      return;
    }
    
    if (!purpose.trim()) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please provide a purpose for your access request.",
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const requestsCollection = collection(firestore, 'student_department_access_requests');
        const now = new Date().toISOString();

        selectedDeptIds.forEach((departmentId) => {
            const department = departments.find(d => d.id === departmentId);
            if (!department) return;

            const newRequest = {
                studentId: user.uid,
                studentName: user.displayName || 'Unknown Student',
                departmentId: department.id,
                departmentName: department.name,
                subject: purpose,
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
      <DialogContent className="max-w-3xl bg-[#141821] border-border/50 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-white">Request Laboratory Access</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-[400px]">
                {/* Left Side: Selection Area */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Available Facilities</h3>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {availableDepartments.length > 0 ? availableDepartments.map(d => {
                            const isSelected = selectedDeptIds.has(d.id);
                            return (
                                <div 
                                    key={d.id}
                                    onClick={() => handleToggleDept(d.id)}
                                    className="cursor-pointer group"
                                >
                                    {isSelected ? (
                                        <div className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-full border border-zinc-500 bg-zinc-800/50 w-fit animate-in fade-in zoom-in-95 duration-200">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="bg-zinc-700 text-[10px]">
                                                    <Building2 className="h-3 w-3" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-white">{d.name}</span>
                                            <X className="h-3 w-3 text-muted-foreground hover:text-white transition-colors ml-1" />
                                        </div>
                                    ) : (
                                        <div className="py-2 px-2 rounded-md hover:bg-white/5 transition-colors text-white font-medium">
                                            {d.name}
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-muted-foreground py-8">
                                No more facilities available to request.
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Side: Purpose Area */}
                <div className="space-y-4 border-l border-border/30 pl-6">
                    <div className="grid gap-2">
                        <Label htmlFor="purpose" className="text-sm font-bold text-white">Purpose of Request:</Label>
                        <Textarea
                            id="purpose"
                            placeholder="Please provide the specific reason for your access request here..."
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="min-h-[250px] bg-black/20 border-border/50 resize-none focus-visible:ring-primary/50"
                            required
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="p-6 bg-black/20 border-t border-border/30">
                <div className="flex gap-3">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isLoading}
                        className="text-muted-foreground hover:text-white hover:bg-white/5"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isLoading || selectedDeptIds.size === 0}
                        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request(s)
                    </Button>
                </div>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
