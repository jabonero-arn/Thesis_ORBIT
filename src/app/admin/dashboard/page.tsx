"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { User, Package, Users, Hourglass } from "lucide-react"
import { currentUser, items as allItems, borrowHistory } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Mock user data for admin dashboard
const allUsers = [
    { id: 'user-1', name: 'Arnie Jabonero', role: 'Student' },
    { id: 'user-2', name: 'Alex Doe', role: 'Student' },
    { id: 'user-3', name: 'Jane Smith', role: 'Student' },
    { id: 'user-4', name: 'Teacher 1', role: 'Teacher' },
    { id: 'user-5', name: 'Staff 1', role: 'Staff' },
];

export default function AdminDashboardPage() {
  const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
  const borrowedItems = allItems.filter(item => item.status === 'Borrowed').length;
  const pendingRequests = borrowHistory.filter(req => req.status === 'Pending').length;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#1e2430]">
        <header className="flex items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
             <h1 className="font-headline text-xl font-bold">Admin Dashboard</h1>
            <UserNav role="Admin">
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>
                            <User />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </UserNav>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allUsers.length}</div>
                    </CardContent>
                </Card>
                 <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalItems}</div>
                    </CardContent>
                </Card>
                 <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items Currently Borrowed</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{borrowedItems}</div>
                    </CardContent>
                </Card>
                 <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingRequests}</div>
                    </CardContent>
                </Card>
            </div>

            {/* User Management and Inventory Overview */}
            <div className="grid gap-8 md:grid-cols-2">
                 <Card className="bg-card/80">
                    <CardHeader>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>Oversee all users in the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allUsers.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell><Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="bg-card/80">
                    <CardHeader>
                        <CardTitle>Inventory Overview</CardTitle>
                        <CardDescription>A high-level view of all inventory.</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allItems.map(item => (
                                     <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                             <Badge variant={item.status === "Borrowed" ? "destructive" : item.status === "Available" ? "secondary" : "outline"}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  )
}
