"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, X, ShoppingCart } from "lucide-react"

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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

type CheckoutFlowProps = {
  items: InventoryItem[]
  onClear: () => void
  onSuccess: () => void
}

function CheckoutForm({ items, onClear, onSuccess }: CheckoutFlowProps) {
  const [isReserve, setIsReserve] = React.useState(false)
  const [reservationDate, setReservationDate] = React.useState<Date>()
  const [startTime, setStartTime] = React.useState<string>("14:00")
  const [endTime, setEndTime] = React.useState<string>("16:00")
  
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  const handleSubmit = () => {
    if (isReserve) {
      handleReserve()
    } else {
      handleBorrow()
    }
  }

  const handleBorrow = () => {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "QR Code Ready!", description: "Show this to the lab staff to pick up your items." })
      onSuccess()
      setIsLoading(false)
    }, 1000)
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="hidden md:flex justify-between items-center pb-2 border-b border-border/50">
            <h2 className="font-headline text-lg font-bold">Cart/Order Menu</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">Select items to add them to your cart.</p>
        </div>
      </div>
    );
  }

  return (
      <>
        <div className="hidden md:flex justify-between items-center pb-2 border-b border-border/50">
          <h2 className="font-headline text-lg font-bold">Cart/Order Menu</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
            <X className="h-4 w-4"/>
          </Button>
        </div>
        
        <div className="flex-1 my-4 space-y-2 overflow-y-auto px-1">
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
                {isReserve ? 'Reserve for Later' : 'Immediate Borrow'}
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
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : isReserve ? (
                    'Submit Reservation'
                ) : (
                    'Generate QR Code'
                )}
            </Button>
        </div>
      </>
  )
}

export function CheckoutFlow(props: CheckoutFlowProps) {
  const isMobile = useIsMobile();
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  const handleSuccess = () => {
    props.onSuccess();
    setMobileSheetOpen(false);
  }

  // Mobile version: FAB + Bottom Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {props.items.length > 0 && (
          <SheetTrigger asChild>
            <Button className="md:hidden fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-lg shadow-primary/30 z-40 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">{props.items.length}</span>
              <span className="sr-only">View Cart</span>
            </Button>
          </SheetTrigger>
        )}
        <SheetContent side="bottom" className="h-[90dvh] rounded-t-2xl flex flex-col p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-4 border-b">
            <SheetHeader className="text-left">
              <SheetTitle className="font-headline text-2xl">Your Order</SheetTitle>
            </SheetHeader>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto p-4">
             <CheckoutForm {...props} onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop version: Static Sidebar
  return (
    <div className="hidden md:flex w-80 bg-[#141821] p-4 flex-col border-l border-border/50">
      <CheckoutForm {...props} />
    </div>
  )
}
