"use client"

import type { BorrowHistory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PackageCheck, CornerDownLeft, Hourglass } from "lucide-react"

type StudentActivityProps = {
    borrowHistory: BorrowHistory[]
    onReturn: (historyId: string) => void
    view: 'borrowed' | 'requests'
}

const getStatusBadge = (record: BorrowHistory) => {
    switch(record.status) {
        case 'Active':
            return <Badge variant="destructive">Borrowed</Badge>
        case 'Approved':
             if (record.startTime) {
                return <Badge variant="default">Reserved</Badge>;
            }
            return <Badge variant="default">Approved for Pickup</Badge>;
        case 'Pending':
             return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending</Badge>
        case 'Pending Return':
            return <Badge variant="secondary">Pending Return</Badge>
        case 'Returned':
            return <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Returned</Badge>
        case 'Denied':
            return <Badge variant="destructive" className="bg-red-900/80 border-red-700 text-red-300">Denied</Badge>
        default:
            return null
    }
}

export function StudentActivity({ borrowHistory, onReturn, view }: StudentActivityProps) {
    const borrowedStatuses: BorrowHistory['status'][] = ['Active', 'Pending Return'];
    const activeBorrows = borrowHistory.filter(h => borrowedStatuses.includes(h.status));
    
    // In "My Requests", we show items that are not yet active borrows.
    // This includes pending requests, reservations, and historical (denied/returned) items.
    const requestHistory = borrowHistory.filter(h => {
        switch (h.status) {
            case 'Pending':
            case 'Denied':
            case 'Returned':
                return true; // Historical and pending items are always part of the request history.
            case 'Approved':
                // An "Approved" item is a reservation only if it has a start time.
                // If it doesn't, it's an immediate borrow awaiting pickup by staff, which shouldn't be in this list.
                return !!h.startTime && !!h.endTime;
            default:
                // 'Active' and 'Pending Return' statuses belong in the 'borrowed' list, not here.
                return false;
        }
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    if (view === 'borrowed') {
        return (
            <Card id="borrowed-items" className="bg-card/80 scroll-mt-20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <PackageCheck className="h-6 w-6" /> My Borrowed Items
                    </CardTitle>
                    <CardDescription>Items you currently have checked out.</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeBorrows.length > 0 ? (
                        <div className="space-y-4">
                            {activeBorrows.map(record => (
                                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                    <div>
                                        <p className="font-semibold">{record.itemName}</p>
                                        <p className="text-sm text-muted-foreground">Borrowed on: {new Date(record.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(record)}
                                        {record.status === 'Active' && (
                                            <Button size="sm" variant="outline" onClick={() => onReturn(record.id)}>
                                                <CornerDownLeft className="mr-2 h-4 w-4"/> Return
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                    <CardDescription>A history of your item requests and their status.</CardDescription>
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

    return null;
}
