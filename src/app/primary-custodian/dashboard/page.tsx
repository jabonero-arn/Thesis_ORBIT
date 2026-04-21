
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { addDoc, collection, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { 
    User, Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle, 
    Edit, Trash, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, ClipboardList, BookUser, Crown, Activity, Loader2, UserPlus, Building, AlertTriangle
} from "lucide-react"
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, Role, User as UserType, Department } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { CreateUserForm } from "@/components/admin/create-user-form"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { AddDepartmentForm } from "@/components/primary-custodian/add-department-form"
import { AddChannelForm } from "@/components/primary-custodian/add-channel-form"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const userRoles = [
    { id: 'all', name: 'All Users', icon: <Users /> },
    { id: 'Primary Custodian', name: 'Primary Custodian', icon: <Crown /> },
    { id: 'Supervisor', name: 'Supervisor', icon: <Shield /> },
    { id: 'Staff', name: 'Staff', icon: <ClipboardList /> },
    { id: 'Teacher', name: 'Teacher', icon: <BookUser /> },
    { id: 'Student', name: 'Student', icon: <User /> },
];

const getDeptIcon = (prefix: string) => {
    if (prefix.startsWith('comp')) return <Cpu />;
    if (prefix.startsWith('chem')) return <FlaskConical />;
    if (prefix.startsWith('robo')) return <Cog />;
    return <Building />;
}


type AdminView = 'dashboard' | 'inventory' | 'transactions' | 'history' | 'users';
type DashboardSubView = 'overall' | string; // string is department prefix
type InventorySubView = 'all' | 'inaccurate' | string; // string is department prefix
type TransactionSubView = 'borrowed';

