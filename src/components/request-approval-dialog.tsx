
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Approval for "{item.name}"</DialogTitle>
          <DialogDescription>
            This item requires approval. Please select a teacher and quantity to send your borrow request.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
             <div className="grid gap-2">
                <Label htmlFor="teacher-select">Select Teacher</Label>
                <Select 
                    value={selectedTeacher} 
                    onValueChange={setSelectedTeacher} 
                    disabled={teachers.length === 0}
                >
                    <SelectTrigger id="teacher-select">
                        <SelectValue placeholder={teachers.length > 0 ? "Choose a teacher..." : "No teachers available"} />
                    </SelectTrigger>
                    <SelectContent>
                        {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {teachers.length === 0 && (
                    <div className="flex items-start gap-2 p-3 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 mt-1">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>No assigned teachers found for this lab. Please contact a supervisor to ensure teachers are assigned to this room.</span>
                    </div>
                )}
             </div>
             <div className="grid gap-2">
                <Label htmlFor="quantity-select">Quantity (Max: {item.quantity})</Label>
                <Input
                    id="quantity-select"
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    min={1}
                    max={item.quantity}
                />
             </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedTeacher || quantity < 1 || quantity > item.quantity || teachers.length === 0}
          >
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
