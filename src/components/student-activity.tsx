
'use client'

import type { BorrowHistory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PackageCheck, CornerDownLeft, Hourglass, History, CalendarDays, XCircle, Minus, Plus, QrCode } from "lucide-react"
import * as React from "react"
import { format, isToday } from "date-fns"
import { ReturnConditionBadge } from "./return-condition-badge"


type StudentActivityProps = {
    borrowHistory: BorrowHistory[]
    onReturn: (records: BorrowHistory[]) => void
    view: 'borrowed' | 'requests' | 'reservations' | 'history' | 'issues'
    onCancelReservation: (reservationId: string) => void
    onClaimReservation: (reservationId: string) => void
}

const getStatusBadge = (record: BorrowHistory) => {
    switch(record.status) {
        case 'Active':
            return <Badge variant="destructive">Borrowed</Badge>
        case 'Reserved':
             return <Badge variant="default">Reservation Confirmed</Badge>;
        case 'Approved':
            return <Badge variant="default">Approved for Borrowing</Badge>;
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

export function StudentActivity({ borrowHistory, onReturn, view, onCancelReservation, onClaimReservation }: StudentActivityProps) {
    const [selectedToReturn, setSelectedToReturn] = React.useState<Map<string, number>>(new Map());
    
    const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
    
    const groupedActiveBorrows = React.useMemo(() => {
        const groups: { [compositeKey: string]: BorrowHistory[] } = {};
        activeBorrows.forEach(record => {
            const key = record.borrowingType === 'Group' && record.groupNumber && record.groupSubject
                ? `group_${record.itemName}_${record.groupNumber}_${record.groupSubject}`
                : `individual_${record.itemName}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });
        return Object.values(groups);
    }, [activeBorrows]);

    const requestHistory = borrowHistory
        .filter(h => h.teacherId && (h.status === 'Pending' || h.status === 'Approved' || h.status === 'Denied'))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const groupedReservations = React.useMemo(() => {
        const reservationRecords = borrowHistory.filter(h => h.reservationId);
        
        if (!reservationRecords.length) return [];
        
        const groups: { [id: string]: { records: BorrowHistory[], status: BorrowHistoryStatus, date: string, startTime?: string, endTime?: string } } = {};

        reservationRecords.forEach(record => {
            if (!record.reservationId) return;
            if (!groups[record.reservationId]) {
                groups[record.reservationId] = {
                    records: [],
                    status: record.status, 
                    date: record.date,
                    startTime: record.startTime,
                    endTime: record.endTime
                };
            }
            groups[record.reservationId].records.push(record);
        });

        return Object.values(groups)
            .filter(g => g.records.length > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [borrowHistory]);

    const historyLog = borrowHistory
        .filter(h => h.status !== 'Active' && !(h.status==='Pending' && h.teacherId) && !(h.status==='Pending' && h.startTime) && !(h.status==='Approved' && !h.startTime) && !(h.status==='Reserved') && !h.reservationId)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const issuesLog = borrowHistory
        .filter(h => h.returnCondition === 'Defected' || h.returnCondition === 'Broken' || h.returnCondition === 'Lost')
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const totalToReturn = Array.from(selectedToReturn.values()).reduce((sum, quantity) => sum + quantity, 0);

    const handleQuantityChange = (compositeKey: string, newQuantity: number, maxQuantity: number) => {
        const boundedQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
        setSelectedToReturn(prev => new Map(prev).set(compositeKey, boundedQuantity));
    };

    const handleReturnSelected = () => {
        const recordsToReturn: BorrowHistory[] = [];
        selectedToReturn.forEach((quantity, compositeKey) => {
            if (quantity > 0) {
                const group = groupedActiveBorrows.find(g => {
                    const firstRecord = g[0];
                    if (!firstRecord) return false;
                     const key = firstRecord.borrowingType === 'Group' && firstRecord.groupNumber && firstRecord.groupSubject
                        ? `group_${firstRecord.itemName}_${firstRecord.groupNumber}_${firstRecord.groupSubject}`
                        : `individual_${firstRecord.itemName}`;
                    return key === compositeKey;
                });

                if (group) {
                    recordsToReturn.push(...group.slice(0, quantity));
                }
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
                                
                                const compositeKey = firstRecord.borrowingType === 'Group' && firstRecord.groupNumber && firstRecord.groupSubject
                                    ? `group_${firstRecord.itemName}_${firstRecord.groupNumber}_${firstRecord.groupSubject}`
                                    : `individual_${firstRecord.itemName}`;

                                const returnQuantity = selectedToReturn.get(compositeKey) || 0;

                                return (
                                    <div key={compositeKey} className="p-3 rounded-lg bg-black/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="font-semibold">{firstRecord.itemName}</p>
                                                    <p className="text-sm text-muted-foreground">Quantity: {group.length}</p>
                                                    <p className="text-sm text-muted-foreground">Last borrowed: {format(new Date(firstRecord.date), 'MMM d, yyyy, h:mm a')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        className="h-7 w-7" 
                                                        onClick={() => handleQuantityChange(compositeKey, returnQuantity - 1, group.length)}
                                                        disabled={returnQuantity <= 0}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-bold text-lg">{returnQuantity}</span>
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        className="h-7 w-7" 
                                                        onClick={() => handleQuantityChange(compositeKey, returnQuantity + 1, group.length)}
                                                        disabled={returnQuantity >= group.length}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                         {firstRecord.borrowingType === 'Group' && (
                                            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                                <p><b>Group {firstRecord.groupNumber}</b> ({firstRecord.groupSubject})</p>
                                                <p>Members: {firstRecord.groupMembers}</p>
                                            </div>
                                        )}
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
                                <div key={record.id} className="p-3 rounded-lg bg-black/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{record.itemName}</p>
                                            <p className="text-sm text-muted-foreground">Date: {format(new Date(record.date), 'MMM d, yyyy, h:mm a')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(record)}
                                        </div>
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
            {groupedReservations && groupedReservations.length > 0 ? (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {groupedReservations.map((group, index) => {
                    const reservationId = group.records[0].reservationId;
                    if (!reservationId) return null;
                    
                    const firstRecord = group.records[0];
                    const canClaim = group.status === 'Reserved' && isToday(new Date(group.date));
                    const canCancel = group.status === 'Pending' || (group.status === 'Reserved' && !isToday(new Date(group.date)));

                    return (
                        <div key={reservationId || index} className="p-4 rounded-lg bg-black/20 border border-border/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-lg">Reservation</p>
                                    <p className="text-sm text-muted-foreground">{format(new Date(group.date), 'MMM d, yyyy')} at {group.startTime} - {group.endTime}</p>
                                </div>
                                {getStatusBadge(group.records[0])}
                            </div>
                            <ul className="list-disc list-inside my-3 space-y-1 pl-1">
                                {group.records.map(record => (
                                    <li key={record.id} className="text-sm">{record.itemName} (x{record.itemQuantity || 1})</li>
                                ))}
                            </ul>
                             {firstRecord.borrowingType === 'Group' && (
                                <div className="mb-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                    <p><b>Group {firstRecord.groupNumber}</b> ({firstRecord.groupSubject})</p>
                                    <p>Members: {firstRecord.groupMembers}</p>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                                {canCancel && (
                                    <Button size="sm" variant="destructive" onClick={() => onCancelReservation(reservationId)}>
                                        <XCircle className="mr-2 h-4 w-4"/> Cancel
                                    </Button>
                                )}
                                {group.status === 'Reserved' && (
                                     <Button size="sm" onClick={() => onClaimReservation(reservationId)} disabled={!canClaim}>
                                        <QrCode className="mr-2 h-4 w-4"/> Claim Items
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
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
                        <div key={record.id} className="p-3 rounded-lg bg-black/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{record.itemName}</p>
                                    <p className="text-sm text-muted-foreground">Date: {format(new Date(record.date), 'MMM d, yyyy, h:mm a')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {record.status === 'Returned' && record.returnCondition
                                        ? <ReturnConditionBadge condition={record.returnCondition} />
                                        : getStatusBadge(record)}
                                </div>
                            </div>
                            {record.borrowingType === 'Group' && (
                                <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                    <p><b>Group {record.groupNumber}</b> ({record.groupSubject})</p>
                                    <p>Members: {record.groupMembers}</p>
                                </div>
                            )}
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

    if (view === 'issues') {
      return (
        <Card id="issues-log" className="bg-card/80 scroll-mt-20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <XCircle className="h-6 w-6" /> Damaged/Lost Items
                </CardTitle>
                <CardDescription>A log of items you returned with issues.</CardDescription>
            </CardHeader>
            <CardContent>
                {issuesLog.length > 0 ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {issuesLog.map(record => (
                            <div key={record.id} className="p-3 rounded-lg bg-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{record.itemName}</p>
                                        <p className="text-sm text-muted-foreground">Date: {format(new Date(record.date), 'MMM d, yyyy, h:mm a')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {record.returnCondition && <ReturnConditionBadge condition={record.returnCondition} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center p-4">You have no damaged or lost item history.</p>
                )}
            </CardContent>
        </Card>
      )
    }


    return null;
}
