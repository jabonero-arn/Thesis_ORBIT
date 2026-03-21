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

type Teacher = {
  id: string;
  name: string;
}

type RequestApprovalDialogProps = {
  item: InventoryItem | null
  teachers: Teacher[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (teacherId: string) => void
}

export function RequestApprovalDialog({ item, teachers, open, onOpenChange, onConfirm }: RequestApprovalDialogProps) {
  const [selectedTeacher, setSelectedTeacher] = React.useState<string>("");

  const handleConfirm = () => {
    if (selectedTeacher) {
      onConfirm(selectedTeacher);
    }
  }

  React.useEffect(() => {
    if (!open) {
      // Reset on close
      setTimeout(() => setSelectedTeacher(""), 200);
    }
  }, [open]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Approval for "{item.name}"</DialogTitle>
          <DialogDescription>
            This item requires approval. Please select a teacher to send your borrow request to.
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedTeacher}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
