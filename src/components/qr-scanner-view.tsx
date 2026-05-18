"use client"

import * as React from "react"
import { QrCode, CornerDownLeft, CheckCircle, Loader2, X, ClipboardCheck, PackageCheck, Scan, Smartphone, CheckSquare } from "lucide-react"
import { useAppContext } from "@/context/app-context"
import type { BorrowHistory } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { useFirestore, useUser } from "@/firebase"
import { doc, writeBatch, collection } from "firebase/firestore"
import { Html5Qrcode } from "html5-qrcode"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createActivityLog } from "@/lib/logging"
import { Textarea } from "@/components/ui/textarea"

type ScannedCompactCheckoutData = {
    t: 'c'; // type: 'checkout'
    sid: string; // session ID
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
  reservationId: string;
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
  const { user: staffUser } = useUser();
  const { toast } = useToast();
  
  const [scannedData, setScannedData] = React.useState("");
  const [sessionInView, setSessionInView] = React.useState<CheckoutSession | null>(null);
  const [claimSessionInView, setClaimSessionInView] = React.useState<ClaimSession | null>(null);
  const [selectedReturnGroup, setSelectedReturnGroup] = React.useState<PendingReturnGroup | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [returnCondition, setReturnCondition] = React.useState<'Good' | 'Defected' | 'Broken' | 'Lost' | ''>('');
  const [returnNotes, setReturnNotes] = React.useState('');
  
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isScanning, setIsScanning] = React.useState(true);

  const lookupHandlerRef = React.useRef<() => void>(() => {});

  const handleResetScanner = () => {
    setScannedData("");
    setSessionInView(null);
    setClaimSessionInView(null);
    setSelectedReturnGroup(null);
    setReturnCondition('');
    setReturnNotes('');
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
                 toast({ variant: 'destructive', title: 'Invalid Return', description: 'No eligible items to return found for this QR code.' });
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
                reservationId: reservationId
            });
        }
        else {
             throw new Error("Invalid QR code data format.");
        }
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Invalid QR Code', description: (e as Error).message });
        handleResetScanner();
    }
  };

  React.useEffect(() => {
    if (scannedData) {
        lookupHandlerRef.current();
    }
  }, [scannedData]);


  React.useEffect(() => {
    const html5QrCode = new Html5Qrcode(qrCodeReaderId);
    
    if (isScanning) {
        Html5Qrcode.getCameras().then(devices => {
            const startConfig = { 
                fps: 30,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            if (devices && devices.length > 0) {
                const backCameras = devices.filter(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
                const primaryCamera = backCameras.find(d => !d.label.toLowerCase().includes('wide') && !d.label.toLowerCase().includes('0.5')) || backCameras[0] || devices[0];
                
                html5QrCode.start(
                    primaryCamera.id,
                    startConfig,
                    (decodedText) => {
                        setIsScanning(false);
                        setScannedData(decodedText);
                    },
                    () => { /* silent error */ }
                )
                .then(() => setHasCameraPermission(true))
                .catch(() => setHasCameraPermission(false));
            } else {
                html5QrCode.start(
                    { facingMode: "environment" },
                    startConfig,
                    (decodedText) => {
                        setIsScanning(false);
                        setScannedData(decodedText);
                    },
                    () => { /* silent error */ }
                )
                .then(() => setHasCameraPermission(true))
                .catch(() => setHasCameraPermission(false));
            }
        });
    }

    return () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
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
                batch.update(itemDocRef, { 
                    quantity: newQuantity,
                    status: newQuantity > 0 ? itemToUpdate.status : 'Borrowed'
                });
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
                    inventoryItemId: dbItem.id,
                    date: new Date().toISOString(),
                    status: 'Active',
                    checkoutSessionId: originalPayload.sid,
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
            batch.update(approvalDocRef, { status: 'Active', date: new Date().toISOString(), checkoutSessionId: originalPayload.sid });
        });
        await batch.commit();

        createActivityLog(
            firestore,
            staffUser?.uid || 'sys',
            staffUser?.displayName || 'Staff',
            'Processed Checkout',
            `Verified checkout for ${studentName}: ${sessionInView.items.map(i=>`${i.name} (x${i.quantity})`).join(', ')}`,
            'Transaction'
        );

        toast({ title: "Checkout Confirmed" });
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  }

  const handleConfirmClaim = async () => {
    if (!claimSessionInView || !firestore) return;
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        
        for (const record of claimSessionInView.records) {
            const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
            batch.update(historyDocRef, { status: 'Active', date: now });

            if (record.inventoryItemId) {
                const item = items.find(i => i.id === record.inventoryItemId);
                if (item) {
                    const requestedQty = record.itemQuantity || 1;
                    if (item.quantity < requestedQty) throw new Error(`Not enough stock for ${item.name}.`);
                    
                    const newQty = item.quantity - requestedQty;
                    batch.update(doc(firestore, 'inventory_items', item.id), {
                        quantity: newQty,
                        status: newQty > 0 ? item.status : 'Borrowed'
                    });
                }
            }
        }

        await batch.commit();

        createActivityLog(
            firestore,
            staffUser?.uid || 'sys',
            staffUser?.displayName || 'Staff',
            'Processed Reservation Claim',
            `Student ${claimSessionInView.studentName} claimed reservation ${claimSessionInView.reservationId}`,
            'Transaction'
        );

        toast({ title: "Reservation Claimed!", description: "Items are now marked as Active." });
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Claim Failed', description: e.message });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  };

  const handleConfirmAllReturns = async (condition: 'Good' | 'Defected' | 'Broken' | 'Lost' | '') => {
    if (!selectedReturnGroup || !firestore || !condition) return;
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        const itemQuantityIncrements = new Map<string, number>();

        for (const record of selectedReturnGroup.records) {
            const historyDocRef = doc(firestore, 'borrowing_transactions', record.id);
            const updatePayload: any = { 
                status: 'Returned', 
                returnCondition: condition,
                returnNotes: returnNotes.trim() || null
            };
            if (condition !== 'Good') updatePayload.resolutionStatus = 'Pending';
            batch.update(historyDocRef, updatePayload);

            if (record.inventoryItemId && condition === 'Good') {
                itemQuantityIncrements.set(record.inventoryItemId, (itemQuantityIncrements.get(record.inventoryItemId) || 0) + 1);
            }
        }

        for (const [itemId, quantityToIncrement] of itemQuantityIncrements.entries()) {
            const itemToUpdate = items.find(i => i.id === itemId);
            if (itemToUpdate) {
                batch.update(doc(firestore, 'inventory_items', itemToUpdate.id), {
                    quantity: itemToUpdate.quantity + quantityToIncrement,
                    status: 'Available'
                });
            }
        }
        await batch.commit();

        createActivityLog(
            firestore,
            staffUser?.uid || 'sys',
            staffUser?.displayName || 'Staff',
            'Processed Return',
            `Verified return for ${selectedReturnGroup.studentName} with condition: ${condition}${returnNotes ? ` (Notes: ${returnNotes})` : ''}`,
            'Transaction'
        );

        toast({ title: "Items Returned" });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsProcessing(false);
        handleResetScanner();
    }
  };

  return (
    <div className="space-y-8">
       <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode /> Live QR Code Scanner</CardTitle>
          <CardDescription>Scan student codes to process checkouts, returns, or claims.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="aspect-square md:aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                 <div id={qrCodeReaderId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
                        <p className="text-destructive font-semibold">Camera Access Denied</p>
                        <p className="text-sm text-muted-foreground mt-2">Please enable camera permissions in your browser settings to use the scanner.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={!!sessionInView} onOpenChange={(open) => !open && handleResetScanner()}>
        <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="text-primary"/> Confirm Checkout</DialogTitle></DialogHeader>
            {sessionInView && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12"><AvatarFallback>{sessionInView.studentName.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="font-semibold">{sessionInView.studentName}</p></div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-2">Items to Issue</h4>
                        <ul className="space-y-2 list-disc list-inside bg-black/20 p-3 rounded-md">
                            {sessionInView.items.map((item, index) => (<li key={index}>{item.name} (x{item.quantity})</li>))}
                        </ul>
                    </div>
                    {sessionInView.groupInfo && (
                        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 text-xs">
                            <p className="font-bold">Group Session: {sessionInView.groupInfo.number} ({sessionInView.groupInfo.subject})</p>
                            <p className="text-muted-foreground mt-1">Members: {sessionInView.groupInfo.members}</p>
                        </div>
                    )}
                </div>
            )}
            <DialogFooter>
                <Button variant="destructive" onClick={handleResetScanner} disabled={isProcessing}>Deny</Button>
                <Button onClick={handleConfirmCheckout} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
                    Confirm Issue
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reservation Claim Dialog */}
      <Dialog open={!!claimSessionInView} onOpenChange={(open) => !open && handleResetScanner()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><PackageCheck className="text-green-500"/> Confirm Reservation Claim</DialogTitle>
                <DialogDescription>Student is picking up their pre-approved reservation.</DialogDescription>
            </DialogHeader>
            {claimSessionInView && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12"><AvatarFallback>{claimSessionInView.studentName.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="font-semibold">{claimSessionInView.studentName}</p></div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-2">Reserved Materials</h4>
                        <ul className="space-y-2 list-disc list-inside bg-black/20 p-3 rounded-md">
                            {claimSessionInView.items.map((item, index) => (<li key={index}>{item.name} (x{item.quantity})</li>))}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={handleResetScanner} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmClaim} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
                    Confirm Claim
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Return Dialog */}
       <Dialog open={!!selectedReturnGroup} onOpenChange={(open) => !open && handleResetScanner()}>
        <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Confirm Return</DialogTitle></DialogHeader>
            {selectedReturnGroup && (
                <div className="py-4 space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2">Items from {selectedReturnGroup.studentName}:</h4>
                        <ul className="space-y-1 text-sm list-disc list-inside bg-black/20 p-3 rounded-md max-h-32 overflow-y-auto">
                           {selectedReturnGroup.records.map(r => (<li key={r.id}>{r.itemName}</li>))}
                        </ul>
                    </div>
                     <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Condition</Label>
                            <RadioGroup value={returnCondition} onValueChange={(v) => setReturnCondition(v as any)} className="mt-3 space-y-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Good" id="cond-good" /><Label htmlFor="cond-good" className="cursor-pointer">Good</Label></div>
                                <div className="flex items-center space-x-2 text-yellow-500"><RadioGroupItem value="Defected" id="cond-defected" /><Label htmlFor="cond-defected" className="cursor-pointer">Defected</Label></div>
                                <div className="flex items-center space-x-2 text-orange-500"><RadioGroupItem value="Broken" id="cond-broken" /><Label htmlFor="cond-broken" className="cursor-pointer">Broken</Label></div>
                                <div className="flex items-center space-x-2 text-destructive"><RadioGroupItem value="Lost" id="cond-lost" /><Label htmlFor="cond-lost" className="cursor-pointer">Lost / Missing</Label></div>
                            </RadioGroup>
                        </div>
                        
                        {(returnCondition !== 'Good' && returnCondition !== '') && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label htmlFor="return-notes" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    {returnCondition === 'Lost' ? 'Specify Missing Parts' : 'Describe Damage'}
                                </Label>
                                <Textarea 
                                    id="return-notes"
                                    placeholder={returnCondition === 'Lost' ? "e.g., Breadboard and jumper wires are missing from the kit." : "e.g., Screen is cracked but functional."}
                                    value={returnNotes}
                                    onChange={(e) => setReturnNotes(e.target.value)}
                                    className="mt-2 min-h-[80px]"
                                    required={returnCondition === 'Lost'}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={handleResetScanner}>Cancel</Button>
                <Button 
                    onClick={() => handleConfirmAllReturns(returnCondition)} 
                    disabled={isProcessing || !returnCondition || (returnCondition === 'Lost' && !returnNotes.trim())}
                >
                    Confirm Return
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
