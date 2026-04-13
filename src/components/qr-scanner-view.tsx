
"use client"

import * as React from "react"
import { QrCode, CornerDownLeft, User, CheckCircle, Loader2, ShoppingBag, Trash2, X, Search } from "lucide-react"
import { useAppContext } from "@/context/app-context"
import type { BorrowHistory } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { useFirestore } from "@/firebase"
import { doc, writeBatch, collection } from "firebase/firestore"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

type ScannedCheckoutData = {
    type: 'checkout';
    borrowerUserId: string;
    studentName: string;
    items: { id: string; name: string; quantity: number }[];
    approvalsToConsume: string[];
}

type CheckoutSession = {
  studentName: string;
  items: { name: string; quantity: number}[];
  borrowerUserId: string;
  originalPayload: ScannedCheckoutData;
}

type PendingReturnGroup = {
    studentName: string;
    borrowerUserId: string;
    records: BorrowHistory[];
};

export function QrScannerView() {
  const { items, borrowHistory } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [scannedData, setScannedData] = React.useState("");
  const [sessionInView, setSessionInView] = React.useState<CheckoutSession | null>(null);
  const [selectedReturnGroup, setSelectedReturnGroup] = React.useState<PendingReturnGroup | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);


  const groupedPendingReturns = React.useMemo(() => {
    const groups: { [userId: string]: PendingReturnGroup } = {};
    const pendingReturns = borrowHistory.filter(record => record.status === 'Pending Return');
    
    pendingReturns.forEach(record => {
      const userId = record.borrowerUserId;
      if (!userId) return;

      if (!groups[userId]) {
        groups[userId] = { 
          studentName: record.studentName,
          borrowerUserId: userId,
          records: [] 
        };
      }
      groups[userId].records.push(record);
    });
    return Object.values(groups);
  }, [borrowHistory]);

  const handleLookupQr = () => {
    if (!scannedData.trim()) {
        toast({ variant: 'destructive', title: 'QR Data is empty' });
        return;
    }
    try {
        const payload = JSON.parse(scannedData) as ScannedCheckoutData;
        if (payload.type !== 'checkout' || !payload.borrowerUserId || !payload.items) {
            throw new Error("Invalid QR code data format.");
        }
        
        // Group items by name for display
        const itemMap = new Map<string, number>();
        payload.items.forEach(item => {
            itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
        });

        const displayItems = Array.from(itemMap.entries()).map(([name, quantity]) => ({ name, quantity }));

        setSessionInView({
            borrowerUserId: payload.borrowerUserId,
            studentName: payload.studentName,
            items: displayItems,
            originalPayload: payload,
        });

    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'The scanned data is not a valid checkout request.' });
    }
  }

  const handleSelectReturnGroup = (group: PendingReturnGroup) => {
    setSelectedReturnGroup(group);
  }
  
  const handleConfirmCheckout = async () => {
    if (!sessionInView || !firestore) return;
    setIsProcessing(true);

    const { originalPayload } = sessionInView;

    try {
        const batch = writeBatch(firestore);

        const itemQuantityUpdates = new Map<string, number>();
        originalPayload.items.forEach(item => {
            itemQuantityUpdates.set(item.id, (itemQuantityUpdates.get(item.id) || 0) + item.quantity);
        });

        // 1. Decrement inventory quantities
        for (const [itemId, quantityToDecrement] of itemQuantityUpdates.entries()) {
            const itemToUpdate = items.find(i => i.id === itemId);
             if (itemToUpdate) {
                if (itemToUpdate.quantity < quantityToDecrement) {
                    throw new Error(`Not enough stock for ${itemToUpdate.name}.`);
                }
                const newQuantity = itemToUpdate.quantity - quantityToDecrement;
                const itemDocRef = doc(firestore, 'inventory_items', itemToUpdate.id);
                 batch.update(itemDocRef, { 
                    quantity: newQuantity,
                    status: newQuantity === 0 ? 'Borrowed' : itemToUpdate.status 
                });
            } else {
                throw new Error(`Item with ID ${itemId} not found in inventory.`);
            }
        }

        // 2. Create 'Active' borrow history records for all borrowed items
        const historyCollectionRef = collection(firestore, 'borrowing_transactions');
        originalPayload.items.forEach(({ name, quantity }) => {
            for (let i=0; i < quantity; i++) {
                const newDocRef = doc(historyCollectionRef);
                const newRecord: Omit<BorrowHistory, 'id'> = {
                    borrowerUserId: originalPayload.borrowerUserId,
                    studentName: originalPayload.studentName,
                    itemName: name,
                    date: new Date().toISOString(),
                    status: 'Active',
                };
                batch.set(newDocRef, newRecord);
            }
        });

        // 3. Mark the consumed teacher approvals as 'Active'
        originalPayload.approvalsToConsume.forEach(approvalId => {
            const approvalDocRef = doc(firestore, 'borrowing_transactions', approvalId);
            batch.update(approvalDocRef, { status: 'Active', date: new Date().toISOString() });
        });
        
        await batch.commit();
      
        toast({
            title: "Checkout Confirmed",
            description: `${originalPayload.items.length} item(s) checked out to ${sessionInView.studentName}.`
        });

    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not complete checkout.' });
    } finally {
        setIsProcessing(false);
        setSessionInView(null);
        setScannedData("");
    }
  }

  const handleDenyCheckout = async () => {
    if (!sessionInView) return;
    
    toast({
        variant: "destructive",
        title: "Checkout Denied",
        description: `The checkout for ${sessionInView.studentName} has been cancelled.`
    });
    setSessionInView(null);
    setScannedData("");
  }


  const handleConfirmAllReturns = async () => {
    if (!selectedReturnGroup || !firestore) return;
    setIsProcessing(true);

    try {
        const batch = writeBatch(firestore);
        const itemQuantityIncrements = new Map<string, number>();
        
        selectedReturnGroup.records.forEach(record => {
            const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
            batch.update(historyDocRef, { status: 'Returned' });
            itemQuantityIncrements.set(record.itemName, (itemQuantityIncrements.get(record.itemName) || 0) + 1);
        });

        itemQuantityIncrements.forEach((quantityToIncrement, itemName) => {
            const itemToUpdate = items.find(i => i.name === itemName);
            if (itemToUpdate) {
                const itemDocRef = doc(firestore, 'inventory_items', itemToUpdate.id);
                const newQuantity = itemToUpdate.quantity + quantityToIncrement;
                batch.update(itemDocRef, {
                    quantity: newQuantity,
                    status: newQuantity > 0 ? 'Available' : itemToUpdate.status
                });
            }
        });

        await batch.commit();

        toast({
            title: "Items Returned",
            description: `${selectedReturnGroup.records.length} item(s) from ${selectedReturnGroup.studentName} have been successfully returned.`
        });

    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not process returns. Please try again.' });
    } finally {
        setIsProcessing(false);
        setSelectedReturnGroup(null);
    }
  };

  return (
    <div className="space-y-8">
       <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode /> Scan Checkout QR Code</CardTitle>
          <CardDescription>
            Paste the student's QR code data here to look up and confirm a checkout request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid w-full gap-1.5">
                <Label htmlFor="qr-data">QR Code Data</Label>
                <Textarea 
                    placeholder="Paste the data from the QR code here..." 
                    id="qr-data" 
                    value={scannedData}
                    onChange={(e) => setScannedData(e.target.value)}
                    rows={4}
                />
            </div>
            <Button onClick={handleLookupQr} disabled={!scannedData.trim()}>
                <Search className="mr-2 h-4 w-4"/> Look Up Request
            </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CornerDownLeft/> Pending Returns</CardTitle>
          <CardDescription>
            Select a student to process their returns in a single batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedPendingReturns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedPendingReturns.map(group => (
                <button 
                  key={group.borrowerUserId}
                  onClick={() => handleSelectReturnGroup(group)}
                  className="p-4 rounded-lg bg-secondary hover:bg-accent text-left transition-colors flex items-start gap-4"
                >
                    <CornerDownLeft className="h-8 w-8 text-green-500 flex-shrink-0 mt-1"/>
                    <div>
                        <p className="font-semibold">{group.studentName}</p>
                        <p className="text-sm text-muted-foreground">{group.records.length} item(s) to return</p>
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
                <DialogDescription>Review items and confirm to finalize the checkout for {sessionInView?.studentName}.</DialogDescription>
            </DialogHeader>
            {sessionInView && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12">
                           <AvatarFallback>{sessionInView.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{sessionInView.studentName}</p>
                            <p className="text-sm text-muted-foreground">Student</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Items to Check Out ({sessionInView.items.length}):</h4>
                         {sessionInView.items.length > 0 ? (
                             <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 list-disc list-inside bg-black/20 p-3 rounded-md">
                               {sessionInView.items.map((item, index) => (
                                   <li key={index} className="flex items-center justify-between">
                                       <span>{item.name} (x{item.quantity})</span>
                                   </li>
                               ))}
                            </ul>
                         ) : (
                            <p className="text-muted-foreground text-center p-4">No items in this request.</p>
                         )}
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="destructive" onClick={handleDenyCheckout} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Deny
                </Button>
                <Button onClick={handleConfirmCheckout} disabled={isProcessing || !sessionInView || sessionInView.items.length === 0}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Confirm
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={!!selectedReturnGroup} onOpenChange={(open) => !open && setSelectedReturnGroup(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline">Confirm Return for {selectedReturnGroup?.studentName}</DialogTitle>
                <DialogDescription>Review the items and confirm the return.</DialogDescription>
            </DialogHeader>
            {selectedReturnGroup && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12">
                           <AvatarFallback>{selectedReturnGroup.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{selectedReturnGroup.studentName}</p>
                            <p className="text-sm text-muted-foreground">Student</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Items to Return ({selectedReturnGroup.records.length}):</h4>
                        <ul className="space-y-1 text-sm list-disc list-inside bg-black/20 p-3 rounded-md max-h-60 overflow-y-auto">
                           {selectedReturnGroup.records.map(record => (
                               <li key={record.id}>{record.itemName}</li>
                           ))}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReturnGroup(null)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmAllReturns} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Confirm All Returns
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
