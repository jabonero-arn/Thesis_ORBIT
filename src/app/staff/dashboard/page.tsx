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
import { User, PlusCircle, Edit, Trash, Package, PackageOpen, History as HistoryIcon } from "lucide-react"
import { currentUser, items as allItems, borrowHistory as allBorrowHistory } from "@/lib/data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { channels } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { InventoryItem } from "@/lib/types"

export default function StaffDashboardPage() {
    const { toast } = useToast()
    const [items, setItems] = React.useState(allItems);
    const [borrowHistory, setBorrowHistory] = React.useState(allBorrowHistory);
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const handleAddItem = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newItem: InventoryItem = {
            id: `item-${Date.now()}`,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: parseInt(formData.get("quantity") as string, 10),
            status: "Available",
            imageUrl: 'https://picsum.photos/seed/new-item/600/400',
            imageHint: 'new item'
        };

        setItems(prev => [...prev, newItem]);
        toast({ title: "Item Added", description: `${newItem.name} has been added to inventory.` });
        setIsFormOpen(false);
    }
    
    const handleDeleteItem = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
        toast({ variant: "destructive", title: "Item Removed", description: `Item has been removed from inventory.` });
    }

    const getItemChannelName = (channelId: string) => {
        return channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown";
    }

    const getStatusBadge = (status: InventoryItem['status']) => {
        switch(status) {
            case "Available": return <Badge variant="secondary">{status}</Badge>;
            case "Borrowed": return <Badge variant="destructive">{status}</Badge>;
            case "Locked": return <Badge variant="outline">{status}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    }

    const getHistoryStatusBadge = (status: 'Approved' | 'Pending' | 'Denied') => {
        switch (status) {
            case 'Approved': return 'secondary';
            case 'Denied': return 'destructive';
            case 'Pending': return 'outline';
            default: return 'default';
        }
    }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#1e2430]">
        <header className="flex items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <h1 className="font-headline text-xl font-bold">Staff Dashboard</h1>
            <UserNav role="Staff">
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
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="inventory"><Package className="mr-2"/>Inventory</TabsTrigger>
                    <TabsTrigger value="transactions"><PackageOpen className="mr-2"/>Transactions</TabsTrigger>
                    <TabsTrigger value="history"><HistoryIcon className="mr-2"/>History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inventory" className="mt-6">
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Manage Inventory</CardTitle>
                                <CardDescription>Add, edit, or remove items.</CardDescription>
                            </div>
                            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Inventory Item</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddItem} className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Item Name</Label>
                                            <Input id="name" name="name" required/>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea id="description" name="description" required/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="quantity">Quantity</Label>
                                                <Input id="quantity" name="quantity" type="number" defaultValue={1} required/>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="channelId">Lab/Channel</Label>
                                                <Select name="channelId" required>
                                                    <SelectTrigger><SelectValue placeholder="Select a lab" /></SelectTrigger>
                                                    <SelectContent>
                                                        {channels.map(channel => (
                                                            <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Add Item</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Lab</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash className="h-4 w-4"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="mt-6">
                     <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader>
                            <CardTitle>Current Transactions</CardTitle>
                            <CardDescription>Items that are currently borrowed or pending approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                    {borrowHistory.filter(h => h.status === "Pending" || items.find(i => i.name === h.itemName)?.status === 'Borrowed').map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>{record.itemName}</TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={getHistoryStatusBadge(record.status as 'Approved' | 'Pending' | 'Denied')}>{record.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                     <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader>
                            <CardTitle>Full Transaction History</CardTitle>
                            <CardDescription>A complete log of all borrow requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>{record.itemName}</TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell className="text-right">
                                                 <Badge variant={getHistoryStatusBadge(record.status as 'Approved' | 'Pending' | 'Denied')}>{record.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </main>
    </div>
  )
}
