
"use client"

import * as React from "react"
import { QrCode, CornerDownLeft, CheckCircle, Loader2, X } from "lucide-react"
import { useAppContext } from "@/context/app-context"
import type { BorrowHistory } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { useFirestore } from "@/firebase"
import { doc, writeBatch, collection, runTransaction, getDoc, getDocs, query, where } from "firestore"
import { Html5Qrcode } from "html5-qrcode"


type ScannedCompactCheckoutData = {
    t: 'c'; // type: 'checkout'
    u: string; // userId
    i: { id: string; q: number }[]; // items: id and quantity
    a: string[]; // approvalsToConsume
    gType?: 'Individual' | 'Group';
    gNum?: string;
    gSub?: string;
    gMem?: string;
}

type ScannedReturnData = {
    t: 'r'; // type: 'return'
    ids: string[]; // array of borrowHistory document IDs
};

type ScannedReservationClaimData = {
    t: 'res-claim',
    rId: string, // reservationId
};

type ScannedData = ScannedCompactCheckoutData | ScannedReturnData | ScannedReservationClaimData;

type CheckoutSession = {
  studentName: string;
  items: { name: string; quantity: number}[];
  borrowerUserId: string;
  originalPayload: ScannedCompactCheckoutData;
  groupInfo?: {
      number: string;
      subject: string;
      members: string;
  }
}

type ClaimSession = {
  studentName: string;
  items: { name: string; quantity: number }[];
  records: BorrowHistory[];
}

type PendingReturnGroup = {
    studentName: string;
    borrowerUserId: string;
    records: BorrowHistory[];
};

const qrCodeReaderId = "qr-reader";

