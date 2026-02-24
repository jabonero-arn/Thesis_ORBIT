"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, X } from "lucide-react"

import type { InventoryItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"


type CheckoutFlowProps = {
  items: InventoryItem[]
  onClear: () => void
  onSuccess: () => void
}

export function CheckoutFlow({ items, onClear, onSuccess }: CheckoutFlowProps) {
  const [isReserve, setIsReserve] = React.useState(false)
  const [reservationDate, setReservationDate] = React.useState<Date>()
  const [startTime, setStartTime] = React.useState<string>("14:00")
  const [endTime, setEndTime] = React.useState<string>("16:00")
  
  const [isOtpOpen, setIsOtpOpen] = React.useState(false)
  const [otps, setOtps] = React.useState<{[itemId: string]: string}>({})
  
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  const lockedItems = items.filter((item) => item.status === "Locked")

  const handleSubmit = () => {
    if (isReserve) {
      handleReserve()
    } else {
      handleBorrow()
    }
  }

  const handleBorrow = () => {
    if (lockedItems.length > 0) {
      setOtps({})
      setIsOtpOpen(true)
    } else {
      // In a real app, this would trigger the final borrow transaction
      setIsLoading(true)
      setTimeout(() => {
        toast({ title: "Order Submitted!", description: "Your items have been borrowed." })
        onSuccess()
        setIsLoading(false)
      }, 1000)
    }
  }
  
  const handleReserve = () => {
    if (!reservationDate || !startTime || !endTime) {
         toast({
          variant: "destructive",
          title: "Incomplete Information",
          description: "Please select a date and time for your reservation.",
        })
        return;
    }
    
    setIsLoading(true)
    setTimeout(() => {
       toast({ title: "Reservation Confirmed!", description: `Items reserved for ${format(reservationDate, "PPP")} from ${startTime} to ${endTime}` })
       onSuccess()
       setIsLoading(false)
    }, 1000)
  }

  const handleVerifyOtps = () => {
    setIsLoading(true)
    setTimeout(() => {
      const allOtpsValid = lockedItems.every(item => otps[item.id] === "123456");
      
      if (allOtpsValid) {
        toast({ title: "OTP(s) Verified", description: "Your borrow request is being processed." })
        setIsOtpOpen(false)
        onSuccess()
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
  
  const handleOtpInputChange = (itemId: string, value: string) => {
    setOtps(prev => ({...prev, [itemId]: value}))
  }

  if (items.length === 0) {
    return (
        <div className="w-80 bg-[#141821] p-4 flex flex-col border-l border-border/50">
             <h2 className="font-headline text-lg font-bold pb-2 border-b border-border/50">Cart/Order Menu</h2>
             <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-center">Select items to add them to your cart.</p>
             </div>
        </div>
    );
  }

  return (
    <>
      <div className="w-80 bg-[#141821] p-4 flex flex-col border-l border-border/50">
        <div className="flex justify-between items-center pb-2 border-b border-border/50">
          <h2 className="font-headline text-lg font-bold">Cart/Order Menu</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
            <X className="h-4 w-4"/>
          </Button>
        </div>
        
        <div className="flex-1 my-4 space-y-2 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="text-foreground/90 bg-black/20 p-2 rounded-md text-sm">
              {item.name}
            </div>
          ))}
        </div>
        
        <Separator className="my-2 bg-border/50"/>
        
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="reservation-mode" className="font-medium">
                {isReserve ? 'Reserve' : 'Immediate Borrow'}
                </Label>
                <Switch
                id="reservation-mode"
                checked={isReserve}
                onCheckedChange={setIsReserve}
                />
            </div>
            
            {isReserve && (
                <div className="grid gap-3 p-3 rounded-lg bg-black/20 border border-border/50">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="reservation-date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal bg-input",
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
                    <div className="flex items-center gap-2">
                        <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-input" />
                        <span className="text-muted-foreground">-</span>
                        <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-input" />
                    </div>
                </div>
            )}
            
            <Button onClick={handleSubmit} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Submit Order'}
            </Button>
        </div>
      </div>

      <Dialog open={isOtpOpen} onOpenChange={setIsOtpOpen}>
        <DialogContent>
           <DialogHeader>
              <DialogTitle className="font-headline text-2xl">OTP Required</DialogTitle>
              <DialogDescription>
                Some items are locked. Please enter the Teacher-provided OTP for each item to proceed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[calc(100vh-250px)] overflow-y-auto p-1">
              {lockedItems.map(item => (
                 <div key={item.id} className="grid gap-2 p-4 rounded-lg bg-background/50">
                    <Label htmlFor={`otp-${item.id}`}>OTP for <span className="font-semibold text-primary">{item.name}</span></Label>
                    <Input
                      id={`otp-${item.id}`}
                      type="text"
                      value={otps[item.id] || ""}
                      onChange={(e) => handleOtpInputChange(item.id, e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="text-lg tracking-widest text-center"
                    />
                 </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOtpOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleVerifyOtps} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Submit
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
