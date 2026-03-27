"use client"

import * as React from "react"
import { QrCode, CornerDownLeft, User, CheckCircle, Loader2, Hourglass, ShoppingBag, Trash2 } from "lucide-react"
import { useAppContext } from "@/context/app-context"
import type { BorrowHistory } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { allUsers } from "@/lib/data"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { useFirestore } from "@/firebase"
import { doc, updateDoc, writeBatch } from "firebase/firestore"

type CheckoutSession = {
  studentName: string;
  items: BorrowHistory[];
  date: string;
  checkoutSessionId: string;
}

type QrScannerViewProps = {
    onReturn: (historyId: string) => void;
}

export function QrScannerView({ onReturn }: QrScannerViewProps) {
  const { items, borrowHistory } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [sessionInView, setSessionInView] = React.useState<CheckoutSession | null>(null);
  const [itemsInDialog, setItemsInDialog] = React.useState<BorrowHistory[]>([]);
  const [selectedReturn, setSelectedReturn] = React.useState<BorrowHistory | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const incomingRequests = React.useMemo(() => {
    const sessions = new Map<string, CheckoutSession>();

    borrowHistory.forEach(record => {
      if (record.status === 'Approved' && record.checkoutSessionId) {
        if (!sessions.has(record.checkoutSessionId)) {
          sessions.set(record.checkoutSessionId, {
            checkoutSessionId: record.checkoutSessionId,
            studentName: record.studentName,
            items: [],
            date: record.date,
          });
        }
        sessions.get(record.checkoutSessionId)!.items.push(record);
      }
    });

    return Array.from(sessions.values());
  }, [borrowHistory]);


  const pendingReturns = React.useMemo(() => {
    return borrowHistory.filter(record => record.status === 'Pending Return');
  }, [borrowHistory]);

  
  const handleSelectRequestForCheckout = (session: CheckoutSession) => {
    setSessionInView(session);
    setItemsInDialog([...session.items]);
  }

  const handleSelectReturn = (returnRecord: BorrowHistory) => {
    setSelectedReturn(returnRecord);
  }

  const handleRemoveItemFromDialog = (historyId: string) => {
    setItemsInDialog(prev => prev.filter(item => item.id !== historyId));
  }
  
  const handleConfirmCheckout = async () => {
    if (!sessionInView || !firestore) return;
    setIsProcessing(true);

    try {
        const batch = writeBatch(firestore);

        const itemsToCheckout = itemsInDialog;
        const itemsToCancel = sessionInView.items.filter(item => !itemsInDialog.some(i => i.id === item.id));

        const itemQuantityUpdates = new Map<string, number>();
        itemsToCheckout.forEach(item => {
            itemQuantityUpdates.set(item.itemName, (itemQuantityUpdates.get(item.itemName) || 0) + 1);
        });

        itemQuantityUpdates.forEach((quantityToDecrement, itemName) => {
            const itemToUpdate = items.find(i => i.name === itemName);
            if (itemToUpdate) {
                const newQuantity = itemToUpdate.quantity - quantityToDecrement;
                const itemDocRef = doc(firestore, 'inventory_items', itemToUpdate.id);
                batch.update(itemDocRef, { quantity: Math.max(0, newQuantity) });
            }
        });

        itemsToCheckout.forEach(record => {
            const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
            batch.update(historyDocRef, { status: 'Active' });
        });

        itemsToCancel.forEach(record => {
            const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
            batch.update(historyDocRef, { status: 'Cancelled' });
        });
        
        await batch.commit();
      
        toast({
            title: "Checkout Confirmed",
            description: `${itemsToCheckout.length} item(s) checked out to ${sessionInView.studentName}. ${itemsToCancel.length} item(s) cancelled.`
        });

    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not complete checkout.' });
    } finally {
        setIsProcessing(false);
        setSessionInView(null);
        setItemsInDialog([]);
    }
  }


  const handleConfirmReturn = () => {
    if(!selectedReturn) return;
    setIsProcessing(true);
    setTimeout(() => {
        onReturn(selectedReturn.id);
        setIsProcessing(false);
        setSelectedReturn(null);
    }, 1000)
  }

  const studentInView = sessionInView ? allUsers.find(u => u.name === sessionInView.studentName) || { name: sessionInView.studentName, avatarUrl: '', role: 'Student' } : null;
  const studentForReturn = selectedReturn ? allUsers.find(u => u.name === selectedReturn.studentName) || { name: selectedReturn.studentName, avatarUrl: '', role: 'Student' } : null;

  return (
    <div className="space-y-8">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingBag /> Incoming Requests: Awaiting Checkout</CardTitle>
          <CardDescription>
            These are self-service borrow requests. Staff can prepare items and remove them if needed before the student scans to finalize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomingRequests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {incomingRequests.map(session => (
                <button 
                  key={session.checkoutSessionId}
                  onClick={() => handleSelectRequestForCheckout(session)}
                  className="p-4 rounded-lg bg-secondary hover:bg-accent text-left transition-colors flex items-start gap-4"
                >
                    <User className="h-8 w-8 text-primary flex-shrink-0 mt-1"/>
                    <div>
                        <p className="font-semibold">{session.studentName}</p>
                        <p className="text-sm text-muted-foreground">{session.items.length} item(s)</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(session.date).toLocaleDateString()}</p>
                    </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed border-border/50 rounded-lg">
              <QrCode className="h-12 w-12 mb-4" />
              <p className="font-semibold">No pending checkouts</p>
              <p className="text-sm">Wait for a student to generate a borrow QR code.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CornerDownLeft/> Pending Returns</CardTitle>
          <CardDescription>
            Select a pending item to process a student's return.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReturns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingReturns.map(record => (
                <button 
                  key={record.id}
                  onClick={() => handleSelectReturn(record)}
                  className="p-4 rounded-lg bg-secondary hover:bg-accent text-left transition-colors flex items-start gap-4"
                >
                    <CornerDownLeft className="h-8 w-8 text-green-500 flex-shrink-0 mt-1"/>
                    <div>
                        <p className="font-semibold">{record.studentName}</p>
                        <p className="text-sm text-muted-foreground">{record.itemName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Borrowed on: {new Date(record.date).toLocaleDateString()}</p>
                    </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed border-border/50 rounded-lg">
              <CornerDownLeft className="h-12 w-12 mb-4" />
              <p className="font-semibold">No pending returns</p>
              <p className="text-sm">Wait for a student to initiate a return.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!sessionInView} onOpenChange={(open) => !open && setSessionInView(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="font-headline">Confirm Checkout</DialogTitle>
                <DialogDescription>Simulating QR Scan. Review items, remove if necessary, and confirm to finalize the checkout.</DialogDescription>
            </DialogHeader>
            {sessionInView && studentInView && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12">
                           <AvatarImage src={studentInView.avatarUrl} alt={studentInView.name} />
                           <AvatarFallback>{studentInView.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{studentInView.name}</p>
                            <p className="text-sm text-muted-foreground">{studentInView.role}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Items to Check Out ({itemsInDialog.length}):</h4>
                         {itemsInDialog.length > 0 ? (
                             <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                               {itemsInDialog.map((item, index) => (
                                   <li key={item.id} className="flex items-center justify-between p-2 rounded-md bg-black/20">
                                       <span>{item.itemName}</span>
                                       <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItemFromDialog(item.id)}>
                                            <Trash2 className="h-4 w-4"/>
                                       </Button>
                                   </li>
                               ))}
                            </ul>
                         ) : (
                            <p className="text-muted-foreground text-center p-4">All items have been removed.</p>
                         )}
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setSessionInView(null)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmCheckout} disabled={isProcessing || itemsInDialog.length === 0}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Confirm Checkout
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline">Confirm Return</DialogTitle>
                <DialogDescription>Review the item and confirm the return for the student.</DialogDescription>
            </DialogHeader>
            {selectedReturn && studentForReturn && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12">
                           <AvatarImage src={studentForReturn.avatarUrl} alt={studentForReturn.name} />
                           <AvatarFallback>{studentForReturn.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{studentForReturn.name}</p>
                            <p className="text-sm text-muted-foreground">{studentForReturn.role}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Item to Return:</h4>
                        <ul className="space-y-1 text-sm list-disc list-inside bg-black/20 p-3 rounded-md">
                           <li>{selectedReturn.itemName}</li>
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReturn(null)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmReturn} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Confirm Return
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
