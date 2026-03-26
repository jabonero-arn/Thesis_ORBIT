"use client"

import type { BorrowHistory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Hourglass, PackageCheck, CornerDownLeft } from "lucide-react"

type StudentActivityProps = {
    borrowHistory: BorrowHistory[]
    onReturn: (historyId: string) => void
}

const getStatusBadge = (status: BorrowHistory['status']) => {
    switch(status) {
        case 'Active':
            return <Badge variant="destructive">Borrowed</Badge>
        case 'Approved':
            return <Badge variant="default">Reserved</Badge>
        case 'Pending':
             return <Badge variant="outline" className="border-amber-500 text-amber-400">Pending Teacher Approval</Badge>
        case 'Pending Return':
            return <Badge variant="secondary">Pending Return</Badge>
        default:
            return null
    }
}

export function StudentActivity({ borrowHistory, onReturn }: StudentActivityProps) {
    const activeBorrows = borrowHistory.filter(h => h.status === 'Active' || h.status === 'Pending Return');
    const pendingReservations = borrowHistory.filter(h => h.status === 'Approved' || h.status === 'Pending');

    return (
        <div className="space-y-8 mt-8">
            <Card className="bg-card/80">
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
                                        {getStatusBadge(record.status)}
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

            <Card className="bg-card/80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <Hourglass className="h-6 w-6" /> My Requests & Reservations
                    </CardTitle>
                    <CardDescription>Items you have requested or reserved for a future date.</CardDescription>
                </CardHeader>
                <CardContent>
                     {pendingReservations.length > 0 ? (
                        <div className="space-y-4">
                            {pendingReservations.map(record => (
                                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                                    <div>
                                        <p className="font-semibold">{record.itemName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Requested for: {new Date(record.date).toLocaleDateString()}
                                            {record.startTime && record.endTime && ` from ${record.startTime} to ${record.endTime}`}
                                        </p>
                                    </div>
                                    {getStatusBadge(record.status)}
                                </div>
                            ))}
                        </div>
                     ) : (
                        <p className="text-muted-foreground text-center p-4">You have no pending requests or reservations.</p>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}
