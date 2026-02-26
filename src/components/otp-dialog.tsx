"use client"

import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import type { InventoryItem } from "@/lib/types"

type OtpDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const MOCK_OTP = "123456"

export function OtpDialog({ item, open, onOpenChange, onSuccess }: OtpDialogProps) {
  const [otp, setOtp] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setOtp("")
        setIsLoading(false)
      }, 300)
    }
  }, [open])

  const handleVerify = () => {
    setIsLoading(true)
    setTimeout(() => {
      if (otp === MOCK_OTP) {
        toast({
          title: "Item Unlocked!",
          description: `${item?.name} has been added to your cart.`,
        })
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "Please check the OTP and try again.",
        })
      }
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">OTP Required to Unlock</DialogTitle>
          <DialogDescription>
            This item is locked. Please enter the Teacher-provided OTP to add it to your cart.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="font-semibold text-center text-lg text-primary">{item?.name}</div>
          <div className="grid gap-2">
            <Label htmlFor="otp">One-Time Password</Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="text-lg tracking-widest text-center"
              maxLength={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleVerify} disabled={isLoading || otp.length !== 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
