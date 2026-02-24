"use client"

import * as React from "react"
import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type CheckoutFlowProps = {
  items: InventoryItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type CheckoutStep = "details" | "otp" | "reserve" | "qr" | "confirmation"

export function CheckoutFlow({ items, open, onOpenChange, onSuccess }: CheckoutFlowProps) {
  const [step, setStep] = React.useState<CheckoutStep>("details")
  const [otps, setOtps] = React.useState<{[itemId: string]: string}>({})
  const [reservationDate, setReservationDate] = React.useState<Date>()
  const [reservationTime, setReservationTime] = React.useState<string>("10:00")
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  const lockedItems = items.filter((item) => item.status === "Locked")

  React.useEffect(() => {
    if (open) {
      setStep("details")
      setOtps({})
      setReservationDate(undefined)
      setReservationTime("10:00")
    }
  }, [open])
  
  const handleOtpInputChange = (itemId: string, value: string) => {
    setOtps(prev => ({...prev, [itemId]: value}))
  }

  const handleVerifyOtps = () => {
    setIsLoading(true)
    setTimeout(() => {
      // Mock OTP verification. In a real app, this would be an API call.
      const allOtpsValid = lockedItems.every(item => otps[item.id] === "123456");
      
      if (allOtpsValid) {
        toast({ title: "OTP(s) Verified", description: "You can now proceed." })
        setStep("qr")
      } else {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "One or more OTPs are incorrect. Please check and try again.",
        })
      }
      setIsLoading(false)
    }, 1000)
  }

  const handleBorrow = () => {
    if (lockedItems.length > 0) {
      setStep("otp")
    } else {
      setStep("qr")
    }
  }
  
  const handleReserve = () => {
    if (!reservationDate || !reservationTime) {
         toast({
          variant: "destructive",
          title: "Incomplete Information",
          description: "Please select a date and time for your reservation.",
        })
        return;
    }
    
    setIsLoading(true)
    setTimeout(() => {
      setStep("confirmation")
      setIsLoading(false)
    }, 1000)
  }

  const renderContent = () => {
    if (!items || items.length === 0) return null

    switch (step) {
      case "details":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Checkout</DialogTitle>
              <DialogDescription>
                Review your selected items. You can choose to borrow them now or reserve them for a future date.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto p-1">
              <ul className="grid gap-4">
                {items.map(item => (
                  <li key={item.id} className="flex items-center gap-4">
                     <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={48}
                      className="rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                     <Badge variant={item.status === 'Locked' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('reserve')}>Reserve for Later</Button>
              <Button type="submit" onClick={handleBorrow}>Borrow Now</Button>
            </DialogFooter>
          </>
        )
        
      case "otp":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">OTP Required</DialogTitle>
              <DialogDescription>
                Some items are locked. Please enter the One-Time Password for each item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[300px] overflow-y-auto p-1">
              {lockedItems.map(item => (
                 <div key={item.id} className="grid gap-2">
                    <Label htmlFor={`otp-${item.id}`}>OTP for <span className="font-semibold">{item.name}</span></Label>
                    <Input
                      id={`otp-${item.id}`}
                      type="text"
                      value={otps[item.id] || ""}
                      onChange={(e) => handleOtpInputChange(item.id, e.target.value)}
                      placeholder="Enter 6-digit OTP"
                    />
                 </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button type="submit" onClick={handleVerifyOtps} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Proceed
              </Button>
            </DialogFooter>
          </>
        )
        
      case "reserve":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Reserve Items</DialogTitle>
              <DialogDescription>
                Select a date and time to reserve the selected items. The items will be held for you.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="grid gap-2">
                <Label htmlFor="reservation-date">Reservation Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="reservation-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reservationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reservationDate ? format(reservationDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reservationDate}
                      onSelect={setReservationDate}
                      disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
               </div>
               <div className="grid gap-2">
                <Label htmlFor="reservation-time">Reservation Time</Label>
                <Input 
                    id="reservation-time"
                    type="time"
                    value={reservationTime}
                    onChange={e => setReservationTime(e.target.value)}
                />
               </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button type="submit" onClick={handleReserve} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Reservation
              </Button>
            </DialogFooter>
          </>
        )

      case "qr":
        const transactionData = {
            userId: 'user-1', // from currentUser
            itemIds: items.map(i => i.id),
            timestamp: new Date().toISOString()
        }
        const qrData = `LabFlow-Borrow-${JSON.stringify(transactionData)}`;
        return (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Checkout QR Code</DialogTitle>
              <DialogDescription>
                Present this QR code to the lab staff to complete the checkout process for all items.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData)}`}
                alt="Checkout QR Code"
                width={256}
                height={256}
                className="rounded-lg bg-white p-2"
                data-ai-hint="qr code"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => { onSuccess(); onOpenChange(false)}}>Done</Button>
            </DialogFooter>
          </>
        )
      case "confirmation":
          return (
             <>
                <DialogHeader>
                    <DialogTitle className="font-headline">Reservation Confirmed!</DialogTitle>
                    <DialogDescription>
                        Your items have been reserved. You can claim them on <span className="font-semibold">{reservationDate ? format(reservationDate, 'PPP') : ''} at {reservationTime}</span>.
                    </DialogDescription>
                </DialogHeader>
                 <div className="max-h-[300px] overflow-y-auto p-1 mt-4">
                  <ul className="grid gap-4">
                    {items.map(item => (
                      <li key={item.id} className="flex items-center gap-4">
                         <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={64}
                          height={48}
                          className="rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <DialogFooter>
                    <Button type="button" className="w-full" onClick={() => { onSuccess(); onOpenChange(false) }}>Great, thanks!</Button>
                </DialogFooter>
             </>
          )
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isLoading) return;
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
