"use client"

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { History, Mail } from "lucide-react"
import { borrowHistory } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function TeacherDashboardPage() {
    
  const getBadgeVariant = (status: 'Approved' | 'Pending' | 'Denied') => {
    switch (status) {
      case 'Approved':
        return 'secondary'
      case 'Pending':
        return 'default'
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
            Review student borrow request history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle className="font-bold">New Approval Process</AlertTitle>
                <AlertDescription>
                    Approvals for locked items are now handled via email. You will receive an email with "Approve" and "Deny" buttons for each student request.
                </AlertDescription>
            </Alert>
          <div className="border rounded-lg">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {borrowHistory.map((record) => (
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
                ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