export function QrScannerView() {
  const { items, borrowHistory, allUsers } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [scannedData, setScannedData] = React.useState("");
  const [sessionInView, setSessionInView] = React.useState<CheckoutSession | null>(null);
  const [claimSessionInView, setClaimSessionInView] = React.useState<ClaimSession | null>(null);
  const [selectedReturnGroup, setSelectedReturnGroup] = React.useState<PendingReturnGroup | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isScanning, setIsScanning] = React.useState(true);

  const lookupHandlerRef = React.useRef<() => void>(() => {});

  const handleResetScanner = () => {
    setScannedData("");
    setSessionInView(null);
    setClaimSessionInView(null);
    setSelectedReturnGroup(null);
    setIsScanning(true);
  };
  
  const isJsonString = (str: string) => {
    try { JSON.parse(str); } catch (e) { return false; }
    return true;
  };

  lookupHandlerRef.current = () => {
    if (!isJsonString(scannedData)) {
      toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'The scanned data is not a valid request.' });
      handleResetScanner();
      return;
    }
    
    try {
        const payload: ScannedData = JSON.parse(scannedData);
        
        if (payload.t === 'c' && payload.u && payload.i) {
            const student = allUsers.find(u => u.id === payload.u);
            if (!student) throw new Error(`Student with ID ${payload.u} not found.`);

            const itemMap = new Map<string, number>();
            payload.i.forEach(scannedItem => {
                const dbItem = items.find(i => i.id === scannedItem.id);
                const itemName = dbItem ? dbItem.name : 'Unknown Item';
                itemMap.set(itemName, (itemMap.get(itemName) || 0) + scannedItem.q);
            });

            const displayItems = Array.from(itemMap.entries()).map(([name, quantity]) => ({ name, quantity }));

            const session: CheckoutSession = {
                borrowerUserId: payload.u,
                studentName: student.displayName,
                items: displayItems,
                originalPayload: payload,
            };

            if (payload.gType === 'Group') {
                session.groupInfo = {
                    number: payload.gNum || '',
                    subject: payload.gSub || '',
                    members: payload.gMem || '',
                }
            }

            setSessionInView(session);
        } else if (payload.t === 'r' && payload.ids) {
            const recordsToReturn = borrowHistory.filter(h => payload.ids.includes(h.id) && (h.status === 'Active' || h.status === 'Pending Return'));
            if (recordsToReturn.length === 0) {
                 toast({ variant: 'destructive', title: 'Invalid Return', description: 'No eligible items to return found for this QR code. The item may have already been returned or is in an invalid state.' });
                 handleResetScanner();
                 return;
            }
            const studentName = recordsToReturn[0]?.studentName || 'Unknown Student';
            const borrowerUserId = recordsToReturn[0]?.borrowerUserId || 'unknown';

            setSelectedReturnGroup({
                studentName: studentName,
                borrowerUserId: borrowerUserId,
                records: recordsToReturn,
            });
        } else if (payload.t === 'res-claim' && payload.rId) {
            const reservationId = payload.rId;
            const recordsToClaim = borrowHistory.filter(h => h.reservationId === reservationId);

            if (recordsToClaim.length === 0) throw new Error(`Reservation with ID ${reservationId} not found.`);
            if (recordsToClaim[0].status !== 'Reserved') throw new Error(`Reservation is not in a claimable state (Status: ${recordsToClaim[0].status}).`);

            const student = allUsers.find(u => u.id === recordsToClaim[0].borrowerUserId);
            if (!student) throw new Error(`Student with ID ${recordsToClaim[0].borrowerUserId} not found.`);

            setClaimSessionInView({
                studentName: student.displayName,
                items: recordsToClaim.map(r => ({ name: r.itemName, quantity: r.itemQuantity || 1})),
                records: recordsToClaim,
            });
        }
        else {
             throw new Error("Invalid QR code data format.");
        }
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Invalid QR Code', description: (e as Error).message || 'The scanned data is not a valid request.' });
        handleResetScanner();
    }
  };

  React.useEffect(() => {
    if (scannedData) {
        lookupHandlerRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedData]);


  React.useEffect(() => {
    const html5QrCode = new Html5Qrcode(qrCodeReaderId);
    
    if (isScanning) {
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 30, supportedScanTypes: [] },
            (decodedText, decodedResult) => {
                setIsScanning(false);
                setScannedData(decodedText);
            },
            (errorMessage) => { /* ignore */ }
        )
        .then(() => {
            setHasCameraPermission(true);
        })
        .catch((err) => {
            setHasCameraPermission(false);
            const errStr = String(err);
            if (
              !errStr.includes("NotAllowedError") &&
              !errStr.includes('transition') &&
              !errStr.includes('not found') &&
              !errStr.includes('play()')
            ) {
              // Non-permission related errors can be logged in development
              if (process.env.NODE_ENV === 'development') {
                console.error("Failed to start QR scanner", err);
              }
            }
        });
    }

    return () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => {
            });
        }
    };
  }, [isScanning]);


  const handleConfirmCheckout = async () => {
    if (!sessionInView || !firestore) return;
    setIsProcessing(true);
    const { originalPayload, studentName } = sessionInView;
    try {
        const batch = writeBatch(firestore);
        const itemQuantityUpdates = new Map<string, number>();
        originalPayload.i.forEach(item => {
            itemQuantityUpdates.set(item.id, (itemQuantityUpdates.get(item.id) || 0) + item.q);
        });
        for (const [itemId, quantityToDecrement] of itemQuantityUpdates.entries()) {
            const itemToUpdate = items.find(i => i.id === itemId);
             if (itemToUpdate) {
                if (itemToUpdate.quantity < quantityToDecrement) throw new Error(`Not enough stock for ${itemToUpdate.name}.`);
                const newQuantity = itemToUpdate.quantity - quantityToDecrement;
                const itemDocRef = doc(firestore, 'inventory_items', itemToUpdate.id);

                const oldStatus = itemToUpdate.status;
                const newStatus = newQuantity > 0
                    ? (oldStatus === 'Borrowed' ? 'Available' : oldStatus)
                    : 'Borrowed';

                 batch.update(itemDocRef, { 
                    quantity: newQuantity,
                    status: newStatus
                });
            } else {
                throw new Error(`Item with ID ${itemId} not found in inventory.`);
            }
        }
        const historyCollectionRef = collection(firestore, 'borrowing_transactions');
        originalPayload.i.forEach(({ id, q }) => {
            const dbItem = items.find(item => item.id === id);
            if (!dbItem) return;
            for (let i=0; i < q; i++) {
                const newDocRef = doc(historyCollectionRef);
                const newRecord: Omit<BorrowHistory, 'id' | 'itemQuantity'> = {
                    borrowerUserId: originalPayload.u,
                    studentName: studentName,
                    itemName: dbItem.name,
                    date: new Date().toISOString(),
                    status: 'Active',
                };

                if (originalPayload.gType === 'Group') {
                    newRecord.borrowingType = 'Group';
                    newRecord.groupNumber = originalPayload.gNum;
                    newRecord.groupSubject = originalPayload.gSub;
                    newRecord.groupMembers = originalPayload.gMem;
                } else {
                    newRecord.borrowingType = 'Individual';
                }

                batch.set(newDocRef, newRecord);
            }
        });
        originalPayload.a.forEach(approvalId => {
            const approvalDocRef = doc(firestore, 'borrowing_transactions', approvalId);
            batch.update(approvalDocRef, { status: 'Active', date: new Date().toISOString() });
        });
        await batch.commit();
        const totalItemsCheckedOut = originalPayload.i.reduce((sum, item) => sum + item.q, 0);
        toast({ title: "Checkout Confirmed", description: `${totalItemsCheckedOut} item(s) checked out to ${studentName}.` });
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not complete checkout.' });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  }

  const handleDenyCheckout = async () => {
    if (!sessionInView) return;
    toast({ variant: "destructive", title: "Checkout Denied", description: `The checkout for ${sessionInView.studentName} has been cancelled.` });
    handleResetScanner();
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
                    status: newQuantity > 0 ? (itemToUpdate.status === 'Borrowed' ? 'Available' : itemToUpdate.status) : 'Borrowed'
                });
            }
        });
        await batch.commit();
        toast({ title: "Items Returned", description: `${selectedReturnGroup.records.length} item(s) from ${selectedReturnGroup.studentName} have been successfully returned.` });
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not process returns. Please try again.' });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  };

  const handleConfirmClaim = async () => {
    if (!claimSessionInView || !firestore) return;
    setIsProcessing(true);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const inventoryUpdates: {ref: any, newQty: number}[] = [];
            
            for (const record of claimSessionInView.records) {
                 const itemQuery = query(collection(firestore, 'inventory_items'), where('name', '==', record.itemName));
                 const itemSnap = await getDocs(itemQuery);
                 if (itemSnap.empty) throw new Error(`Item "${record.itemName}" not found in inventory.`);
                 
                 const itemDoc = itemSnap.docs[0];
                 const itemData = itemDoc.data();
                 const requestedQty = record.itemQuantity || 1;
                 
                 if (itemData.quantity < requestedQty) {
                    throw new Error(`Not enough stock for "${record.itemName}". Available: ${itemData.quantity}, Requested: ${requestedQty}`);
                 }
                 inventoryUpdates.push({ ref: itemDoc.ref, newQty: itemData.quantity - requestedQty });
                 
                 const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
                 transaction.update(historyDocRef, { status: 'Active', date: new Date().toISOString() });
            }

            for(const update of inventoryUpdates) {
                transaction.update(update.ref, { quantity: update.newQty, status: update.newQty > 0 ? 'Available' : 'Borrowed' });
            }
        });

        toast({ title: "Reservation Claimed!", description: `${claimSessionInView.items.length} item type(s) checked out to ${claimSessionInView.studentName}.` });

    } catch(e: any) {
        console.error("Claim transaction failed: ", e);
        toast({ variant: 'destructive', title: 'Claim Failed', description: e.message || "Could not process claim." });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  }

  return (
    <div className="space-y-8">
       <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode /> Live QR Code Scanner</CardTitle>
          <CardDescription>
            Hold a student's QR code in front of the camera to begin a checkout or return process.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                 <div id={qrCodeReaderId} className="w-full h-full" />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
                        <p className="text-destructive font-semibold">Camera Access Denied</p>
                        <p className="text-xs text-muted-foreground">Please enable camera permissions in your browser settings to use the scanner.</p>
                    </div>
                )}
                {isScanning && hasCameraPermission === null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        <p className="text-sm text-muted-foreground mt-2">Initializing camera...</p>
                    </div>
                )}
            </div>
            {scannedData && (!sessionInView && !selectedReturnGroup) && (
                <div className="mt-4 p-3 rounded-md bg-secondary text-secondary-foreground text-center">
                    <p className="text-sm font-semibold">QR Code Detected! Processing...</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={!!sessionInView} onOpenChange={(open) => !open && handleResetScanner()}>
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
                            <p className="text-sm text-muted-foreground">{sessionInView.groupInfo ? 'Group' : 'Individual'} Borrower</p>
                        </div>
                    </div>
                    {sessionInView.groupInfo && (
                        <div>
                            <h4 className="font-semibold mb-2">Group Details:</h4>
                            <div className="text-sm space-y-1 bg-black/20 p-3 rounded-md">
                                <p><span className="text-muted-foreground">Group Number:</span> {sessionInView.groupInfo.number}</p>
                                <p><span className="text-muted-foreground">Subject:</span> {sessionInView.groupInfo.subject}</p>
                                <p><span className="text-muted-foreground">Members:</span> {sessionInView.groupInfo.members}</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold mb-2">Items to Check Out ({sessionInView.items.reduce((acc, item) => acc + item.quantity, 0)}):</h4>
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
      
       <Dialog open={!!selectedReturnGroup} onOpenChange={(open) => !open && handleResetScanner()}>
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
      
      <Dialog open={!!claimSessionInView} onOpenChange={(open) => !open && handleResetScanner()}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle className="font-headline">Confirm Reservation Claim</DialogTitle>
                <DialogDescription>Confirm checkout of reserved items for {claimSessionInView?.studentName}.</DialogDescription>
            </DialogHeader>
            {claimSessionInView && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12"><AvatarFallback>{claimSessionInView.studentName.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="font-semibold">{claimSessionInView.studentName}</p><p className="text-sm text-muted-foreground">Student</p></div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Items to Claim ({claimSessionInView.items.reduce((acc, item) => acc + item.quantity, 0)}):</h4>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 list-disc list-inside bg-black/20 p-3 rounded-md">
                            {claimSessionInView.items.map((item, index) => (
                                <li key={index}><span>{item.name} (x{item.quantity})</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={handleResetScanner} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmClaim} disabled={isProcessing || !claimSessionInView}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Confirm Checkout
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
