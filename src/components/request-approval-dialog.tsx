
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { InventoryItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { AlertCircle, Loader2 } from "lucide-react"

type Teacher = {
  id: string;
  name: string;
}

type RequestApprovalDialogProps = {
  item: InventoryItem | null
  teachers: Teacher[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (teacherId: string, quantity: number) => void
}

export function RequestApprovalDialog({ item, teachers, open, onOpenChange, onConfirm }: RequestApprovalDialogProps) {
  const [selectedTeacher, setSelectedTeacher] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);

  const handleConfirm = () => {
    if (selectedTeacher) {
      onConfirm(selectedTeacher, quantity);
    }
  }

  React.useEffect(() => {
    if (!open) {
      // Reset on close
      setTimeout(() => {
        setSelectedTeacher("");
        setQuantity(1);
      }, 200);
    } else {
        setQuantity(1);
    }
  }, [open]);

  if (!item) return null;

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        setQuantity(1);
    } else if (num > item.quantity) {
        setQuantity(item.quantity);
    } else if (num < 1) {
        setQuantity(1);
    }
    else {
        setQuantity(num);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141821] border-border/50">
        <DialogHeader>
          <DialogTitle className="text-white font-headline text-2xl uppercase tracking-tighter">Request Access: {item.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This material is restricted. Please select your supervising teacher and the quantity required to submit an approval request.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-6">
             <div className="grid gap-3">
                <Label htmlFor="teacher-select" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Instructor</Label>
                <Select 
                    value={selectedTeacher} 
                    onValueChange={setSelectedTeacher} 
                    disabled={teachers.length === 0}
                >
                    <SelectTrigger id="teacher-select" className="bg-black/20 border-border/40 focus:ring-primary/50">
                        <SelectValue placeholder={teachers.length > 0 ? "Choose your teacher..." : "No teachers available"} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141821] border-border/50">
                        {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {teachers.length === 0 && (
                    <div className="flex items-start gap-2 p-3 text-[11px] bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 mt-1">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>No assigned teachers found for this laboratory. Access permissions must be set by a Supervisor first.</span>
                    </div>
                )}
             </div>

             <div className="grid gap-3">
                <Label htmlFor="quantity-select" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantity Requested (Max: {item.quantity})</Label>
                <div className="flex items-center gap-3">
                    <Input
                        id="quantity-select"
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        min={1}
                        max={item.quantity}
                        className="bg-black/20 border-border/40 focus:ring-primary/50 font-mono text-lg"
                    />
                    <div className="text-xs text-muted-foreground italic shrink-0">Available: {item.quantity}</div>
                </div>
             </div>
        </div>
        <DialogFooter className="bg-black/20 p-4 -mx-6 -mb-6 mt-2 border-t border-border/20 rounded-b-lg">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-white">Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedTeacher || quantity < 1 || quantity > item.quantity || teachers.length === 0}
            className="bg-primary hover:bg-primary/90 text-white px-8 font-bold uppercase tracking-widest text-[10px]"
          >
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
