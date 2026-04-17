"use client"

import * as React from "react"
import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
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

type BorrowFlowProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type BorrowStep = "details" | "otp" | "qr"

const MOCK_OTP = "123456"

export function BorrowFlow({ item, open, onOpenChange }: BorrowFlowProps) {
  const [step, setStep] = React.useState<BorrowStep>("details")
  const [otp, setOtp] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (item) {
      setStep(item.status === "Locked" ? "otp" : "details")
      setOtp("")
    }
  }, [item])

  const handleOtpSubmit = () => {
    setIsLoading(true)
    setTimeout(() => {
      if (otp === MOCK_OTP) {
        toast({
          title: "OTP Verified",
          description: "You can now proceed to generate the QR code.",
        })
        setStep("details")
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

  const handleGenerateQr = () => {
    setIsLoading(true)
    setTimeout(() => {
      setStep("qr")
      setIsLoading(false)
    }, 1000)
  }

  const renderContent = () => {
    if (!item) return null

    switch (step) {
      case "otp":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">OTP Required</DialogTitle>
              <DialogDescription>
                This item is locked. Please enter the One-Time Password provided by a teacher to proceed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" onClick={handleOtpSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify OTP
              </Button>
            </DialogFooter>
          </>
        )
      case "details":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Confirm Borrowing</DialogTitle>
              <DialogDescription>
                You are about to generate a QR code to borrow the following item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={80}
                  height={60}
                  className="rounded-md object-cover"
                />
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" onClick={handleGenerateQr} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate QR Code
              </Button>
            </DialogFooter>
          </>
        )
      case "qr":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Your QR Code</DialogTitle>
              <DialogDescription>
                Present this QR code to the lab staff to complete the checkout process.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=Orbit-Item-${item.id}`}
                alt="QR Code"
                width={256}
                height={256}
                className="rounded-lg bg-white p-2"
                data-ai-hint="qr code"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
