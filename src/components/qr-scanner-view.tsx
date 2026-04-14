
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
import { doc, writeBatch, collection } from "firebase/firestore"
import { Html5Qrcode } from "html5-qrcode"


type ScannedCompactCheckoutData = {
    t: 'c'; // type: 'checkout'
    u: string; // userId
    i: { id: string; q: number }[]; // items: id and quantity
    a: string[]; // approvalsToConsume
}

type ScannedReturnData = {
    t: 'r'; // type: 'return'
    ids: string[]; // array of borrowHistory document IDs
};

type ScannedData = ScannedCompactCheckoutData | ScannedReturnData;

type CheckoutSession = {
  studentName: string;
  items: { name: string; quantity: number}[];
  borrowerUserId: string;
  originalPayload: ScannedCompactCheckoutData;
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
  const [selectedReturnGroup, setSelectedReturnGroup] = React.useState<PendingReturnGroup | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isScanning, setIsScanning] = React.useState(true);

  // Use a ref to hold the lookup handler. This prevents the scanner's useEffect
  // from re-running every time the underlying data changes.
  const lookupHandlerRef = React.useRef<() => void>(() => {});

  const handleResetScanner = () => {
    setScannedData("");
    setSessionInView(null);
    setSelectedReturnGroup(null);
    setIsScanning(true);
  };
  
  const isJsonString = (str: string) => {
    try { JSON.parse(str); } catch (e) { return false; }
    return true;
  };

  // The actual lookup logic, defined inside the component to access latest state.
  const handleLookupQr = () => {
    if (!isJsonString(scannedData)) {
      toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'The scanned data is not a valid request.' });
      handleResetScanner();
      return;
    }
    
    try {
        const payload: ScannedData = JSON.parse(scannedData);
        
        // Handle CHECKOUT payload
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

            setSessionInView({
                borrowerUserId: payload.u,
                studentName: student.displayName,
                items: displayItems,
                originalPayload: payload,
            });
        // Handle RETURN payload
        } else if (payload.t === 'r' && payload.ids) {
            const recordsToReturn = borrowHistory.filter(h => payload.ids.includes(h.id) && h.status === 'Pending Return');
            if (recordsToReturn.length === 0) {
                 toast({ variant: 'destructive', title: 'Invalid Return', description: 'No pending returns found for this QR code.' });
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

  // Keep the ref pointing to the latest version of the handler function
  lookupHandlerRef.current = handleLookupQr;

  // This effect now ONLY runs when scannedData changes, preventing re-renders.
  React.useEffect(() => {
    if (scannedData) {
        lookupHandlerRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedData]);


  // This effect controls the scanner hardware and ONLY runs when `isScanning` changes.
  React.useEffect(() => {
    const html5QrCode = new Html5Qrcode(qrCodeReaderId);

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, supportedScanTypes: [] },
          (decodedText) => {
            // On success, immediately stop scanning and set the data.
            // This prevents duplicate scans.
            if (html5QrCode.isScanning) {
              html5QrCode.stop();
            }
            setIsScanning(false);
            setScannedData(decodedText);
          },
          (errorMessage) => { /* Ignore 'not found' errors */ }
        );
        if (hasCameraPermission === null || hasCameraPermission === false) {
           setHasCameraPermission(true);
        }
      } catch (err) {
        setHasCameraPermission(false);
        // Do not log the "already under transition" error as it's a known race condition we are avoiding.
        if (!String(err).includes('already under transition')) {
            console.error("Failed to start QR scanner", err);
        }
      }
    };
    
    if (isScanning) {
        startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
            // Errors on stop can happen if it's already stopping. Safe to ignore.
        });
      }
    };
  }, [isScanning, hasCameraPermission]);


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

                // **BUG FIX**: Correctly update status based on new quantity.
                // If quantity becomes 0, it's 'Borrowed'.
                // If it's > 0 and was 'Borrowed', it becomes 'Available'.
                // Otherwise, it keeps its existing status (e.g., 'Locked').
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
                const newRecord: Omit<BorrowHistory, 'id'> = {
                    borrowerUserId: originalPayload.u,
                    studentName: studentName,
                    itemName: dbItem.name,
                    date: new Date().toISOString(),
                    status: 'Active',
                };
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
                    // **BUG FIX**: Logic mirrored from checkout for consistency
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
                            <p className="text-sm text-muted-foreground">Student</p>
                        </div>
                    </div>
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
    </div>
  )
}
