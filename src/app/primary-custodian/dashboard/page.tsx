
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { collection, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    User, Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle, 
    Edit, Trash, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, ClipboardList, BookUser, Crown, Activity, Loader2, UserPlus, Building, AlertTriangle, Check, X, ClipboardCheck, CheckSquare, FileText
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, Role, User as UserType, Department, ItemStatus, ActivityLog } from "@/lib/types"
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
import { EditUserRoleDialog } from "@/components/primary-custodian/edit-user-role-dialog"
import { ReturnConditionBadge } from "@/components/return-condition-badge"
import { Checkbox as UiCheckbox } from "@/components/ui/checkbox"
import { AssignMaterialsDialog } from "@/components/primary-custodian/assign-materials-dialog"
import { createActivityLog } from "@/lib/logging"

const userRoles = [
    { id: 'all', name: 'All Users', icon: <Users /> },
    { id: 'Property Custodian', name: 'Property Custodian', icon: <Building /> },
    { id: 'Head Supervisor', name: 'Head Supervisor', icon: <Crown /> },
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


type AdminView = 'dashboard' | 'inventory' | 'transactions' | 'activityLogs' | 'users' | 'verification';
type DashboardSubView = 'overall' | string; // string is department prefix
type InventorySubView = 'all' | 'inaccurate' | string; // string is department prefix
type TransactionSubView = 'borrowed' | 'logs';
type VerificationSubView = 'queue' | 'provisioning' | 'assign';
type ActivityLogSubView = 'approvals';


export default function HeadSupervisorDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, allUsers, departments, channels, activityLogs } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    React.useEffect(() => {
      if (isUserLoading) return;
      if (!user) {
        router.push("/login?role=head-supervisor");
      } else if (!user.emailVerified) {
        router.push("/verify-email");
      }
    }, [user, isUserLoading, router]);

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
    const [verificationSubView, setVerificationSubView] = React.useState<VerificationSubView>('queue');
    const [activityLogSubView, setActivityLogSubView] = React.useState<ActivityLogSubView>('approvals');
    const [usersSubView, setUsersSubView] = React.useState<'all' | Role>('all');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
    const [formStatus, setFormStatus] = React.useState<ItemStatus | "">("");
    const [formInaccuracyReason, setFormInaccuracyReason] = React.useState("");

    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
    const [formDepartmentContext, setFormDepartmentContext] = React.useState<Department | null>(null);
    const [isEditUserRoleOpen, setIsEditUserRoleOpen] = React.useState(false);
    const [userToEdit, setUserToEdit] = React.useState<UserType | null>(null);

    const [selectedToAssign, setSelectedToAssign] = React.useState<string[]>([]);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

    // Data Filtering
    const dashboardItems = React.useMemo(() => {
        if (dashboardSubView === 'overall') return items;
        const deptId = departments?.find(d => d.prefix === dashboardSubView)?.id;
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return deptId ? items.filter(item => item.channelId && channelIds.includes(item.channelId)) : [];
    }, [items, dashboardSubView, departments, channels]);

    const dashboardHistory = React.useMemo(() => {
        if (dashboardSubView === 'overall') return borrowHistory;
        const itemNamesInDept = new Set(dashboardItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, dashboardItems]);

    const inventoryItemsToDisplay = React.useMemo(() => {
        if (inventorySubView === 'inaccurate') {
            return items.filter(item => item.status === 'Inaccurate');
        }
        if (inventorySubView === 'all') return items;
        const deptId = departments?.find(d => d.prefix === inventorySubView)?.id;
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return deptId ? items.filter(item => item.channelId && channelIds.includes(item.channelId)) : [];
    }, [items, inventorySubView, departments, channels]);

    const approvalLogItems = React.useMemo(() => {
        return borrowHistory.filter(h => h.teacherId);
    }, [borrowHistory]);
    
    const usersToDisplay = React.useMemo(() => {
        if (usersSubView === 'all') return allUsers;
        return allUsers.filter(user => user.role === usersSubView);
    }, [usersSubView, allUsers]);

    const dialogChannels = React.useMemo(() => {
        if (!formDepartmentContext) return [];
        return channels.filter(c => c.departmentId === formDepartmentContext.id);
    }, [formDepartmentContext, channels]);
    
    const unassignedItems = React.useMemo(() => {
        return items.filter(item => !item.departmentId && item.status === 'Available');
    }, [items]);


    // Handlers
    const handleViewChange = (view: AdminView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }
    
    const handleEditUser = (user: UserType) => {
        setUserToEdit(user);
        setIsEditUserRoleOpen(true);
    }

    const handleDeleteUser = async (userToDelete: UserType) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        if (userToDelete.id === user?.uid) {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'You cannot delete your own account.' });
            return;
        }

        try {
            const batch = writeBatch(firestore);
            
            // 1. Delete from users collection
            batch.delete(doc(firestore, "users", userToDelete.id));

            // 2. Delete role flag
            let roleCollection = "";
            switch (userToDelete.role) {
                case "Supervisor": roleCollection = "roles_supervisor"; break;
                case "Head Supervisor": roleCollection = "roles_head_supervisor"; break;
                case "Property Custodian": roleCollection = "roles_property_custodian"; break;
                case "Staff": roleCollection = "roles_staff"; break;
                case "Teacher": roleCollection = "roles_teachers"; break;
            }
            
            if (roleCollection) {
                batch.delete(doc(firestore, roleCollection, userToDelete.id));
            }

            await batch.commit();

            createActivityLog(
                firestore,
                user?.uid || 'system',
                userProfile?.displayName || 'Admin',
                'Deleted User',
                `Deleted account for ${userToDelete.displayName} (${userToDelete.email})`,
                'User'
            );

            toast({ title: "User Deleted", description: `${userToDelete.displayName} has been removed from the system.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the user profile.' });
        }
    }

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        const formData = new FormData(event.currentTarget);
        
        const itemData: Partial<InventoryItem> = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: parseInt(formData.get("quantity") as string, 10),
            status: formStatus as InventoryItem['status'],
            imageUrl: formData.get("imageUrl") as string || `https://picsum.photos/seed/${(formData.get("name") as string).replace(/\s/g, '-')}/600/400`,
            imageHint: (formData.get("name") as string).toLowerCase().split(' ').slice(0, 2).join(' '),
        };

        if (formStatus === 'Inaccurate') {
            itemData.inaccuracyReason = formInaccuracyReason;
        } else {
            itemData.inaccuracyReason = ""; // Clear reason if not inaccurate
        }

        try {
            if (editingItem) {
                const itemDocRef = doc(firestore, "inventory_items", editingItem.id);
                await updateDoc(itemDocRef, { ...itemData, verifiedAt: new Date().toISOString() } as any);
                
                createActivityLog(
                    firestore,
                    user?.uid || 'system',
                    userProfile?.displayName || 'Admin',
                    'Updated Item',
                    `Updated details for item: ${itemData.name}`,
                    'Inventory'
                );

                toast({ title: "Item Updated", description: `${itemData.name} has been updated.` });
            }
            closeForm();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not save the item." });
        }
    }
    
    const openEditForm = (item: InventoryItem) => {
        const itemChannel = item.channelId ? channels.find(c => c.id === item.channelId) : undefined;
        const itemDept = itemChannel ? departments?.find(d => d.id === itemChannel.departmentId) : undefined;
        setFormDepartmentContext(itemDept || null);
        setEditingItem(item);
        setFormStatus(item.status);
        setFormInaccuracyReason(item.inaccuracyReason || "");
        setIsFormOpen(true);
    }

    const closeForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
        setFormDepartmentContext(null);
        setFormStatus("");
        setFormInaccuracyReason("");
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }
        try {
            const itemToDelete = items.find(i => i.id === itemId);
            const itemDocRef = doc(firestore, "inventory_items", itemId);
            await deleteDoc(itemDocRef);

            createActivityLog(
                firestore,
                user?.uid || 'system',
                userProfile?.displayName || 'Admin',
                'Deleted Item',
                `Removed item from inventory: ${itemToDelete?.name || itemId}`,
                'Inventory'
            );

            toast({ variant: "destructive", title: "Item Removed", description: `Item has been removed from inventory.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the item.' });
        }
    }
    
     const handleVerificationAction = async (itemId: string, newStatus: 'Available' | 'Inaccurate') => {
        if (!firestore) return;
        const itemDocRef = doc(firestore, "inventory_items", itemId);
        const item = items.find(i => i.id === itemId);
        try {
            const updatePayload: { status: 'Available' | 'Inaccurate'; verifiedAt: string; inaccuracyReason?: string } = {
                status: newStatus,
                verifiedAt: new Date().toISOString(),
            };

            if (newStatus === 'Inaccurate') {
                updatePayload.inaccuracyReason = "Flagged during initial verification.";
            }

            await updateDoc(itemDocRef, updatePayload);

            createActivityLog(
                firestore,
                user?.uid || 'system',
                userProfile?.displayName || 'Admin',
                newStatus === 'Available' ? 'Verified Item' : 'Flagged Inaccurate Item',
                `${newStatus === 'Available' ? 'Confirmed' : 'Flagged'} receipt of ${item?.name}`,
                'Inventory'
            );

            toast({
                title: `Item ${newStatus === 'Available' ? 'Confirmed' : 'Flagged'}`,
                description: `The item status has been updated.`,
            });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleToggleAllForAssignment = (checked: boolean) => {
        if (checked) {
            setSelectedToAssign(unassignedItems.map(item => item.id));
        } else {
            setSelectedToAssign([]);
        }
    };

    const handleToggleAssignment = (itemId: string, checked: boolean) => {
        setSelectedToAssign(prev => {
            if (checked) {
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    };

    const handleAssignItems = async (departmentId: string) => {
        if (!firestore || selectedToAssign.length === 0) return;
        
        const batch = writeBatch(firestore);
        const dept = departments.find(d => d.id === departmentId);

        selectedToAssign.forEach(itemId => {
            const itemDocRef = doc(firestore, "inventory_items", itemId);
            batch.update(itemDocRef, { departmentId });
        });

        try {
            await batch.commit();

            createActivityLog(
                firestore,
                user?.uid || 'system',
                userProfile?.displayName || 'Admin',
                'Assigned Materials',
                `Assigned ${selectedToAssign.length} items to ${dept?.name}`,
                'Inventory'
            );

            toast({
                title: "Items Assigned",
                description: `${selectedToAssign.length} item(s) have been assigned to the selected department.`
            });
            setSelectedToAssign([]);
            setIsAssignDialogOpen(false);
        } catch (error) {
            console.error("Error assigning items:", error);
            toast({ variant: "destructive", title: "Assignment Failed" });
        }
    };

    
    // Helper functions
    const getItemChannelName = (channelId?: string) => {
      if (!channelId) return "Unassigned";
      return channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown"
    };
    const getTeacherName = (teacherId: string) => allUsers.find(u => u.id === teacherId)?.displayName || "Unknown Teacher";
    
    const getStatusBadge = (item: InventoryItem) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive" } as const;
        const badge = <Badge variant={variants[item.status] || "default"}>{item.status}</Badge>;

        if (item.status === 'Inaccurate' && item.inaccuracyReason) {
            return (
                <Tooltip>
                    <TooltipTrigger>{badge}</TooltipTrigger>
                    <TooltipContent>
                        <p>{item.inaccuracyReason}</p>
                    </TooltipContent>
                </Tooltip>
            )
        }
        return badge;
    }

    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants: Record<BorrowHistoryStatus, "secondary" | "destructive" | "outline" | "default"> = {
            'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive',
            'Returned': 'secondary', 'Pending Return': 'secondary', 'Cancelled': 'destructive', 'Reserved': 'default',
        };
        const textMap: Partial<Record<BorrowHistoryStatus, string>> = { 'Approved': 'Approved for Borrowing', 'Reserved': 'Reserved' };
        const text = textMap[status] || status;
        const variant = variants[status] || 'default';

        return <Badge variant={variant}>{text}</Badge>;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
        { id: 'verification', label: 'Verification', icon: <ClipboardCheck /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'activityLogs', label: 'Activity Logs', icon: <HistoryIcon /> },
        { id: 'users', label: 'Users', icon: <Users /> },
    ];
    
    const InventoryTable = ({ items: tableItems }: { items: InventoryItem[] }) => (
        <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Lab</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
                {tableItems.length > 0 ? tableItems.map(item => {
                    const dateToShow = item.verifiedAt || item.createdAt;
                    return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{getItemChannelName(item.channelId)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell>{dateToShow ? format(new Date(dateToShow), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(item)}><Edit className="h-4 w-4"/></Button>
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the item.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </TableCell>
                    </TableRow>
                )}) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No items found.</TableCell></TableRow>}
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
                const selectedDeptForInventory = departments?.find(d => d.prefix === inventorySubView);
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Manage Inventory</CardTitle>
                                    <CardDescription>Edit or remove items from all labs.</CardDescription>
                                </div>
                                {inventorySubView !== 'all' && inventorySubView !== 'inaccurate' && departments && (
                                    <Button onClick={() => {
                                        if (selectedDeptForInventory) {
                                            setFormDepartmentContext(selectedDeptForInventory);
                                            setIsAddChannelOpen(true);
                                        }
                                    }}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Room
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent><InventoryTable items={inventoryItemsToDisplay} /></CardContent>
                        </Card>
                    </div>
                );
            case 'transactions':
                const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                        {transactionSubView === 'borrowed' && (
                            <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardHeader><CardTitle>Currently Borrowed Items</CardTitle><CardDescription>Items that are currently checked out.</CardDescription></CardHeader>
                               <CardContent>
                                   <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Borrowed</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                                       <TableBody>
                                           {activeBorrows.length > 0 ? activeBorrows.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No items currently borrowed.</TableCell></TableRow>}
                                       </TableBody>
                                   </Table>
                               </CardContent>
                            </Card>
                        )}
                         {transactionSubView === 'logs' && (
                            <Card className="bg-card/80">
                                <CardHeader>
                                    <CardTitle>Full History Logs</CardTitle>
                                    <CardDescription>A comprehensive audit trail of all platform activities.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Details</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-right">Timestamp</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activityLogs.length > 0 ? activityLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">{log.userName}</TableCell>
                                                    <TableCell>{log.action}</TableCell>
                                                    <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{log.category}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">No logs found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );
            case 'activityLogs':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80"><CardHeader><CardTitle>Teacher Approval Log</CardTitle><CardDescription>History of all student requests handled by teachers.</CardDescription></CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Teacher</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{approvalLogItems.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{getTeacherName(r.teacherId!)}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                        </Card>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80">
                           <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle>User Management</CardTitle><CardDescription>Oversee all users in the system.</CardDescription></div>
                                {usersSubView !== 'all' && usersSubView !== 'Student' && (
                                    <Button onClick={() => setIsCreateUserOpen(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Create User
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Name</TableHead>User Management