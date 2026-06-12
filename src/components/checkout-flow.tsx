
"use client"

import * as React from "react"
import Image from "next/image"
import { format, isSameDay, parseISO } from "date-fns"
import { 
    Loader2, X, ShoppingCart, Minus, Plus, Trash2, 
    CalendarDays, Clock, Users, Info, CheckCircle, Lock, Package 
} from "lucide-react"
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
import { Badge } from "./ui/badge"

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
  const { items: allItems, borrowHistory, channels } = useAppContext();
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
      toast({ variant: "destructive", title: "Auth Error", description: "Please log in again." })
      return;
    }

    const approvalsToConsume: string[] = [];

    if (!isTeacherView) {
        for (const { item, quantity: requestedQuantity } of cartItems) {
            const masterItem = allItems.find(i => i.id === item.id);
            if (masterItem?.status === 'Locked') {
                const availableApprovals = borrowHistory.filter(h => 
                    h.borrowerUserId === user.uid &&
                    h.itemName === item.name &&
                    h.status.toLowerCase() === 'approved' &&
                    !h.checkoutSessionId
                );
                
                const totalApprovedQuantity = availableApprovals.reduce((sum, approval) => sum + (approval.itemQuantity || 0), 0);

                if (totalApprovedQuantity < requestedQuantity) {
                    toast({
                        variant: "destructive",
                        title: "Quantity Insufficient",
                        description: `Approval required for ${requestedQuantity} of "${item.name}". You only have ${totalApprovedQuantity} approved.`,
                    });
                    return; 
                }
            }
        }

        for (const { item, quantity: requestedQuantity } of cartItems) {
            const masterItem = allItems.find(i => i.id === item.id);
            if (masterItem?.status === 'Locked') {
                const availableApprovals = borrowHistory.filter(h => 
                    h.borrowerUserId === user.uid &&
                    h.itemName === item.name &&
                    h.status.toLowerCase() === 'approved' &&
                    !h.checkoutSessionId
                ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

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
    }

    const sessionId = `checkout-${user.uid}-${Date.now()}`;
    setActiveCheckoutSessionId(sessionId);
    
    const checkoutPayload: any = {
      t: 'c', 
      sid: sessionId,
      u: user.uid,
      i: cartItems.map(({ item, quantity }) => ({ id: item.id, q: quantity })),
      a: approvalsToConsume,
    };
    
    if (borrowingType === 'Group' && !isTeacherView) {
        if (!groupNumber || !groupSubject || !groupMembers) {
            toast({ variant: "destructive", title: "Missing Details", description: "Please complete group information." });
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
    if (!user || !user.uid || !user.displayName) return;
    if (!reservationDateStr || !startTime || !endTime) {
         toast({ variant: "destructive", title: "Missing Info", description: "Please select date and time." })
         return;
    }
    
    setIsLoading(true);
    const reservationDate = new Date(reservationDateStr.replace(/-/g, '/'));

    if (borrowingType === 'Group' && !isTeacherView) {
        if (!groupNumber || !groupSubject || !groupMembers) {
            toast({ variant: "destructive", title: "Missing Details", description: "Please complete group information." });
            setIsLoading(false);
            return;
        }
    }

    let hasConflict = false;
    for (const cartItem of cartItems) {
        const { item, quantity: requestedQuantity } = cartItem;
        const allItemsInDB = allItems.find(i => i.id === item.id)
        if (!allItemsInDB) continue;

        const overlappingReservations = borrowHistory.filter(h => 
            h.inventoryItemId === item.id &&
            h.status === 'Reserved' &&
            reservationDate && isSameDay(new Date(h.date), reservationDate) && 
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
                title: 'Stock Conflict',
                description: `"${item.name}" only has ${canStillReserve > 0 ? canStillReserve : 0} slots remaining for this time.`
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
            status: isTeacherView ? 'Reserved' : 'Pending', 
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
        if (!firestore) throw new Error("Firestore unavailable");
        const batch = writeBatch(firestore);
        const historyCollectionRef = collection(firestore, 'borrowing_transactions');

        newHistoryRecords.forEach(record => {
            const newDocRef = doc(historyCollectionRef);
            batch.set(newDocRef, record);
        });

        await batch.commit();

        toast({ 
            title: isTeacherView ? "Reservation Confirmed!" : "Request Submitted", 
            description: isTeacherView 
                ? `${cartItems.length} items reserved for ${format(reservationDate, "PPP")}.`
                : `Your schedule request for ${format(reservationDate, "PPP")} has been sent.` 
        })
        onSuccess()
        setIsLoading(false)

    } catch (e) {
        console.error(e);
        setIsLoading(false);
        toast({ variant: "destructive", title: "Failed", description: "Could not submit reservation." })
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center animate-in fade-in duration-500">
        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Your cart is empty</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
            Select items from the inventory to begin a laboratory borrowing request.
        </p>
      </div>
    );
  }

  const isFormValid = !isReserve || (reservationDateStr && startTime && endTime);
  const isGroupInfoComplete = borrowingType === 'Individual' || (groupNumber && groupSubject && groupMembers);

  return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
        {/* Item List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
             <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items in Request</Label>
             <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive hover:text-destructive/80" onClick={onClear}>Clear All</Button>
          </div>
          <div className="space-y-2">
            {cartItems.map(({ item, quantity }) => {
                const channelName = channels.find(c => c.id === item.channelId)?.name.replace('#', '') || 'General';
                const categories = Array.isArray(item.categories) ? item.categories : (item.category ? [item.category] : []);
                
                const isApproved = !isTeacherView && borrowHistory.some(h => 
                    h.borrowerUserId === user?.uid && 
                    h.itemName === item.name && 
                    h.status.toLowerCase() === 'approved' && 
                    !h.checkoutSessionId
                );

                return (
                    <div key={item.id} className="group relative bg-black/30 border border-border/40 rounded-xl p-3 flex gap-3 transition-colors hover:border-border/80">
                        <div className="relative h-12 w-12 rounded-lg bg-black/40 overflow-hidden flex-shrink-0">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                            ) : (
                                <Package className="h-6 w-6 text-muted-foreground/30 absolute inset-0 m-auto" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate pr-6" title={item.name}>{item.name}</h4>
                            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                <span className="text-[9px] font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-tight">
                                    <Lock className="h-2 w-2" /> {channelName}
                                </span>
                                {categories[0] && (
                                    <span className="text-[9px] font-medium text-primary/70 uppercase tracking-tight">
                                        • {categories[0]}
                                    </span>
                                )}
                            </div>
                            {isApproved && (
                                <Badge variant="secondary" className="mt-1.5 h-4 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] font-bold uppercase tracking-wider">Approved</Badge>
                            )}
                        </div>
                        <div className="flex flex-col items-end justify-between">
                            <button 
                                onClick={() => onItemQuantityChange(item.id, 0)}
                                className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                            <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5">
                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-white/5" onClick={() => onItemQuantityChange(item.id, quantity - 1)}>
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-5 text-center text-xs font-mono font-bold">{quantity}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-white/5" onClick={() => onItemQuantityChange(item.id, quantity + 1)}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
        
        <Separator className="bg-border/30"/>
        
        {/* Settings */}
        <div className="space-y-6">
             {!isTeacherView && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs font-bold uppercase tracking-widest text-white/90">Borrowing Details</Label>
                    </div>
                    <RadioGroup
                        value={borrowingType}
                        onValueChange={(value: 'Individual' | 'Group') => setBorrowingType(value)}
                        className="grid grid-cols-2 gap-3"
                    >
                        <Label htmlFor="individual" className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-border/40 bg-black/20 cursor-pointer transition-all hover:bg-black/30",
                            borrowingType === 'Individual' && "border-primary bg-primary/5 text-primary"
                        )}>
                            <RadioGroupItem value="Individual" id="individual" className="sr-only" />
                            <Users className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Individual</span>
                        </Label>
                        <Label htmlFor="group" className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-border/40 bg-black/20 cursor-pointer transition-all hover:bg-black/30",
                            borrowingType === 'Group' && "border-primary bg-primary/5 text-primary"
                        )}>
                            <RadioGroupItem value="Group" id="group" className="sr-only" />
                            <Users className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Group Session</span>
                        </Label>
                    </RadioGroup>

                    {borrowingType === 'Group' && (
                        <div className="grid gap-3 p-4 rounded-xl bg-black/40 border border-border/40 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="group-number" className="text-[10px] font-bold uppercase text-muted-foreground">Group No.</Label>
                                    <Input id="group-number" value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="e.g., 3" className="bg-black/20 border-border/50 h-8 text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="group-subject" className="text-[10px] font-bold uppercase text-muted-foreground">Subject Code</Label>
                                    <Input id="group-subject" value={groupSubject} onChange={e => setGroupSubject(e.target.value)} placeholder="e.g., CPE 101" className="bg-black/20 border-border/50 h-8 text-xs" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="group-members" className="text-[10px] font-bold uppercase text-muted-foreground">Active Members</Label>
                                <Textarea id="group-members" value={groupMembers} onChange={e => setGroupMembers(e.target.value)} placeholder="Enter full names, separated by commas" className="bg-black/20 border-border/50 min-h-[60px] text-xs resize-none" />
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs font-bold uppercase tracking-widest text-white/90">Reservation Mode</Label>
                    </div>
                    <Switch checked={isReserve} onCheckedChange={setIsReserve} />
                </div>
                
                {isReserve && (
                    <div className="grid gap-4 p-4 rounded-xl bg-black/40 border border-border/40 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                             <Label className="text-[10px] font-bold uppercase text-muted-foreground">Reservation Date</Label>
                             <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="date"
                                    value={reservationDateStr}
                                    onChange={(e) => setReservationDateStr(e.target.value)}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    className="pl-10 bg-black/20 border-border/50 h-10 text-sm"
                                />
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Start Time</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="pl-10 bg-black/20 border-border/50 h-9 text-xs" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">End Time</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="pl-10 bg-black/20 border-border/50 h-9 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Request Summary</span>
                </div>
                <div className="grid gap-1 text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Items</span>
                        <span className="font-bold text-white">{cartItems.reduce((s, i) => s + i.quantity, 0)} Units</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Request Type</span>
                        <span className="font-bold text-white">{isReserve ? 'Reservation' : 'Immediate Checkout'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Borrower</span>
                        <span className="font-bold text-white">{borrowingType}</span>
                    </div>
                    {isReserve && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Schedule</span>
                            <span className="font-bold text-primary">
                                {reservationDateStr ? format(new Date(reservationDateStr.replace(/-/g, '/')), 'MMM d') : 'Date TBD'}, {startTime}-{endTime}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="pt-2">
                <Button 
                    onClick={handleSubmit} 
                    className={cn(
                        "w-full h-12 text-sm font-bold uppercase tracking-widest transition-all",
                        !isFormValid || !isGroupInfoComplete ? "bg-muted text-muted-foreground" : "shadow-lg shadow-primary/20"
                    )} 
                    disabled={isLoading || !isFormValid || !isGroupInfoComplete}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : !isFormValid ? (
                        'Complete Schedule'
                    ) : !isGroupInfoComplete ? (
                        'Enter Group Info'
                    ) : isReserve ? (
                        isTeacherView ? 'Confirm Reservation' : 'Submit Reservation'
                    ) : (
                        'Generate QR Receipt'
                    )}
                </Button>
                {(!isFormValid || !isGroupInfoComplete) && (
                    <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                        Please fill in all required fields to activate submission.
                    </p>
                )}
            </div>
        </div>

        <Dialog open={isQrCodeOpen} onOpenChange={(open) => !open && setIsQrCodeOpen(false)}>
          <DialogContent className="sm:max-w-md bg-[#141821] border-border/50">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                  <CheckCircle className="text-emerald-500" /> Transaction Receipt
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Present this QR code to the lab staff to verify and receive your materials.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <div className="bg-white p-3 rounded-2xl shadow-2xl">
                <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCodeData)}`}
                    alt="Transaction QR Code"
                    width={240}
                    height={240}
                    className="rounded-lg"
                    data-ai-hint="qr code"
                />
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary font-bold uppercase tracking-widest">Awaiting Staff Scan</p>
                <p className="text-[10px] text-muted-foreground mt-1">This dialog closes automatically upon verification.</p>
            </div>
            <DialogFooter className="sm:justify-center border-t border-border/20 pt-4 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsQrCodeOpen(false)} className="text-muted-foreground hover:text-white">
                Back to Edit Cart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
        <Button className="fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-2xl shadow-primary/40 z-40 flex items-center justify-center animate-in zoom-in duration-300">
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-black ring-4 ring-[#1e2430]">
            {totalItemsInCart}
          </span>
          <span className="sr-only">View Cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0 outline-none",
          isMobile
            ? "h-[92dvh] rounded-t-[32px] border-t-border/50"
            : "w-[440px] border-l-border/50",
          "bg-[#111214]"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-6 border-b border-border/20 flex flex-col gap-1">
          <SheetHeader className="text-left space-y-0">
            <SheetTitle className="font-headline text-3xl font-black tracking-tighter text-white uppercase">Your Cart</SheetTitle>
          </SheetHeader>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {totalItemsInCart} {totalItemsInCart === 1 ? 'item' : 'items'} selected
          </p>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto p-6 scrollbar-none">
          <CheckoutForm {...props} onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

