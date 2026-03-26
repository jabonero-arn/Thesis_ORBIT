"use client"

import * as React from "react"
import { QrCode, CornerDownLeft, User, CheckCircle, Loader2 } from "lucide-react"
import { useAppContext } from "@/context/app-context"
import type { BorrowHistory } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { allUsers } from "@/lib/data"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"

type CheckoutSession = {
  sessionId: string;
  studentName: string;
  items: string[];
  date: string;
}

type QrScannerViewProps = {
    onReturn: (historyId: string) => void;
}

export function QrScannerView({ onReturn }: QrScannerViewProps) {
  const { borrowHistory, setBorrowHistory, setItems } = useAppContext();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = React.useState<CheckoutSession | null>(null);
  const [selectedReturn, setSelectedReturn] = React.useState<BorrowHistory | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const pendingCheckouts = React.useMemo(() => {
    const sessions = new Map<string, CheckoutSession>();

    borrowHistory.forEach(record => {
      if (record.status === 'Approved' && record.checkoutSessionId) {
        if (!sessions.has(record.checkoutSessionId)) {
          sessions.set(record.checkoutSessionId, {
            sessionId: record.checkoutSessionId,
            studentName: record.studentName,
            items: [],
            date: record.date
          });
        }
        sessions.get(record.checkoutSessionId)!.items.push(record.itemName);
      }
    });

    return Array.from(sessions.values());
  }, [borrowHistory]);

  const pendingReturns = React.useMemo(() => {
    try {
      const returnIds = new Set<string>();
      return borrowHistory.filter(record => {
        if (record.status !== 'Pending Return') return false;
        
        const parsedData = JSON.parse(new URLSearchParams(record.id).get('data') || '{}');
        if(parsedData.returnId && !returnIds.has(parsedData.returnId)) {
            returnIds.add(parsedData.returnId);
            return true;
        }
        
        // Fallback for non-JSON IDs
        if(!record.id.includes('{')) {
            return true;
        }

        return false;
      });
    } catch (e) {
      return borrowHistory.filter(r => r.status === 'Pending Return');
    }
  }, [borrowHistory]);

  
  const handleSelectSession = (session: CheckoutSession) => {
      setSelectedSession(session);
  }
  
  const handleSelectReturn = (returnRecord: BorrowHistory) => {
    setSelectedReturn(returnRecord);
  }


  const handleConfirmCheckout = () => {
    if (!selectedSession) return;
    setIsProcessing(true);
    
    setTimeout(() => {
        const itemUpdates = new Map<string, number>();
        selectedSession.items.forEach(itemName => {
            itemUpdates.set(itemName, (itemUpdates.get(itemName) || 0) + 1);
        });

        setItems(prevItems => prevItems.map(item => {
            if (itemUpdates.has(item.name)) {
                const newQuantity = item.quantity - (itemUpdates.get(item.name) || 0);
                return {
                    ...item,
                    quantity: newQuantity,
                    status: newQuantity > 0 ? item.status : 'Borrowed'
                };
            }
            return item;
        }));

        setBorrowHistory(prev => 
            prev.map(record => 
                record.checkoutSessionId === selectedSession.sessionId 
                    ? { ...record, status: 'Active' } 
                    : record
            )
        );

        toast({
            title: "Checkout Confirmed",
            description: `${selectedSession.items.length} item(s) have been checked out to ${selectedSession.studentName}.`
        });

        setIsProcessing(false);
        setSelectedSession(null);
    }, 1000);
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

  const studentForCheckout = selectedSession ? allUsers.find(u => u.name === selectedSession.studentName) || { name: selectedSession.studentName, avatarUrl: '', role: 'Student' } : null;
  const studentForReturn = selectedReturn ? allUsers.find(u => u.name === selectedReturn.studentName) || { name: selectedReturn.studentName, avatarUrl: '', role: 'Student' } : null;

  return (
    <div className="space-y-8">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Pending Checkouts</CardTitle>
          <CardDescription>
            Select a pending session to process a student's borrowed items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCheckouts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingCheckouts.map(session => (
                <button 
                  key={session.sessionId}
                  onClick={() => handleSelectSession(session)}
                  className="p-4 rounded-lg bg-secondary hover:bg-accent text-left transition-colors flex items-start gap-4"
                >
                    <QrCode className="h-8 w-8 text-primary flex-shrink-0 mt-1"/>
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
              <p className="text-sm">Wait for a student to generate a QR code.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Pending Returns</CardTitle>
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

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline">Confirm Checkout</DialogTitle>
                <DialogDescription>Review the items and confirm the checkout for the student.</DialogDescription>
            </DialogHeader>
            {selectedSession && studentForCheckout && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
                        <Avatar className="h-12 w-12">
                           <AvatarImage src={studentForCheckout.avatarUrl} alt={studentForCheckout.name} />
                           <AvatarFallback>{studentForCheckout.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{studentForCheckout.name}</p>
                            <p className="text-sm text-muted-foreground">{studentForCheckout.role}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Items to Check Out:</h4>
                        <ul className="space-y-1 text-sm list-disc list-inside bg-black/20 p-3 rounded-md">
                           {selectedSession.items.map((item, index) => (
                               <li key={index}>{item}</li>
                           ))}
                        </ul>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSession(null)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleConfirmCheckout} disabled={isProcessing}>
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
