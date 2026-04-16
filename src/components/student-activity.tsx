
'use client'

import type { BorrowHistory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PackageCheck, CornerDownLeft, Hourglass, History, CalendarDays, XCircle, Minus, Plus } from "lucide-react"
import * as React from "react"


type StudentActivityProps = {
    borrowHistory: BorrowHistory[]
    onReturn: (records: BorrowHistory[]) => void
    view: 'borrowed' | 'requests' | 'reservations' | 'history'
    onCancelReservation: (historyId: string) => void
}

const getStatusBadge = (record: BorrowHistory) => {
    switch(record.status) {
        case 'Active':
            return <Badge variant="destructive">Borrowed</Badge>
        case 'Approved':
            if (record.startTime) {
                return <Badge variant="default">Reservation Confirmed</Badge>;
            }
            return <Badge variant="default">Approved for Pickup</Badge>;
        case 'Pending':
             if (record.teacherId) {
                return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending Teacher Approval</Badge>
             }
             if (record.startTime) {
                return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending Staff Approval</Badge>
             }
             return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending</Badge>;
        case 'Pending Return':
            return <Badge variant="secondary">Processing Return...</Badge>
        case 'Returned':
            return <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Returned</Badge>
        case 'Denied':
            return <Badge variant="destructive" className="bg-red-900/80 border-red-700 text-red-300">Denied</Badge>
        case 'Cancelled':
            return <Badge variant="destructive">Cancelled</Badge>
        default:
            return null
    }
}

export function StudentActivity({ borrowHistory, onReturn, view, onCancelReservation }: StudentActivityProps) {
    const [selectedToReturn, setSelectedToReturn] = React.useState<Map<string, number>>(new Map());
    
    const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
    
    const groupedActiveBorrows = React.useMemo(() => {
        const groups: { [itemName: string]: BorrowHistory[] } = {};
        activeBorrows.forEach(record => {
            if (!groups[record.itemName]) {
                groups[record.itemName] = [];
            }
            groups[record.itemName].push(record);
        });
        return Object.values(groups);
    }, [activeBorrows]);

    const requestHistory = borrowHistory
        .filter(h => h.teacherId && (h.status === 'Pending' || h.status === 'Approved' || h.status === 'Denied'))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const reservations = borrowHistory
        .filter(h => h.startTime && (h.status === 'Pending' || h.status === 'Approved' || h.status === 'Denied'))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const historyLog = borrowHistory
        .filter(h => h.status === 'Returned' || h.status === 'Cancelled' || h.status === 'Pending Return' || (h.status === 'Denied' && !h.startTime && !h.teacherId))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const totalToReturn = Array.from(selectedToReturn.values()).reduce((sum, quantity) => sum + quantity, 0);

    const handleQuantityChange = (itemName: string, newQuantity: number, maxQuantity: number) => {
        const boundedQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
        setSelectedToReturn(prev => new Map(prev).set(itemName, boundedQuantity));
    };

    const handleReturnSelected = () => {
        const recordsToReturn: BorrowHistory[] = [];
        selectedToReturn.forEach((quantity, itemName) => {
            if (quantity > 0) {
                const availableRecords = borrowHistory.filter(h => 
                    h.itemName === itemName && h.status === 'Active'
                );
                recordsToReturn.push(...availableRecords.slice(0, quantity));
            }
        });
        
        if (recordsToReturn.length > 0) {
            onReturn(recordsToReturn);
        }
        setSelectedToReturn(new Map());
    };


    if (view === 'borrowed') {
        return (
            <Card id="borrowed-items" className="bg-card/80 scroll-mt-20">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between font-headline">
                        <div className="flex items-center gap-2">
                           <PackageCheck className="h-6 w-6" /> My Borrowed Items
                        </div>
                         <Button size="sm" onClick={handleReturnSelected} disabled={totalToReturn === 0}>
                            <CornerDownLeft className="mr-2 h-4 w-4"/> Return Selected ({totalToReturn})
                        </Button>
                    </CardTitle>
                    <CardDescription>Items you currently have checked out. Select a quantity to generate a return QR code.</CardDescription>
                </CardHeader>
                <CardContent>
                    {groupedActiveBorrows.length > 0 ? (
                        <div className="space-y-4">
                            {groupedActiveBorrows.map(group => {
                                const firstRecord = group[0];
                                if (!firstRecord) return null;

                                const returnQuantity = selectedToReturn.get(firstRecord.itemName) || 0;

                                return (
                                    <div key={firstRecord.itemName} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-semibold">{firstRecord.itemName}</p>
                                                <p className="text-sm text-muted-foreground">Borrowed: {group.length}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Button 
                                                    size="icon" 
                                                    variant="outline" 
                                                    className="h-7 w-7" 
                                                    onClick={() => handleQuantityChange(firstRecord.itemName, returnQuantity - 1, group.length)}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-8 text-center font-bold text-lg">{returnQuantity}</span>
                                                <Button 
                                                    size="icon" 
                                                    variant="outline" 
                                                    className="h-7 w-7" 
                                                    onClick={() => handleQuantityChange(firstRecord.itemName, returnQuantity + 1, group.length)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center p-4">You have no items currently borrowed.</p>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (view === 'requests') {
        return (
            <Card id="requests" className="bg-card/80 scroll-mt-20">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <Hourglass className="h-6 w-6" /> My Requests
                    </CardTitle>
                    <CardDescription>A history of your item requests for locked items and their status.</CardDescription>
                </CardHeader>
                <CardContent>
                    {requestHistory.length > 0 ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {requestHistory.map(record => (
                                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                    <div>
                                        <p className="font-semibold">{record.itemName}</p>
                                        <p className="text-sm text-muted-foreground">Date: {new Date(record.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(record)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center p-4">You have not made any requests yet.</p>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (view === 'reservations') {
      return (
        <Card id="reservations" className="bg-card/80 scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <CalendarDays className="h-6 w-6" /> My Reservations
            </CardTitle>
            <CardDescription>Your pending and confirmed reservations.</CardDescription>
          </CardHeader>
          <CardContent>
            {reservations.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {reservations.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <div>
                      <p className="font-semibold">{record.itemName}</p>
                      <p className="text-sm text-muted-foreground">Date: {new Date(record.date).toLocaleDateString()}</p>
                      {record.startTime && record.endTime && <p className="text-sm text-muted-foreground">Time: {record.startTime} - {record.endTime}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(record)}
                      {record.status === 'Pending' && (
                          <Button size="sm" variant="destructive" onClick={() => onCancelReservation(record.id)}>
                              <XCircle className="mr-2 h-4 w-4"/> Cancel
                          </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center p-4">You have no reservations.</p>
            )}
          </CardContent>
        </Card>
      )
    }

    if (view === 'history') {
      return (
        <Card id="history-log" className="bg-card/80 scroll-mt-20">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
                <History className="h-6 w-6" /> History Log
            </CardTitle>
            <CardDescription>Your past borrowing history.</CardDescription>
        </CardHeader>
        <CardContent>
            {historyLog.length > 0 ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {historyLog.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                            <div>
                                <p className="font-semibold">{record.itemName}</p>
                                <p className="text-sm text-muted-foreground">Date: {new Date(record.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(record)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center p-4">You have no past transactions.</p>
            )}
        </CardContent>
        </Card>
      )
    }


    return null;
}
