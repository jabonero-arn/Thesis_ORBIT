"use client"

import * as React from "react"
import Image from "next/image"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, X, ShoppingCart, Minus, Plus } from "lucide-react"

import type { BorrowHistory, CartItem, InventoryItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { currentUser } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAppContext } from "@/context/app-context"

type CheckoutFlowProps = {
  items: CartItem[]
  onClear: () => void
  onSuccess: () => void
  onItemQuantityChange: (itemId: string, newQuantity: number) => void
}

function CheckoutForm({ items: cartItems, onClear, onSuccess, onItemQuantityChange }: CheckoutFlowProps) {
  const [isReserve, setIsReserve] = React.useState(false)
  const [reservationDate, setReservationDate] = React.useState<Date>()
  const [startTime, setStartTime] = React.useState<string>("14:00")
  const [endTime, setEndTime] = React.useState<string>("16:00")
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [isQrCodeOpen, setIsQrCodeOpen] = React.useState(false)
  const { toast } = useToast()
  const { setItems, setBorrowHistory } = useAppContext();

  const handleSubmit = () => {
    if (isReserve) {
      handleReserve()
    } else {
      handleBorrow()
    }
  }

  const handleBorrow = () => {
    setIsLoading(true);

    const newHistoryRecords: BorrowHistory[] = [];
    const itemUpdates: { [id: string]: number } = {};

    cartItems.forEach(({ item, quantity }) => {
        for (let i = 0; i < quantity; i++) {
            newHistoryRecords.push({
                id: `bh-${Date.now()}-${item.id}-${i}`,
                studentName: currentUser.name,
                itemName: item.name,
                date: new Date().toISOString().split('T')[0],
                status: 'Active', // Directly borrowed
            });
        }
        itemUpdates[item.id] = (itemUpdates[item.id] || 0) + quantity;
    });

    setBorrowHistory(prev => [...newHistoryRecords, ...prev]);

    setItems(prevItems => prevItems.map(item => {
        if (itemUpdates[item.id]) {
            const newQuantity = item.quantity - itemUpdates[item.id];
            return {
                ...item,
                quantity: newQuantity,
                status: newQuantity > 0 ? item.status : 'Borrowed'
            };
        }
        return item;
    }));
    
    setTimeout(() => {
      setIsLoading(false)
      setIsQrCodeOpen(true)
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
    
    setIsLoading(true);
    const newHistoryRecords: BorrowHistory[] = [];
    const itemUpdates: { [id: string]: number } = {};

    cartItems.forEach(({ item, quantity }) => {
        for (let i = 0; i < quantity; i++) {
            newHistoryRecords.push({
                id: `bh-${Date.now()}-${item.id}-${i}`,
                studentName: currentUser.name,
                itemName: item.name,
                date: format(reservationDate, "yyyy-MM-dd"),
                status: 'Approved', // Reserved for pickup
            });
        }
        itemUpdates[item.id] = (itemUpdates[item.id] || 0) + quantity;
    });
    
    setBorrowHistory(prev => [...newHistoryRecords, ...prev]);

    setItems(prevItems => prevItems.map(item => {
        if (itemUpdates[item.id]) {
            const newQuantity = item.quantity - itemUpdates[item.id];
            return {
                ...item,
                quantity: newQuantity,
                status: newQuantity > 0 ? item.status : 'Borrowed'
            };
        }
        return item;
    }));

    setTimeout(() => {
       toast({ title: "Reservation Confirmed!", description: `Items reserved for ${format(reservationDate, "PPP")} from ${startTime} to ${endTime}` })
       onSuccess()
       setIsLoading(false)
    }, 1000)
  }

  const handleQrDialogClose = () => {
    setIsQrCodeOpen(false)
    onSuccess()
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="hidden md:flex justify-between items-center pb-2 border-b border-border/50">
            <h2 className="font-headline text-lg font-bold">Your Cart</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center px-4">Select items to add them to your cart.</p>
        </div>
      </div>
    );
  }

  const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
      <>
        <div className="hidden md:flex justify-between items-center pb-2 border-b border-border/50">
          <h2 className="font-headline text-lg font-bold">Your Cart</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
            <X className="h-4 w-4"/>
          </Button>
        </div>
        
        <div className="flex-1 my-4 space-y-2 overflow-y-auto px-1">
          {cartItems.map(({ item, quantity }) => (
            <div key={item.id} className="text-foreground/90 bg-black/20 p-2 rounded-md text-sm flex justify-between items-center">
              <span className="truncate pr-2">{item.name}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onItemQuantityChange(item.id, quantity - 1)}>
                      <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{quantity}</span>
                   <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onItemQuantityChange(item.id, quantity + 1)}>
                      <Plus className="h-3 w-3" />
                  </Button>
              </div>
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

        <Dialog open={isQrCodeOpen} onOpenChange={handleQrDialogClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Your QR Code</DialogTitle>
              <DialogDescription>
                Present this QR code to the lab staff to complete the checkout process.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
                  JSON.stringify({
                    userId: currentUser.id,
                    items: cartItems.map((cartItem) => ({id: cartItem.item.id, quantity: cartItem.quantity})),
                    timestamp: new Date().toISOString(),
                  })
                )}`}
                alt="Transaction QR Code"
                width={256}
                height={256}
                className="rounded-lg bg-white p-2"
                data-ai-hint="qr code"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleQrDialogClose}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

  const totalItemsInCart = props.items.reduce((sum, item) => sum + item.quantity, 0);


  // Mobile version: FAB + Bottom Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {props.items.length > 0 && (
          <SheetTrigger asChild>
            <Button className="md:hidden fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-lg shadow-primary/30 z-40 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">{totalItemsInCart}</span>
              <span className="sr-only">View Cart</span>
            </Button>
          </SheetTrigger>
        )}
        <SheetContent side="bottom" className="h-[90dvh] rounded-t-2xl flex flex-col p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-4 border-b">
            <SheetHeader className="text-left">
              <SheetTitle className="font-headline text-2xl">Your Cart</SheetTitle>
            </SheetHeader>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto p-4">
             <CheckoutForm {...props} onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Hide on desktop if cart is empty
  if (props.items.length === 0) {
      return null
  }

  // Desktop version: Static Sidebar
  return (
    <div className="hidden md:flex w-80 bg-[#141821] p-4 flex-col border-l border-border/50">
      <CheckoutForm {...props} />
    </div>
  )
}
