"use client"

import * as React from "react"
import { 
    Package, PackageOpen, History as HistoryIcon, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu, Hash, Hourglass,
    PlusCircle, Edit, Trash, QrCode, CornerDownLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { currentUser, channels, items as initialItems } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QrScannerView } from "@/components/qr-scanner-view"


const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

type StaffView = 'borrow' | 'inventory' | 'transactions' | 'history' | 'scanner';
type TransactionSubView = 'pickup' | 'borrowed';

export default function StaffDashboardPage() {
    const { toast } = useToast()
    const { items, setItems, borrowHistory, setBorrowHistory } = useAppContext();
    
    // View state
    const [activeView, setActiveView] = React.useState<StaffView>('scanner');
    const [transactionSubView, setTransactionSubView] = React.useState<TransactionSubView>('pickup');
    
    // Borrowing view states
    const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
    const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
        channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
    );
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    // Inventory view state
    const [inventorySelectedDeptId, setInventorySelectedDeptId] = React.useState('all');

    // Form state
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);

    // Handlers
    const handleDepartmentSelect = (deptId: string) => {
        setActiveView('borrow');
        setSelectedDepartmentId(deptId);
        const firstChannelInDept = channels.find(c => c.id.startsWith(departments.find(d=>d.id === deptId)?.prefix ?? ''));
        if (firstChannelInDept) {
            setSelectedChannelId(firstChannelInDept.id);
        }
        setIsMobileMenuOpen(false);
    }
    
    const handleChannelSelect = (id: string) => {
        setSelectedChannelId(id)
        setIsMobileMenuOpen(false) 
    }
    
    const handleViewChange = (view: StaffView) => {
        setActiveView(view);
         if (view === 'borrow' && activeView !== 'borrow') {
             const firstDept = departments[0];
             setSelectedDepartmentId(firstDept.id);
             const firstChannel = channels.find(c => c.id.startsWith(firstDept.prefix));
             if (firstChannel) {
                setSelectedChannelId(firstChannel.id);
             }
        }
        if (view === 'inventory' && activeView !== 'inventory') {
            setInventorySelectedDeptId('all');
        }
        setIsMobileMenuOpen(false);
    }
    
    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        if (newQuantity < 0) return;
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    }

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
            const updatedItem = { ...editingItem, ...itemData };
            setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
            toast({ title: "Item Updated", description: `${updatedItem.name} has been updated.` });
        } else {
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

        setItems(prevItems => prevItems.map(item => {
            if (item.name === historyRecord.itemName) {
                const newQuantity = item.quantity - 1;
                return {
                    ...item,
                    quantity: newQuantity,
                    status: newQuantity > 0 ? item.status : 'Borrowed'
                };
            }
            return item;
        }));

        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Active' } : h));
        toast({ title: "Pickup Confirmed", description: `${historyRecord.itemName} has been checked out.` });
    }
    
    const handleReturnItem = (historyId: string) => {
        const historyRecord = borrowHistory.find(h => h.id === historyId);
        if (!historyRecord) return;

        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Returned' } : h));
        
        setItems(prevItems => prevItems.map(item => {
            if (item.name === historyRecord.itemName) {
                const newQuantity = item.quantity + 1;
                const originalItem = initialItems.find(i => i.name === item.name);
                const newStatus = newQuantity > 0 && item.status === 'Borrowed' 
                    ? (originalItem?.status === 'Locked' ? 'Locked' : 'Available') 
                    : item.status;

                return {
                    ...item,
                    quantity: newQuantity,
                    status: newStatus
                };
            }
            return item;
        }));

        toast({ title: "Item Returned", description: `${historyRecord.itemName} has been returned.` });
    }
    
    // Data for views
    const filteredItems = React.useMemo(() => items.filter((item) => item.channelId === selectedChannelId), [items, selectedChannelId]);
    const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId]);
    const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId]);
    const inventoryItemsToDisplay = React.useMemo(() => {
        if (inventorySelectedDeptId === 'all') {
            return items;
        }
        const selectedDeptPrefix = departments.find(d => d.id === inventorySelectedDeptId)?.prefix;
        if (!selectedDeptPrefix) return [];
        return items.filter(item => item.channelId.startsWith(selectedDeptPrefix));
    }, [items, inventorySelectedDeptId]);


    // Helper functions
    const getItemChannelName = (channelId: string) => channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown";
    const getStatusBadge = (status: InventoryItem['status']) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline" } as const;
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    }
    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants = { 'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive', 'Returned': 'secondary', 'Pending Return': 'secondary' } as const;
        return <Badge variant={variants[status]}>{status}</Badge>;
    }
    
    const navItems = [
        { id: 'scanner', label: 'QR Scanner', icon: <QrCode /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
    ];
    
    const AwaitingPickupView = () => {
        const approvedRequests = borrowHistory.filter(h => h.status === 'Approved' && !h.startTime);
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader><CardTitle>Awaiting Pickup</CardTitle><CardDescription>Teacher-approved requests or immediate borrows ready for student pickup.</CardDescription></CardHeader>
                <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Approved</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {approvedRequests.length > 0 ? approvedRequests.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => handleProcessPickup(r.id)}><CheckCircle className="mr-2 h-4 w-4"/> Process Pickup</Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No requests awaiting pickup.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const CurrentlyBorrowedView = () => {
        const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader><CardTitle>Currently Borrowed Items</CardTitle><CardDescription>Items that are currently checked out.</CardDescription></CardHeader>
                <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Borrowed</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {activeBorrows.length > 0 ? activeBorrows.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right"><Button size="sm" variant="secondary" onClick={() => handleReturnItem(r.id)}><PackageCheck className="mr-2 h-4 w-4"/> Mark as Returned</Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No items currently borrowed.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const InventoryTable = ({ items: tableItems }: { items: InventoryItem[] }) => (
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
                {tableItems.length > 0 ? tableItems.map(item => (
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
                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the item.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No items found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const renderContent = () => {
        const recentlyReturned = borrowHistory.filter(h => h.status === 'Returned').slice(0, 5);
        switch (activeView) {
            case 'borrow':
                return (
                    <InventoryGrid 
                        items={filteredItems} 
                        onItemSelect={() => {}} 
                        selectedItems={[]} 
                        isSelectionEnabled={false}
                        isManagementView={true}
                        onQuantityChange={handleQuantityChange}
                    />
                );
             case 'inventory':
                return (
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Manage Inventory</CardTitle><CardDescription>Add, edit, or remove items from all labs.</CardDescription></div>
                            <Button onClick={openAddForm}><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
                        </CardHeader>
                        <CardContent>
                           <InventoryTable items={inventoryItemsToDisplay} />
                        </CardContent>
                    </Card>
                );
            case 'transactions':
                return (
                     <div className="space-y-6">
                        {transactionSubView === 'pickup' ? <AwaitingPickupView /> : <CurrentlyBorrowedView />}
                         <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>A feed of the latest return transactions.</CardDescription></CardHeader>
                            <CardContent>
                                {recentlyReturned.length > 0 ? (
                                    <ul className="space-y-2">
                                        {recentlyReturned.map(r => (
                                            <li key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                               <CornerDownLeft className="h-4 w-4 text-green-500" />
                                               <span><span className="font-semibold text-foreground">{r.studentName}</span> returned <span className="font-semibold text-foreground">{r.itemName}</span>.</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-muted-foreground text-center p-4">No recent returns.</p>}
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'history':
                return (
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader><CardTitle>Full Transaction History</CardTitle><CardDescription>A complete log of all borrow requests and their statuses.</CardDescription></CardHeader>
                        <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{borrowHistory.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                    </Card>
                );
            case 'scanner':
                return <QrScannerView onReturn={handleReturnItem}/>;
            default: return null;
        }
    };
    
    const getHeaderContent = () => {
        if (activeView === 'borrow') {
            return (
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
                </div>
            );
        }
        if (activeView === 'transactions') {
            const label = transactionSubView === 'pickup' ? "Awaiting Pickup" : "Currently Borrowed";
            const icon = transactionSubView === 'pickup' ? <Hourglass /> : <PackageCheck />;
            return (
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{icon}</div>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{label}</h1>
                </div>
            );
        }
        const currentNavItem = navItems.find(item => item.id === activeView);
        if (currentNavItem) {
             return (
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{currentNavItem.icon}</div>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{currentNavItem.label}</h1>
                </div>
            );
        }
        return null;
    }

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Departments</div>
             <div className="p-2 space-y-1">
                {departments.map(dept => ( <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>{dept.icon} {dept.name}</Button>))}
            </div>

            {activeView === 'borrow' && (
                <AppSidebar departmentPrefix={selectedDepartment?.prefix ?? ''} selectedChannelId={selectedChannelId} onChannelSelect={handleChannelSelect} />
            )}

            <Separator />
            
            <div className="p-4 font-headline text-lg font-bold border-b border-t border-border/50">
                Management
            </div>
            <div className="p-2 space-y-1">
                {navItems.map(item => (
                     <Button key={item.id} variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { handleViewChange(item.id as StaffView); }}>
                        {item.icon} {item.label}
                    </Button>
                ))}
            </div>
            {activeView === 'inventory' && (
                <div className="pl-6 py-2">
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => { setInventorySelectedDeptId('all'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySelectedDeptId === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>All Items</button></li>
                        {departments.map(dept => (
                            <li key={dept.id}><button onClick={() => { setInventorySelectedDeptId(dept.id); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySelectedDeptId === dept.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{dept.icon}{dept.name}</button></li>
                        ))}
                    </ul>
                </div>
            )}
            {activeView === 'transactions' && (
                 <div className="pl-6">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        QUEUES
                    </h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => setTransactionSubView('pickup')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'pickup' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Awaiting Pickup</button></li>
                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                    </ul>
                </div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
            <div className="flex items-center justify-between p-2">
                 <UserProfileModal role="Staff">
                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                          <p className="text-xs text-muted-foreground">Staff</p>
                        </div>
                    </div>
                  </UserProfileModal>
                <UserNav role="Staff" />
              </div>
          </div>
      </div>
    );

    return (
        <TooltipProvider>
            <div className="flex h-screen bg-[#1e2430]">
                 {/* Combined Sidebar */}
                 <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        {/* Far Left Rail */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">
                                {departments.map(dept => (
                                    <Tooltip key={dept.id}>
                                        <TooltipTrigger asChild>
                                            <Button variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleDepartmentSelect(dept.id)}>
                                                {dept.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{dept.name}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                            <Separator className="my-2 bg-border/50 w-8" />
                            <div className="flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as StaffView)}>
                                                {item.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        {/* Contextual Sidebar */}
                        {(activeView === 'borrow') && (
                            <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{selectedDepartment?.name}</div>
                                <AppSidebar departmentPrefix={selectedDepartment?.prefix ?? ''} selectedChannelId={selectedChannelId} onChannelSelect={handleChannelSelect} />
                            </div>
                        )}
                        {activeView === 'transactions' && (
                            <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Transactions</div>
                                 <div className="flex-1 py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        QUEUES
                                    </h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setTransactionSubView('pickup')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'pickup' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Awaiting Pickup</button></li>
                                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                    </ul>
                                </div>
                            </div>
                        )}
                        {activeView === 'inventory' && (
                             <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                                    Inventory
                                </div>
                                <div className="flex-1 py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        DEPARTMENTS
                                    </h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setInventorySelectedDeptId('all')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySelectedDeptId === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Package className="h-5 w-5" /> All Items</button></li>
                                        {departments.map(dept => (
                                            <li key={dept.id}>
                                                <button onClick={() => setInventorySelectedDeptId(dept.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySelectedDeptId === dept.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                    {React.cloneElement(dept.icon, { className: 'h-5 w-5' })}
                                                    {dept.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        {(activeView === 'history' || activeView === 'scanner') && (
                             <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                                    {activeView === 'history' ? 'History' : 'Scanner'}
                                </div>
                                <div className="flex-1 py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        ACTIONS
                                    </h2>
                                    <ul className="flex flex-col gap-1">
                                        <li>
                                          <button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white`}>
                                            {activeView === 'history' ? <HistoryIcon className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
                                            {activeView === 'history' ? 'Full History' : 'Scan Code'}
                                          </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]">
                      <div className="flex items-center justify-between p-2">
                            <UserProfileModal role="Staff">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                      <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="overflow-hidden">
                                    <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                                    <p className="text-xs text-muted-foreground">Staff</p>
                                  </div>
                                </div>
                              </UserProfileModal>
                          <UserNav role="Staff" />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-screen">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">{mobileSidebarContent}</SheetContent></Sheet>
                            {getHeaderContent()}
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {renderContent()}
                    </div>
                </main>

                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Inventory Item"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label htmlFor="name">Item Name</Label><Input id="name" name="name" defaultValue={editingItem?.name} required/></div>
                            <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingItem?.description} required/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required/></div>
                                <div className="grid gap-2"><Label htmlFor="channelId">Lab/Channel</Label><Select name="channelId" defaultValue={editingItem?.channelId} required><SelectTrigger><SelectValue placeholder="Select a lab" /></SelectTrigger><SelectContent>{channels.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                            </div>
                            <div className="grid gap-2"><Label htmlFor="imageUrl">Image URL</Label><Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} placeholder="https://..."/></div>
                            <DialogFooter><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
