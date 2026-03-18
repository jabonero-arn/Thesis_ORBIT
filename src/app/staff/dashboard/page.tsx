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
import { User, PlusCircle, Edit, Trash, Package, PackageOpen, History as HistoryIcon, CheckCircle, PackageCheck } from "lucide-react"
import { currentUser, items as initialItems, borrowHistory as initialBorrowHistory } from "@/lib/data"
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { channels } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus } from "@/lib/types"

export default function StaffDashboardPage() {
    const { toast } = useToast()
    const [items, setItems] = React.useState<InventoryItem[]>(initialItems);
    const [borrowHistory, setBorrowHistory] = React.useState<BorrowHistory[]>(initialBorrowHistory);

    // State for the Add/Edit item form
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const itemData = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: parseInt(formData.get("quantity") as string, 10),
            imageUrl: formData.get("imageUrl") as string || 'https://picsum.photos/seed/new-item/600/400',
            imageHint: 'new item'
        };

        if (editingItem) {
            // Update existing item
            const updatedItem = { ...editingItem, ...itemData };
            setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
            toast({ title: "Item Updated", description: `${updatedItem.name} has been updated.` });
        } else {
            // Add new item
            const newItem: InventoryItem = {
                id: `item-${Date.now()}`,
                status: "Available",
                ...itemData
            };
            setItems(prev => [...prev, newItem]);
            toast({ title: "Item Added", description: `${newItem.name} has been added to inventory.` });
        }

        closeForm();
    }
    
    const openEditForm = (item: InventoryItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    }

    const openAddForm = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    }

    const closeForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
    }

    const handleDeleteItem = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
        toast({ variant: "destructive", title: "Item Removed", description: `Item has been removed from inventory.` });
    }

    const handleProcessPickup = (historyId: string) => {
        const historyRecord = borrowHistory.find(h => h.id === historyId);
        if (!historyRecord) return;
        
        // Update history status
        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Active' } : h));
        
        // Update item status
        setItems(prev => prev.map(i => i.name === historyRecord.itemName ? { ...i, status: 'Borrowed' } : i));

        toast({
            title: "Pickup Confirmed",
            description: `${historyRecord.itemName} has been checked out to ${historyRecord.studentName}. This simulates a successful QR code scan.`
        })
    }
    
    const handleReturnItem = (historyId: string) => {
        const historyRecord = borrowHistory.find(h => h.id === historyId);
        if (!historyRecord) return;

        // Update history status
        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Returned' } : h));
        
        // Update item status
        setItems(prev => prev.map(i => i.name === historyRecord.itemName ? { ...i, status: 'Available' } : i));

        toast({
            title: "Item Returned",
            description: `${historyRecord.itemName} has been returned.`
        })
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
    
    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
         const variants: { [key in BorrowHistoryStatus]: "secondary" | "destructive" | "outline" | "default" } = {
            'Pending': 'outline',
            'Approved': 'default',
            'Active': 'destructive',
            'Denied': 'destructive',
            'Returned': 'secondary'
        }
        return <Badge variant={variants[status]}>{status}</Badge>;
    }
    
    const approvedRequests = borrowHistory.filter(h => h.status === 'Approved');
    const activeBorrows = borrowHistory.filter(h => h.status === 'Active');


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
                    <TabsTrigger value="inventory"><Package className="mr-2"/>Inventory Management</TabsTrigger>
                    <TabsTrigger value="transactions"><PackageOpen className="mr-2"/>Process Transactions</TabsTrigger>
                    <TabsTrigger value="history"><HistoryIcon className="mr-2"/>Full History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inventory" className="mt-6">
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Manage Inventory</CardTitle>
                                <CardDescription>Add, edit, or remove items from all labs.</CardDescription>
                            </div>
                            <Button onClick={openAddForm}><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Lab</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="hidden md:table-cell">{getItemChannelName(item.channelId)}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(item)}><Edit className="h-4 w-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the item.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continue</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="mt-6 space-y-6">
                     <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader>
                            <CardTitle>Awaiting Pickup</CardTitle>
                            <CardDescription>Teacher-approved requests ready for student pickup.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Approved</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedRequests.length > 0 ? approvedRequests.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>{record.itemName}</TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleProcessPickup(record.id)}><CheckCircle className="mr-2 h-4 w-4"/> Process Pickup</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No requests awaiting pickup.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                     <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader>
                            <CardTitle>Currently Borrowed Items</CardTitle>
                            <CardDescription>Items that are currently checked out by students.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Borrowed</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeBorrows.length > 0 ? activeBorrows.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>{record.itemName}</TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="secondary" onClick={() => handleReturnItem(record.id)}><PackageCheck className="mr-2 h-4 w-4"/> Mark as Returned</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No items are currently borrowed.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                     <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader>
                            <CardTitle>Full Transaction History</CardTitle>
                            <CardDescription>A complete log of all borrow requests and their statuses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {borrowHistory.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.studentName}</TableCell>
                                            <TableCell>{record.itemName}</TableCell>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell className="text-right">{getHistoryStatusBadge(record.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </main>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Item" : "Add New Inventory Item"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" name="name" defaultValue={editingItem?.name} required/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={editingItem?.description} required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="channelId">Lab/Channel</Label>
                            <Select name="channelId" defaultValue={editingItem?.channelId} required>
                                <SelectTrigger><SelectValue placeholder="Select a lab" /></SelectTrigger>
                                <SelectContent>
                                    {channels.map(channel => (
                                        <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} placeholder="https://..."/>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                        <Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  )
}
