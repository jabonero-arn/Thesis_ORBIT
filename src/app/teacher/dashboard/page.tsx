"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Check, History, X } from "lucide-react"
import { borrowHistory as initialBorrowHistory } from "@/lib/data"
import type { BorrowHistory } from "@/lib/types"

export default function TeacherDashboardPage() {
  const [history, setHistory] = React.useState<BorrowHistory[]>(initialBorrowHistory)
  const { toast } = useToast()

  const pendingRequests = history.filter((r) => r.status === 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const processedRequests = history.filter((r) => r.status !== 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRequest = (id: string, newStatus: 'Approved' | 'Denied') => {
    setHistory(currentHistory => 
      currentHistory.map(record => 
        record.id === id ? { ...record, status: newStatus } : record
      )
    )
    const updatedRecord = history.find(r => r.id === id);
    if (updatedRecord) {
        toast({
            title: `Request ${newStatus}`,
            description: `Request for "${updatedRecord.itemName}" from ${updatedRecord.studentName} has been ${newStatus.toLowerCase()}.`,
        })
    }
  }

  const getBadgeVariant = (status: 'Approved' | 'Denied') => {
    switch (status) {
      case 'Approved':
        return 'secondary'
      case 'Denied':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="items-center text-center">
          <History className="h-12 w-12 text-primary" />
          <CardTitle className="font-headline text-2xl pt-2">Teacher Dashboard</CardTitle>
          <CardDescription>
            Review and approve student borrow requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold font-headline mb-4">Pending Requests</h3>
                <div className="border rounded-lg">
                    {pendingRequests.length > 0 ? (
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {pendingRequests.map((record) => (
                                <TableRow key={record.id}>
                                <TableCell className="font-medium">{record.studentName}</TableCell>
                                <TableCell>{record.itemName}</TableCell>
                                <TableCell>{record.date}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="secondary" size="sm" className="h-8" onClick={() => handleRequest(record.id, 'Approved')}>
                                        <Check className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                     <Button variant="destructive" size="sm" className="h-8" onClick={() => handleRequest(record.id, 'Denied')}>
                                        <X className="mr-2 h-4 w-4" /> Deny
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
                            <p>No pending requests.</p>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold font-headline mb-4">Request History</h3>
                 <div className="border rounded-lg max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader>
                        <TableRow className="sticky top-0 bg-card z-10">
                            <TableHead>Student</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {processedRequests.length > 0 ? processedRequests.map((record) => (
                            <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.studentName}</TableCell>
                            <TableCell>{record.itemName}</TableCell>
                            <TableCell>{record.date}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={getBadgeVariant(record.status)}>
                                {record.status}
                                </Badge>
                            </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                               <TableCell colSpan={4} className="h-24 text-center">
                                   No processed requests yet.
                               </TableCell>
                           </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
