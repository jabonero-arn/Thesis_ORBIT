
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
import { Loader2, X, Building2, Search, UserCheck } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { useAppContext } from "@/context/app-context";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RequestDepartmentAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StudentRequestDepartmentAccessDialog({ open, onOpenChange }: RequestDepartmentAccessDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { departments, allUsers } = useAppContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDeptIds, setSelectedDeptIds] = React.useState<Set<string>>(new Set());
  const [purpose, setPurpose] = React.useState("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedDeptIds(new Set());
    setPurpose("");
    setSelectedTeacherId("");
    setIsLoading(false);
  }

  const availableDepartments = React.useMemo(() =>
    departments.filter(d => !selectedDeptIds.has(d.id))
  , [departments, selectedDeptIds]);

  const teachers = React.useMemo(() => 
    allUsers.filter(u => u.role === 'Teacher')
  , [allUsers]);

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

    if (!user || !firestore || selectedDeptIds.size === 0 || !selectedTeacherId) {
      toast({
        variant: "destructive",
        title: "Incomplete Request",
        description: "Please select at least one facility and your supervising teacher."
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
                subject: purpose || "Not specified",
                teacherId: selectedTeacherId,
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
      <DialogContent className="max-w-4xl bg-[#141821] border-border/50 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-white">Request Laboratory Access</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 min-h-[450px]">
                {/* Left Side: Selection Area */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">1. Assigned Supervising Teacher</Label>
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                            <SelectTrigger className="bg-black/40 border-border/40 text-white">
                                <SelectValue placeholder="Select your Instructor..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141821] border-border/50">
                                {teachers.map(teacher => (
                                    <SelectItem key={teacher.id} value={teacher.id}>
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-primary" />
                                            <span>{teacher.displayName}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground italic">Your requests for locked materials will be automatically routed to this teacher.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">2. Selected Facilities</Label>
                        <div className="min-h-[50px] p-1.5 rounded-lg border border-border/40 bg-black/40 flex flex-wrap gap-2 items-center">
                            <Search className="h-4 w-4 text-muted-foreground/50 ml-2 mr-1" />
                            {selectedDeptIds.size > 0 ? (
                                Array.from(selectedDeptIds).map(id => {
                                    const d = departments.find(dept => dept.id === id);
                                    if (!d) return null;
                                    return (
                                        <div 
                                            key={id}
                                            onClick={() => handleToggleDept(id)}
                                            className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-full border border-zinc-600 bg-zinc-800/80 w-fit animate-in fade-in zoom-in-95 duration-200 cursor-pointer hover:bg-zinc-700 transition-colors"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="bg-zinc-700 text-[10px]">
                                                    <Building2 className="h-3 w-3" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-white">{d.name}</span>
                                            <X className="h-3 w-3 text-muted-foreground hover:text-white transition-colors ml-1" />
                                        </div>
                                    );
                                })
                            ) : (
                                <span className="text-sm text-muted-foreground/40 px-2 italic">Select facilities below...</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Available Facilities</h3>
                        <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted">
                            {availableDepartments.length > 0 ? availableDepartments.map(d => (
                                <div 
                                    key={d.id}
                                    onClick={() => handleToggleDept(d.id)}
                                    className="py-2.5 px-3 rounded-md hover:bg-white/5 transition-all text-white/90 text-sm font-medium cursor-pointer flex items-center justify-between group"
                                >
                                    <span>{d.name}</span>
                                    <span className="opacity-0 group-hover:opacity-100 text-[10px] uppercase text-primary font-bold">Select</span>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground/60 py-4 text-center italic">
                                    No more facilities available.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Purpose Area */}
                <div className="space-y-4 border-l border-border/20 pl-6">
                    <div className="grid gap-2">
                        <Label htmlFor="purpose" className="text-sm font-bold text-white uppercase tracking-tighter">3. Purpose / Subject Information:</Label>
                        <Textarea
                            id="purpose"
                            placeholder="Please provide the specific reason for your access request here (e.g. CPE 301 - Lab Session)..."
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="min-h-[280px] bg-black/20 border-border/50 resize-none focus-visible:ring-primary/50 text-sm"
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
                        disabled={isLoading || selectedDeptIds.size === 0 || !selectedTeacherId}
                        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 font-bold uppercase tracking-widest text-xs"
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