export default function PrimaryCustodianDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, allUsers, departments, channels } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    React.useEffect(() => {
      if (!isUserLoading && !user) {
        router.push("/login?role=primary-custodian")
      }
    }, [user, isUserLoading, router])

    React.useEffect(() => {
        if (isUserLoading || isProfileLoading || !user) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    // View state
    const [activeView, setActiveView] = React.useState<AdminView>('dashboard');
    const [dashboardSubView, setDashboardSubView] = React.useState<DashboardSubView>('overall');
    const [inventorySubView, setInventorySubView] = React.useState<InventorySubView>('all');
    const [transactionSubView, setTransactionSubView] = React.useState<TransactionSubView>('borrowed');
    const [historySubView, setHistorySubView] = React.useState<DashboardSubView>('overall');
    const [usersSubView, setUsersSubView] = React.useState<'all' | 'Primary Custodian' | 'Supervisor' | 'Staff' | 'Teacher' | 'Student'>('all');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
    const [formDepartmentContext, setFormDepartmentContext] = React.useState<Department | null>(null);

    // Data Filtering
    const dashboardItems = React.useMemo(() => {
        if (dashboardSubView === 'overall') return items;
        const prefix = departments?.find(d => d.prefix === dashboardSubView)?.prefix;
        const deptId = departments?.find(d => d.prefix === dashboardSubView)?.id;
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return prefix ? items.filter(item => channelIds.includes(item.channelId)) : [];
    }, [items, dashboardSubView, departments, channels]);

    const dashboardHistory = React.useMemo(() => {
        if (dashboardSubView === 'overall') return borrowHistory;
        const itemNamesInDept = new Set(dashboardItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, dashboardItems, dashboardSubView]);

    const inventoryItemsToDisplay = React.useMemo(() => {
        if (inventorySubView === 'inaccurate') {
            return items.filter(item => item.status === 'Inaccurate');
        }
        if (inventorySubView === 'all') return items;
        const deptId = departments?.find(d => d.prefix === inventorySubView)?.id;
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return deptId ? items.filter(item => channelIds.includes(item.channelId)) : [];
    }, [items, inventorySubView, departments, channels]);

    const historyToDisplay = React.useMemo(() => {
        if (historySubView === 'overall') return borrowHistory;
        
        const deptId = departments?.find(d => d.prefix === historySubView)?.id;
        if (!deptId) return borrowHistory;

        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        const itemNamesInDept = new Set(items.filter(item => channelIds.includes(item.channelId)).map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, items, historySubView, departments, channels]);

    const usersToDisplay = React.useMemo(() => {
        if (usersSubView === 'all') return allUsers;
        return allUsers.filter(user => user.role === usersSubView);
    }, [usersSubView, allUsers]);

    const dialogChannels = React.useMemo(() => {
        if (!formDepartmentContext) return [];
        return channels.filter(c => c.departmentId === formDepartmentContext.id);
    }, [formDepartmentContext, channels]);


    // Handlers
    const handleViewChange = (view: AdminView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const quantity = parseInt(formData.get("quantity") as string, 10);
        
        const itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'verifiedAt'> = {
            name: name,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: quantity,
            status: editingItem 
                ? (formData.get("status") as InventoryItem['status']) 
                : 'Pending Receipt',
            imageUrl: formData.get("imageUrl") as string || `https://picsum.photos/seed/${name.replace(/\s/g, '-')}/600/400`,
            imageHint: name.toLowerCase().split(' ').slice(0, 2).join(' ')
        };
        
        if (editingItem && quantity === 0 && itemData.status !== 'Borrowed') {
            itemData.status = 'Borrowed';
        }

        try {
            if (editingItem) {
                const itemDocRef = doc(firestore, "inventory_items", editingItem.id);
                await updateDoc(itemDocRef, itemData as any);
                toast({ title: "Item Updated", description: `${itemData.name} has been updated.` });
            } else {
                const inventoryCollection = collection(firestore, "inventory_items");
                await addDoc(inventoryCollection, { ...itemData, createdAt: new Date().toISOString() });
                toast({ title: "Item Added", description: `${itemData.name} is now pending receipt by the facility supervisor.` });
            }
            closeForm();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not save the item." });
        }
    }
    
    const openEditForm = (item: InventoryItem) => {
        const itemChannel = channels.find(c => c.id === item.channelId);
        const itemDept = departments?.find(d => d.id === itemChannel?.departmentId);
        setFormDepartmentContext(itemDept || null);
        setEditingItem(item);
        setIsFormOpen(true);
    }

    const openAddForm = () => {
        const currentDept = departments?.find(d => d.prefix === inventorySubView);
        if (currentDept) {
            setFormDepartmentContext(currentDept);
            setEditingItem(null);
            setIsFormOpen(true);
        } else {
            toast({
                variant: "destructive",
                title: "No Department Selected",
                description: "Please select a department from the sidebar before adding an item."
            })
        }
    }

    const closeForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
        setFormDepartmentContext(null);
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }
        try {
            const itemDocRef = doc(firestore, "inventory_items", itemId);
            await deleteDoc(itemDocRef);
            toast({ variant: "destructive", title: "Item Removed", description: `Item has been removed from inventory.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the item.' });
        }
    }
    
    // Helper functions
    const getItemChannelName = (channelId: string) => channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown";
    const getStatusBadge = (status: InventoryItem['status']) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive" } as const;
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    }
    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants: Record<BorrowHistoryStatus, "secondary" | "destructive" | "outline" | "default"> = {
            'Pending': 'outline',
            'Approved': 'default',
            'Active': 'destructive',
            'Denied': 'destructive',
            'Returned': 'secondary',
            'Pending Return': 'secondary',
            'Cancelled': 'destructive',
            'Reserved': 'default',
        };

        const textMap: Partial<Record<BorrowHistoryStatus, string>> = {
            'Approved': 'Approved for Pickup',
            'Reserved': 'Reserved',
        };

        const text = textMap[status] || status;
        const variant = variants[status] || 'default';

        return <Badge variant={variant}>{text}</Badge>;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
        { id: 'users', label: 'Users', icon: <Users /> },
    ];
    
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
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the item.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </TableCell>
                    </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No items found.</TableCell></TableRow>}
            </TableBody>
        </Table>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                 const totalItemTypes = dashboardItems.length;
                 const totalStock = dashboardItems.reduce((sum, item) => sum + item.quantity, 0);
                 const borrowedItemsCount = dashboardHistory.filter(h => h.status === 'Active').length;
                 const reservedItemsCount = dashboardHistory.filter(h => h.status === 'Approved').length;
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Item Types</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalItemTypes}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle><PackageOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Items Borrowed</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{borrowedItemsCount}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Items Reserved</CardTitle><Hourglass className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reservedItemsCount}</div></CardContent></Card>
                        </div>
                     </div>
                );
             case 'inventory':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle>Manage Inventory</CardTitle><CardDescription>Add, edit, or remove items from all labs.</CardDescription></div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn(inventorySubView === 'all' && 'cursor-not-allowed')}>
                                            <Button onClick={openAddForm} disabled={inventorySubView === 'all' || inventorySubView === 'inaccurate'}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {(inventorySubView === 'all' || inventorySubView === 'inaccurate') && (
                                        <TooltipContent>
                                            <p>Please select a department to add an item to.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </CardHeader>
                            <CardContent>
                                <InventoryTable items={inventoryItemsToDisplay} />
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'transactions':
                const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardHeader><CardTitle>Currently Borrowed Items</CardTitle><CardDescription>Items that are currently checked out.</CardDescription></CardHeader>
                           <CardContent>
                               <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Borrowed</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                   <TableBody>
                                       {activeBorrows.length > 0 ? activeBorrows.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No items currently borrowed.</TableCell></TableRow>}
                                   </TableBody>
                               </Table>
                           </CardContent>
                        </Card>
                    </div>
                );
            case 'history':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader><CardTitle>Full Transaction History</CardTitle><CardDescription>A complete log of all borrow requests and their statuses.</CardDescription></CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{historyToDisplay.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                        </Card>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80">
                           <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>User Management</CardTitle>
                                    <CardDescription>Oversee all users in the system.</CardDescription>
                                </div>
                                {usersSubView !== 'all' && usersSubView !== 'Student' && (
                                    <Button onClick={() => setIsCreateUserOpen(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Create User
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow></TableHeader><TableBody>{usersToDisplay.map(u => (<TableRow key={u.id}><TableCell className="font-medium">{u.displayName}</TableCell><TableCell><Badge variant={(u.role === 'Supervisor' || u.role === 'Primary Custodian') ? 'default' : 'secondary'}>{u.role}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent>
                        </Card>
                    </div>
                );
            default: return null;
        }
    };
    
    const getHeaderContent = () => {
        const currentNavItem = navItems.find(item => item.id === activeView);
        return (
            <div className="flex items-center gap-2">
                {currentNavItem?.icon && <div className="text-muted-foreground">{currentNavItem.icon}</div>}
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{currentNavItem?.label}</h1>
            </div>
        )
    }

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Menu</div>
            <div className="p-2 space-y-1">
                {navItems.map(item => (
                  <Button key={item.id} variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleViewChange(item.id as AdminView)}>{item.icon} {item.label}</Button>
                ))}
            </div>
            {/* Submenus */}
            {activeView === 'dashboard' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setDashboardSubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                        {departments?.map(dept => (<li key={dept.id}><button onClick={() => {setDashboardSubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                    </ul>
                </div>
            )}
            {activeView === 'inventory' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">DEPARTMENTS</h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setInventorySubView('all'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Package className="h-5 w-5" />All Items</button></li>
                        {departments?.map(dept => (<li key={dept.id}><button onClick={() => {setInventorySubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                         <li><button onClick={() => {setInventorySubView('inaccurate'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'inaccurate' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><AlertTriangle className="h-5 w-5" />Inaccurate Items</button></li>
                    </ul>
                     <Button className="w-full mt-2" variant="outline" onClick={() => setIsAddDeptOpen(true)}>Add Department</Button>
                </div>
            )}
            {activeView === 'transactions' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">QUEUES</h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setTransactionSubView('borrowed'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                    </ul>
                </div>
            )}
            {activeView === 'history' && (
                 <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setHistorySubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${historySubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                        {departments?.map(dept => (<li key={dept.id}><button onClick={() => {setHistorySubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${historySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                    </ul>
                </div>
            )}
            {activeView === 'users' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">ROLES</h2>
                    <ul className="flex flex-col gap-1">
                        {userRoles.map(role => (<li key={role.id}><button onClick={() => {setUsersSubView(role.id as any); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${usersSubView === role.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{role.icon}{role.name}</button></li>))}
                    </ul>
                </div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
              <div className="flex items-center justify-between p-2">
                  <UserProfileModal role="Primary Custodian">
                      <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                              <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                              <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Primary Custodian"}</p>
                              <p className="text-xs text-muted-foreground">Primary Custodian</p>
                          </div>
                      </div>
                  </UserProfileModal>
                  <UserNav role="Primary Custodian" />
              </div>
          </div>
      </div>
    );
    
    if (isUserLoading || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#1e2430]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog
                open={showPasswordChangeDialog}
                onSuccess={() => setShowPasswordChangeDialog(false)}
            />
            <div className="flex h-screen bg-[#1e2430]">
                {/* Combined Sidebar */}
                <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        {/* Far Left Rail */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as AdminView)}>
                                                {item.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        {/* Contextual Sidebar */}
                        <div className="w-64 flex-col bg-[#141821] p-2">
                             {activeView === 'dashboard' && (
                                <>
                                 <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Dashboard View</div>
                                 <div className="py-4">
                                     <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                                     <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setDashboardSubView('overall')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                                         {departments?.map(dept => (<li key={dept.id}><button onClick={() => setDashboardSubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                                     </ul>
                                 </div>
                                </>
                             )}
                             {activeView === 'inventory' && (
                                <>
                                 <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Inventory Filter</div>
                                 <div className="py-4">
                                     <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">DEPARTMENTS</h2>
                                     <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setInventorySubView('all')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Package className="h-5 w-5" />All Items</button></li>
                                         {departments?.map(dept => (<li key={dept.id}><button onClick={() => setInventorySubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                                        <li><button onClick={() => setInventorySubView('inaccurate')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'inaccurate' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><AlertTriangle className="h-5 w-5" />Inaccurate Items</button></li>
                                     </ul>
                                     <Button className="w-full mt-4" variant="outline" onClick={() => setIsAddDeptOpen(true)}>Add Department</Button>
                                 </div>
                                </>
                             )}
                            {activeView === 'transactions' && (
                                <>
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Transactions</div>
                                <div className="py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">QUEUES</h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                    </ul>
                                </div>
                                </>
                            )}
                            {activeView === 'history' && (
                                <>
                                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50">History Filter</div>
                                    <div className="py-4">
                                        <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                                        <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setHistorySubView('overall')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${historySubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                                            {departments?.map(dept => (<li key={dept.id}><button onClick={() => setHistorySubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${historySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}
                                        </ul>
                                    </div>
                                </>
                            )}
                            {activeView === 'users' && (
                                <>
                                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50">User Filter</div>
                                    <div className="py-4">
                                        <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">ROLES</h2>
                                        <ul className="flex flex-col gap-1">
                                            {userRoles.map(role => (<li key={role.id}><button onClick={() => setUsersSubView(role.id as any)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${usersSubView === role.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{React.cloneElement(role.icon, {className: "h-5 w-5"})}{role.name}</button></li>))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]">
                         <div className="flex items-center justify-between p-2">
                             <UserProfileModal role="Primary Custodian">
                                 <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                     <Avatar className="h-8 w-8 flex-shrink-0">
                                         <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                         <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                                     </Avatar>
                                     <div className="overflow-hidden">
                                         <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Primary Custodian"}</p>
                                         <p className="text-xs text-muted-foreground">Primary Custodian</p>
                                     </div>
                                 </div>
                             </UserProfileModal>
                             <UserNav role="Primary Custodian" />
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
                    {renderContent()}
                </main>

                 <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Inventory Item"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label htmlFor="name">Item Name</Label><Input id="name" name="name" defaultValue={editingItem?.name} required/></div>
                            <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingItem?.description} required/></div>
                            <div className="grid gap-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required/></div>
                           
                            <div className="grid gap-2">
                                {formDepartmentContext && (
                                    <div className="mb-1">
                                        <Badge variant="outline" className="border-dashed">Department: {formDepartmentContext.name}</Badge>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="channelId">Specific Room</Label>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddChannelOpen(true)} disabled={!formDepartmentContext}>
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add Room
                                  </Button>
                                </div>
                                <Select name="channelId" defaultValue={editingItem?.channelId} required>
                                    <SelectTrigger id="channelId"><SelectValue placeholder="Select a room..." /></SelectTrigger>
                                    <SelectContent>{dialogChannels.map(c => (<SelectItem key={c.id} value={c.id}>{c.name.replace(/#/g, '')}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>

                             {editingItem && (
                               <div className="grid gap-2">
                                  <Label htmlFor="status">Status</Label>
                                  <Select name="status" defaultValue={editingItem.status} required>
                                      <SelectTrigger id="status"><SelectValue placeholder="Select a status" /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="Available">Available</SelectItem>
                                          <SelectItem value="Locked">Locked</SelectItem>
                                          <SelectItem value="Pending Receipt">Pending Receipt</SelectItem>
                                          <SelectItem value="Inaccurate">Inaccurate</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                             )}
                            <div className="grid gap-2"><Label htmlFor="imageUrl">Image URL</Label><Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} placeholder="https://..."/></div>
                            <DialogFooter><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <CreateUserForm 
                    open={isCreateUserOpen} 
                    onOpenChange={setIsCreateUserOpen} 
                    roleToCreate={usersSubView as Exclude<Role, "Student" | "Primary Custodian">}
                />
                
                <AddDepartmentForm open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen} />
                
                <AddChannelForm open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} department={formDepartmentContext} />

            </div>
        </TooltipProvider>
    )
}
