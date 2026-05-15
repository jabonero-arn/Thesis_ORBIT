"use client"

import * as React from "react"
import Image from "next/image"
import { format, isSameDay } from "date-fns"
import { Loader2, X, ShoppingCart, Minus, Plus } from "lucide-react"
import { useUser, useFirestore } from "@/firebase"
import { collection, writeBatch, doc } from "firebase/firestore"

import type { BorrowHistory, CartItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Textarea } from "./ui/textarea"

type CheckoutFlowProps = {
  items: CartItem[]
  onClear: () => void
  onSuccess: () => void
  onItemQuantityChange: (itemId: string, newQuantity: number) => void
  isTeacherView?: boolean
}

function CheckoutForm({ items: cartItems, onClear, onSuccess, onItemQuantityChange, isTeacherView }: CheckoutFlowProps) {
  const [isReserve, setIsReserve] = React.useState(false)
  const [reservationDateStr, setReservationDateStr] = React.useState<string>("")
  const [startTime, setStartTime] = React.useState<string>("14:00")
  const [endTime, setEndTime] = React.useState<string>("16:00")
  
  const [borrowingType, setBorrowingType] = React.useState<'Individual' | 'Group'>('Individual');
  const [groupNumber, setGroupNumber] = React.useState("");
  const [groupSubject, setGroupSubject] = React.useState("");
  const [groupMembers, setGroupMembers] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(false)
  const [isQrCodeOpen, setIsQrCodeOpen] = React.useState(false)
  const [qrCodeData, setQrCodeData] = React.useState<string>("");
  const [activeCheckoutSessionId, setActiveCheckoutSessionId] = React.useState<string | null>(null);

  const { toast } = useToast()
  const { user } = useUser();
  const { items: allItems, borrowHistory } = useAppContext();
  const firestore = useFirestore();


  React.useEffect(() => {
    if (!isQrCodeOpen || !activeCheckoutSessionId) return;

    // Check if a borrow history record for this session has been created
    const checkoutComplete = borrowHistory.some(h => h.checkoutSessionId === activeCheckoutSessionId);

    if (checkoutComplete) {
        toast({
            title: "Checkout Complete!",
            description: "Your items have been successfully checked out.",
        });
        setIsQrCodeOpen(false);
        setActiveCheckoutSessionId(null);
        onSuccess();
    }
  }, [borrowHistory, isQrCodeOpen, activeCheckoutSessionId, onSuccess, toast]);


  const handleSubmit = () => {
    if (isReserve) {
      handleReserve()
    } else {
      handleBorrow()
    }
  }

  const handleBorrow = () => {
    if (!user || !user.uid || !user.displayName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not identify user. Please log in again.",
      })
      return;
    }

    const approvalsToConsume: string[] = [];

    // Pre-flight check to ensure enough approvals exist for all locked items
    for (const { item, quantity: requestedQuantity } of cartItems) {
      const masterItem = allItems.find(i => i.id === item.id);
      if (masterItem?.status === 'Locked') {
        const availableApprovals = borrowHistory.filter(h => 
          h.borrowerUserId === user.uid &&
          h.itemName === item.name &&
          h.status === 'Approved' &&
          !h.checkoutSessionId
        );
        
        const totalApprovedQuantity = availableApprovals.reduce((sum, approval) => sum + (approval.itemQuantity || 0), 0);

        if (totalApprovedQuantity < requestedQuantity) {
           toast({
            variant: "destructive",
            title: "Approval Quantity Insufficient",
            description: `You are requesting ${requestedQuantity} of "${item.name}", but only have approvals for ${totalApprovedQuantity}.`,
          });
          return; // Stop the whole process
        }
      }
    }

    // If all checks pass, gather the approval record IDs to be consumed.
    for (const { item, quantity: requestedQuantity } of cartItems) {
      const masterItem = allItems.find(i => i.id === item.id);
      if (masterItem?.status === 'Locked') {
        const availableApprovals = borrowHistory.filter(h => 
            h.borrowerUserId === user.uid &&
            h.itemName === item.name &&
            h.status === 'Approved' &&
            !h.checkoutSessionId
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // FIFO

        let quantityToSatisfy = requestedQuantity;
        for (const approval of availableApprovals) {
            if (quantityToSatisfy > 0) {
                approvalsToConsume.push(approval.id);
                quantityToSatisfy -= (approval.itemQuantity || 1);
            } else {
                break;
            }
        }
      }
    }

    const sessionId = `checkout-${user.uid}-${Date.now()}`;
    setActiveCheckoutSessionId(sessionId);
    
    const checkoutPayload: any = {
      t: 'c', // type: checkout
      sid: sessionId, // checkout session ID
      u: user.uid,
      i: cartItems.map(({ item, quantity }) => ({ id: item.id, q: quantity })),
      a: approvalsToConsume,
    };
    
    if (borrowingType === 'Group' && !isTeacherView) {
        if (!groupNumber || !groupSubject || !groupMembers) {
            toast({
                variant: "destructive",
                title: "Missing Group Information",
                description: "Please fill out all group details.",
            });
            return;
        }
        checkoutPayload.gType = 'Group';
        checkoutPayload.gNum = groupNumber;
        checkoutPayload.gSub = groupSubject;
        checkoutPayload.gMem = groupMembers;
    } else {
        checkoutPayload.gType = 'Individual';
    }

    setQrCodeData(JSON.stringify(checkoutPayload));
    setIsQrCodeOpen(true);
  }
  
  const handleReserve = async () => {
     if (!user || !user.uid || !user.displayName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not identify user. Please log in again.",
      })
      return;
    }
    if (!reservationDateStr || !startTime || !endTime) {
         toast({
          variant: "destructive",
          title: "Incomplete Information",
          description: "Please select a date and time for your reservation.",
        })
        return;
    }
    
    setIsLoading(true);

    const reservationDate = new Date(reservationDateStr.replace(/-/g, '/'));

    if (borrowingType === 'Group' && !isTeacherView) {
        if (!groupNumber || !groupSubject || !groupMembers) {
            toast({
                variant: "destructive",
                title: "Missing Group Information",
                description: "Please fill out all group details.",
            });
            setIsLoading(false);
            return;
        }
    }

    let hasConflict = false;
    for (const cartItem of cartItems) {
        const { item, quantity: requestedQuantity } = cartItem;

        const allItemsInDB = allItems.find(i => i.id === item.id)
        if (!allItemsInDB) continue;

        // Correctly filter for reservations on the same day with overlapping times
        const overlappingReservations = borrowHistory.filter(h => 
            h.inventoryItemId === item.id &&
            h.status === 'Reserved' &&
            reservationDate && isSameDay(new Date(h.date), reservationDate) && // Correct date comparison
            h.startTime && h.endTime && startTime && endTime &&
            h.startTime < endTime && h.endTime > startTime
        );

        const overlappingQuantity = overlappingReservations.reduce((sum, h) => sum + (h.itemQuantity || 1), 0);
        
        const totalStock = allItemsInDB.quantity;

        if ((overlappingQuantity + requestedQuantity) > totalStock) {
            hasConflict = true;
            const canStillReserve = totalStock - overlappingQuantity;
            toast({
                variant: 'destructive',
                title: 'Reservation Conflict',
                description: `Not enough stock for "${item.name}" at the selected time. Only ${canStillReserve > 0 ? canStillReserve : 0} more can be reserved.`
            });
            break; 
        }
    }

    if (hasConflict) {
        setIsLoading(false);
        return;
    }

    const reservationId = `res-${user.uid}-${Date.now()}`;
    const newHistoryRecords: Omit<BorrowHistory, 'id'>[] = [];

    cartItems.forEach(({ item, quantity }) => {
        const record: Omit<BorrowHistory, 'id'> = {
            studentName: user.displayName!,
            itemName: item.name,
            inventoryItemId: item.id,
            itemQuantity: quantity,
            date: reservationDate.toISOString(),
            status: 'Pending', 
            startTime: startTime,
            endTime: endTime,
            borrowerUserId: user.uid,
            reservationId: reservationId,
        };

        if (borrowingType === 'Group' && !isTeacherView) {
            record.borrowingType = 'Group';
            record.groupNumber = groupNumber;
            record.groupSubject = groupSubject;
            record.groupMembers = groupMembers;
        } else {
            record.borrowingType = 'Individual';
        }
        
        newHistoryRecords.push(record);
    });
    
    try {
        if (!firestore) throw new Error("Firestore not available");
        const batch = writeBatch(firestore);
        const historyCollectionRef = collection(firestore, 'borrowing_transactions');

        newHistoryRecords.forEach(record => {
            const newDocRef = doc(historyCollectionRef);
            batch.set(newDocRef, record);
        });

        await batch.commit();

        toast({ title: "Reservation Request Sent!", description: `Your request for ${format(reservationDate, "PPP")} from ${startTime} to ${endTime} has been sent for staff approval.` })
        onSuccess()
        setIsLoading(false)

    } catch (e) {
        console.error(e);
        setIsLoading(false);
        toast({
            variant: "destructive",
            title: "Reservation Failed",
            description: "Could not send reservation request. Please try again.",
        })
    }
  }

  const handleCancelQrDialog = () => {
    setIsQrCodeOpen(false);
    setActiveCheckoutSessionId(null);
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

  return (
      <>
        <div className="flex justify-between items-center pb-2 border-b border-border/50">
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
             {!isTeacherView && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="borrowing-type" className="font-medium">Borrowing Type</Label>
                        <RadioGroup
                            id="borrowing-type"
                            value={borrowingType}
                            onValueChange={(value: 'Individual' | 'Group') => setBorrowingType(value)}
                            className="flex space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Individual" id="individual" />
                                <Label htmlFor="individual">Individual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Group" id="group" />
                                <Label htmlFor="group">Group</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {borrowingType === 'Group' && (
                        <div className="grid gap-3 p-3 rounded-lg bg-black/20 border border-border/50">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1">
                                    <Label htmlFor="group-number">Group Number</Label>
                                    <Input id="group-number" value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="e.g., 3" className="bg-input" />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="group-subject">Subject</Label>
                                    <Input id="group-subject" value={groupSubject} onChange={e => setGroupSubject(e.target.value)} placeholder="e.g., CPE 101" className="bg-input" />
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="group-members">Group Members</Label>
                                <Textarea id="group-members" value={groupMembers} onChange={e => setGroupMembers(e.target.value)} placeholder="Enter names, separated by commas" className="bg-input" />
                            </div>
                        </div>
                    )}
                    
                    <Separator className="my-2 bg-border/50"/>
                </>
            )}
            
            <div className="flex items-center justify-between">
                <Label htmlFor="reservation-mode" className="font-medium">
                Reserve for Later
                </Label>
                <Switch
                id="reservation-mode"
                checked={isReserve}
                onCheckedChange={setIsReserve}
                />
            </div>
            
            {isReserve && (
                <div className="grid gap-3 p-3 rounded-lg bg-black/20 border border-border/50">
                    <Input
                        type="date"
                        value={reservationDateStr}
                        onChange={(e) => setReservationDateStr(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className={cn(
                            "w-full justify-start text-left font-normal bg-input",
                            !reservationDateStr && "text-muted-foreground"
                        )}
                    />
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

        <Dialog open={isQrCodeOpen} onOpenChange={(open) => !open && handleCancelQrDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Your QR Code</DialogTitle>
              <DialogDescription>
                Present this QR code to the lab staff. This dialog will close automatically after scanning.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCodeData)}`}
                alt="Transaction QR Code"
                width={256}
                height={256}
                className="rounded-lg bg-white p-2"
                data-ai-hint="qr code"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancelQrDialog}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
  )
}

export function CheckoutFlow(props: CheckoutFlowProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleSuccess = () => {
    props.onSuccess();
    setSheetOpen(false);
  };

  const totalItemsInCart = props.items.reduce((sum, item) => sum + item.quantity, 0);

  if (props.items.length === 0) {
    return null;
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-lg shadow-primary/30 z-40 flex items-center justify-center">
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">
            {totalItemsInCart}
          </span>
          <span className="sr-only">View Cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0",
          isMobile
            ? "h-[90dvh] rounded-t-2xl"
            : "w-[400px]",
          "bg-[#141821] border-l-border/50"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 border-b border-border/50">
          <SheetHeader className="text-left">
            <SheetTitle className="font-headline text-2xl">Your Cart</SheetTitle>
          </SheetHeader>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto p-4">
          <CheckoutForm {...props} onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
