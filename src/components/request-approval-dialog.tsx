
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
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger id="teacher-select">
                        <SelectValue placeholder="Choose a teacher..." />
                    </SelectTrigger>
                    <SelectContent>
                        {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
          <Button onClick={handleConfirm} disabled={!selectedTeacher || quantity < 1 || quantity > item.quantity}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
