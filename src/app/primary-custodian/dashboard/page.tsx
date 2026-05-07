
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { collection, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    User, Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle, 
    Edit, Trash, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, ClipboardList, BookUser, Crown, Activity, Loader2, UserPlus, Building, AlertTriangle, Check, X, ClipboardCheck, CheckSquare, FileText, Search, RotateCcw
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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
type DashboardSubView = 'overall' | string;
type InventorySubView = 'all' | 'inaccurate' | string;
type TransactionSubView = 'borrowed' | 'logs';

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

    const [activeView, setActiveView] = React.useState<AdminView>('dashboard');
    const [dashboardSubView, setDashboardSubView] = React.useState<DashboardSubView>('overall');
    const [inventorySubView, setInventorySubView] = React.useState<InventorySubView>('all');
    const [transactionSubView, setTransactionSubView] = React.useState<TransactionSubView>('borrowed');
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

    // Rejection Dialog State
    const [rejectItem, setRejectItem] = React.useState<InventoryItem | null>(null);
    const [rejectReasonType, setRejectReasonType] = React.useState<'damaged' | 'not-functioning' | ''>('');
    const [rejectDescription, setRejectDescription] = React.useState('');

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
        return allUsers.filter(u => u.role === usersSubView);
    }, [usersSubView, allUsers]);

    const dialogChannels = React.useMemo(() => {
        if (!formDepartmentContext) return [];
        return channels.filter(c => c.departmentId === formDepartmentContext.id);
    }, [formDepartmentContext, channels]);
    
    const unassignedItems = React.useMemo(() => {
        return items.filter(item => !item.departmentId && item.status === 'Available');
    }, [items]);

    const handleDeleteUser = async (userToDelete: UserType) => {
        if (!firestore) return;
        if (userToDelete.id === user?.uid) {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'You cannot delete your own account.' });
            return;
        }

        try {
            const batch = writeBatch(firestore);
            batch.delete(doc(firestore, "users", userToDelete.id));
            let roleCollection = "";
            switch (userToDelete.role) {
                case "Supervisor": roleCollection = "roles_supervisor"; break;
                case "Head Supervisor": roleCollection = "roles_head_supervisor"; break;
                case "Property Custodian": roleCollection = "roles_property_custodian"; break;
                case "Staff": roleCollection = "roles_staff"; break;
                case "Teacher": roleCollection = "roles_teachers"; break;
            }
            if (roleCollection) batch.delete(doc(firestore, roleCollection, userToDelete.id));
            await batch.commit();

            createActivityLog(
                firestore,
                user?.uid || 'system',
                userProfile?.displayName || 'Admin',
                'Deleted User',
                `Deleted account for ${userToDelete.displayName} (${userToDelete.role})`,
                'User'
            );

            toast({ title: "User Deleted", description: `${userToDelete.displayName} has been removed.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user.' });
        }
    }

    const handleDeleteDepartment = async (id: string, name: string, prefix: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, "departments", id));
            
            createActivityLog(
                firestore,
                user?.uid || 'sys',
                userProfile?.displayName || 'Admin',
                'Deleted Department',
                `Deleted department: ${name} (${prefix})`,
                'Management'
            );

            if (dashboardSubView === prefix) {
                setDashboardSubView('overall');
            }
            
            toast({ title: "Department Deleted" });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete department." });
        }
    }

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !editingItem) return;
        const formData = new FormData(event.currentTarget);
        const itemData: Partial<InventoryItem> = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: parseInt(formData.get("quantity") as string, 10),
            status: formStatus as InventoryItem['status'],
        };

        try {
            const itemDocRef = doc(firestore, "inventory_items", editingItem.id);
            await updateDoc(itemDocRef, { ...itemData, verifiedAt: new Date().toISOString() } as any);
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Admin', 'Updated Item', `Updated details for: ${itemData.name}`, 'Inventory');
            toast({ title: "Item Updated" });
            closeForm();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error" });
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
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        try {
            const itemToDelete = items.find(i => i.id === itemId);
            await deleteDoc(doc(firestore, "inventory_items", itemId));
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Admin', 'Deleted Item', `Removed item: ${itemToDelete?.name}`, 'Inventory');
            toast({ variant: "destructive", title: "Item Removed" });
        } catch (e) {
            console.error(e);
        }
    }

    const handleReturnToCustodian = async (item: InventoryItem) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, "inventory_items", item.id), { status: 'Returning' });
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Admin', 'Returned to Custodian', `Flagged ${item.name} for return to Property Custodian`, 'Inventory');
            toast({ title: "Item Flagged", description: `${item.name} is now pending return confirmation from the Materials Custodian.` });
        } catch (error) {
            console.error(error);
        }
    };
    
    const handleVerificationAction = async (itemId: string, newStatus: 'Available' | 'Inaccurate', details?: string) => {
        if (!firestore) return;
        const item = items.find(i => i.id === itemId);
        try {
            const updatePayload: any = { 
                status: newStatus, 
                verifiedAt: new Date().toISOString() 
            };
            if (details) {
                updatePayload.inaccuracyReason = details;
            }

            await updateDoc(doc(firestore, "inventory_items", itemId), updatePayload);
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Admin', newStatus === 'Available' ? 'Verified Item' : 'Flagged Inaccurate', `Processed receipt of ${item?.name}${details ? ` (Reason: ${details})` : ''}`, 'Inventory');
            toast({ title: `Item ${newStatus === 'Available' ? 'Confirmed' : 'Flagged'}` });
        } catch (e) {
            console.error(e);
        }
    };

    const handleRejectSubmit = () => {
        if (!rejectItem || !rejectReasonType || !rejectDescription.trim()) {
            toast({ variant: 'destructive', title: 'Missing details', description: 'Please select a reason and provide a description.' });
            return;
        }

        const reasonText = rejectReasonType === 'damaged' ? 'Damaged' : 'Not Functioning';
        const fullDetails = `${reasonText}: ${rejectDescription}`;
        
        handleVerificationAction(rejectItem.id, 'Inaccurate', fullDetails);
        setRejectItem(null);
        setRejectReasonType('');
        setRejectDescription('');
    };

    const handleAssignItems = async (departmentId: string) => {
        if (!firestore || selectedToAssign.length === 0) return;
        const batch = writeBatch(firestore);
        const dept = departments.find(d => d.id === departmentId);
        selectedToAssign.forEach(id => batch.update(doc(firestore, "inventory_items", id), { departmentId }));

        try {
            await batch.commit();
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Admin', 'Assigned Materials', `Assigned ${selectedToAssign.length} items to ${dept?.name}`, 'Inventory');
            toast({ title: "Items Assigned" });
            setSelectedToAssign([]);
            setIsAssignDialogOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const getItemChannelName = (channelId?: string) => {
      if (!channelId) return "Unassigned";
      return channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown"
    };
    
    const getStatusBadge = (item: InventoryItem) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive", "Returning": "outline" } as const;
        return <Badge variant={variants[item.status] || "default"}>{item.status}</Badge>;
    }

    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants: Record<BorrowHistoryStatus, "secondary" | "destructive" | "outline" | "default"> = {
            'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive',
            'Returned': 'secondary', 'Pending Return': 'secondary', 'Cancelled': 'destructive', 'Reserved': 'default',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
        { id: 'verification', label: 'Verification', icon: <ClipboardCheck /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'activityLogs', label: 'Teacher Approvals', icon: <HistoryIcon /> },
        { id: 'users', label: 'User Management', icon: <Users /> },
    ];
    
    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                 const totalItemTypes = dashboardItems.length;
                 const totalStock = dashboardItems.reduce((sum, item) => sum + item.quantity, 0);
                 const borrowedCount = dashboardHistory.filter(h => h.status === 'Active').length;
                 const reservedCount = dashboardHistory.filter(h => h.status === 'Reserved').length;
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Items</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalItemTypes}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Stock</CardTitle><PackageOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Borrowed</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{borrowedCount}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Reserved</CardTitle><Hourglass className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reservedCount}</div></CardContent></Card>
                        </div>
                     </div>
                );
             case 'inventory':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle>Manage Inventory</CardTitle><CardDescription>Edit or remove items from all labs.</CardDescription></div>
                                {inventorySubView !== 'all' && inventorySubView !== 'inaccurate' && (
                                    <Button onClick={() => {
                                        const dept = departments.find(d => d.prefix === inventorySubView);
                                        if (dept) { setFormDepartmentContext(dept); setIsAddChannelOpen(true); }
                                    }}><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                                )}
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead className="whitespace-nowrap">Name</TableHead><TableHead className="whitespace-nowrap">Lab</TableHead><TableHead className="whitespace-nowrap">Qty</TableHead><TableHead className="whitespace-nowrap">Status</TableHead><TableHead className="text-right whitespace-nowrap">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>{inventoryItemsToDisplay.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getItemChannelName(item.channelId)}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getStatusBadge(item)}</TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => handleReturnToCustodian(item)} disabled={item.status === 'Returning'}>
                                                                <RotateCcw className="h-4 w-4"/>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Return to Custodian</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(item)}><Edit className="h-4 w-4"/></Button>
                                                <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'transactions':
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                        {transactionSubView === 'borrowed' ? (
                            <Card className="bg-card/80"><CardHeader><CardTitle>Active Borrows</CardTitle></CardHeader>
                               <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">Student</TableHead><TableHead className="whitespace-nowrap">Item</TableHead><TableHead className="whitespace-nowrap">Date</TableHead></TableRow></TableHeader>
                                       <TableBody>{borrowHistory.filter(h => h.status === 'Active').map(r => (<TableRow key={r.id}><TableCell className="whitespace-nowrap">{r.studentName}</TableCell><TableCell className="whitespace-nowrap">{r.itemName}</TableCell><TableCell className="whitespace-nowrap">{format(new Date(r.date), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
                                   </Table></CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-card/80"><CardHeader><CardTitle>Platform Audit Logs</CardTitle></CardHeader>
                                <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">User</TableHead><TableHead className="whitespace-nowrap">Action</TableHead><TableHead className="whitespace-nowrap">Details</TableHead><TableHead className="text-right whitespace-nowrap">Timestamp</TableHead></TableRow></TableHeader>
                                    <TableBody>{activityLogs.map(log => (<TableRow key={log.id}><TableCell className="whitespace-nowrap">{log.userName}</TableCell><TableCell><Badge variant="outline" className="whitespace-nowrap">{log.action}</Badge></TableCell><TableCell className="max-w-md min-w-[200px] whitespace-nowrap">{log.details}</TableCell><TableCell className="text-right text-xs opacity-70 whitespace-nowrap">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</TableCell></TableRow>))}</TableBody>
                                </Table></CardContent>
                            </Card>
                        )}
                    </div>
                );
            case 'activityLogs':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80"><CardHeader><CardTitle>Teacher Approvals</CardTitle></CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">Student</TableHead><TableHead className="whitespace-nowrap">Item</TableHead><TableHead className="whitespace-nowrap">Teacher</TableHead><TableHead className="text-right whitespace-nowrap">Status</TableHead></TableRow></TableHeader>
                                <TableBody>{approvalLogItems.map(r => (<TableRow key={r.id}><TableCell className="whitespace-nowrap">{r.studentName}</TableCell><TableCell className="whitespace-nowrap">{r.itemName}</TableCell><TableCell className="whitespace-nowrap">{allUsers.find(u=>u.id===r.teacherId)?.displayName || 'N/A'}</TableCell><TableCell className="text-right whitespace-nowrap">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody>
                            </Table></CardContent>
                        </Card>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Platform Users</CardTitle></div>
                                {usersSubView !== 'all' && usersSubView !== 'Student' && (
                                    <Button onClick={() => setIsCreateUserOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Create User</Button>
                                )}
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">Name</TableHead><TableHead className="whitespace-nowrap">Email</TableHead><TableHead className="whitespace-nowrap">Role</TableHead><TableHead className="text-right whitespace-nowrap">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{usersToDisplay.map(u => (<TableRow key={u.id}><TableCell className="whitespace-nowrap">{u.displayName}</TableCell><TableCell className="whitespace-nowrap">{u.email}</TableCell><TableCell><Badge variant="secondary" className="whitespace-nowrap">{u.role}</Badge></TableCell>
                                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                                        <Button variant="ghost" size="icon" onClick={() => { setUserToEdit(u); setIsEditUserRoleOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger>
                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Account?</AlertDialogTitle><AlertDialogDescription>Delete {u.displayName}'s account.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(u)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </TableCell></TableRow>))}</TableBody>
                            </Table></CardContent></Card>
                    </div>
                );
            case 'verification':
                 const pending = items.filter(i => i.status === 'Pending Receipt');
                 return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                        <Card className="bg-card/80"><CardHeader><CardTitle>Material Provisioning Queue</CardTitle></CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">Item</TableHead><TableHead className="whitespace-nowrap">Qty</TableHead><TableHead className="text-right whitespace-nowrap">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{pending.map(i => (<TableRow key={i.id}><TableCell className="whitespace-nowrap">{i.name}</TableCell><TableCell>{i.quantity}</TableCell><TableCell className="text-right space-x-2 whitespace-nowrap">
                                    <Button size="sm" onClick={() => handleVerificationAction(i.id, 'Available')}>Confirm</Button>
                                    <Button size="sm" variant="destructive" onClick={() => setRejectItem(i)}>Reject</Button>
                                </TableCell></TableRow>))}</TableBody>
                            </Table></CardContent>
                        </Card>
                         <Card className="bg-card/80"><CardHeader className="flex justify-between items-center flex-row"><div><CardTitle>Assign Materials to Dept</CardTitle></div><Button disabled={!selectedToAssign.length} onClick={()=>setIsAssignDialogOpen(true)}>Assign ({selectedToAssign.length})</Button></CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto"><Table><TableHeader><TableRow><TableHead className="w-12 whitespace-nowrap"><UiCheckbox onCheckedChange={checked => checked ? setSelectedToAssign(unassignedItems.map(i=>i.id)) : setSelectedToAssign([])}/></TableHead><TableHead className="whitespace-nowrap">Item</TableHead><TableHead className="whitespace-nowrap">Qty</TableHead></TableRow></TableHeader>
                                <TableBody>{unassignedItems.map(i => (<TableRow key={i.id}><TableCell><UiCheckbox checked={selectedToAssign.includes(i.id)} onCheckedChange={c => c ? setSelectedToAssign(p=>[...p, i.id]) : setSelectedToAssign(p=>p.filter(id=>id!==i.id))}/></TableCell><TableCell className="whitespace-nowrap">{i.name}</TableCell><TableCell>{i.quantity}</TableCell></TableRow>))}</TableBody>
                            </Table></CardContent></Card>
                    </div>
                 )
            default: return null;
        }
    };

    if (isUserLoading || isProfileLoading || !user) return <div className="flex h-dvh items-center justify-center bg-[#1e2430]"><Loader2 className="animate-spin" /></div>;

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
                <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col gap-2">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}><TooltipTrigger asChild><Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveView(item.id as AdminView)}>{item.icon}</Button></TooltipTrigger><TooltipContent side="right"><p>{item.label}</p></TooltipContent></Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="w-64 bg-[#141821] p-2 overflow-y-auto">
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50 uppercase tracking-tighter">System Console</div>
                            <div className="py-4 space-y-4">
                                {activeView === 'dashboard' && (<div><h2 className="px-2 text-xs font-bold text-muted-foreground uppercase mb-2">Scope</h2><ul className="space-y-1"><li><Button variant={dashboardSubView === 'overall' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setDashboardSubView('overall')}><LayoutGrid className="mr-2 h-4 w-4"/>Overall</Button></li>{departments.map(d=>(<li key={d.id} className="group relative"><Button variant={dashboardSubView === d.prefix ? 'secondary' : 'ghost'} className="w-full justify-start pr-10" onClick={()=>setDashboardSubView(d.prefix)}>{getDeptIcon(d.prefix)} <span className="ml-2 truncate">{d.name}</span></Button><div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Department?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the "{d.name}" department. Associated records and rooms may become unmanaged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteDepartment(d.id, d.name, d.prefix)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></li>))}</ul><Button onClick={()=>setIsAddDeptOpen(true)} className="w-full mt-4" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Dept</Button></div>)}
                                {activeView === 'inventory' && (<div><h2 className="px-2 text-xs font-bold text-muted-foreground uppercase mb-2">Inventory View</h2><ul className="space-y-1"><li><Button variant={inventorySubView === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setInventorySubView('all')}><Package className="mr-2 h-4 w-4"/>Full List</Button></li><li><Button variant={inventorySubView === 'inaccurate' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setInventorySubView('inaccurate')}><AlertTriangle className="mr-2 h-4 w-4"/>Inaccurate</Button></li>{departments.map(d=>(<li key={d.id}><Button variant={inventorySubView === d.prefix ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setInventorySubView(d.prefix)}>{getDeptIcon(d.prefix)} <span className="ml-2">{d.name}</span></Button></li>))}</ul></div>)}
                                {activeView === 'transactions' && (<div><h2 className="px-2 text-xs font-bold text-muted-foreground uppercase mb-2">Audit</h2><ul className="space-y-1"><li><Button variant={transactionSubView === 'borrowed' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setTransactionSubView('borrowed')}><PackageCheck className="mr-2 h-4 w-4"/>Active Borrows</Button></li><li><Button variant={transactionSubView === 'logs' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setTransactionSubView('logs')}><FileText className="mr-2 h-4 w-4"/>Platform Logs</Button></li></ul></div>)}
                                {activeView === 'users' && (<div><h2 className="px-2 text-xs font-bold text-muted-foreground uppercase mb-2">Directory</h2><ul className="space-y-1">{userRoles.map(r=>(<li key={r.id}><Button variant={usersSubView === r.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>setUsersSubView(r.id as any)}>{r.icon} <span className="ml-2">{r.name}</span></Button></li>))}</ul></div>)}
                            </div>
                        </div>
                    </div>
                    <div className="p-2 border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between"><UserProfileModal role="Head Supervisor"><div className="flex flex-1 items-center gap-2 cursor-pointer p-1"><Avatar className="h-8 w-8"><AvatarFallback>A</AvatarFallback></Avatar><div className="overflow-hidden"><p className="text-sm font-semibold truncate">{userProfile?.displayName}</p><p className="text-[10px] text-muted-foreground">Head Supervisor</p></div></div></UserProfileModal><UserNav role="Head Supervisor" /></div></div>
                </div>
                <main className="flex-1 flex flex-col h-dvh">
                    <header className="flex h-16 items-center p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="bg-[#141821] p-0 border-none"><div className="p-4 font-bold border-b border-border/50">Menu</div><div className="p-2 space-y-1">{navItems.map(i=>(<Button key={i.id} variant={activeView === i.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=> {setActiveView(i.id as any); setIsMobileMenuOpen(false);}}>{i.icon} <span className="ml-2">{i.label}</span></Button>))}</div></SheetContent></Sheet>
                            <h1 className="font-headline text-xl font-bold uppercase tracking-wider">{navItems.find(i=>i.id===activeView)?.label}</h1>
                        </div>
                    </header>
                    {renderContent()}
                </main>

                {/* Shared Dialogs */}
                <CreateUserForm open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} roleToCreate={usersSubView === 'all' || usersSubView === 'Student' ? 'Staff' : usersSubView as any} />
                <AddDepartmentForm open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen} />
                <AddChannelForm open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} department={formDepartmentContext} />
                <EditUserRoleDialog open={isEditUserRoleOpen} onOpenChange={setIsEditUserRoleOpen} user={userToEdit} />
                <AssignMaterialsDialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen} onAssign={handleAssignItems} />
                
                {/* Rejection Details Dialog */}
                <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Item: {rejectItem?.name}</DialogTitle>
                            <DialogDescription>Specify why this provisioned material is being rejected.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Issue Category</Label>
                                <RadioGroup value={rejectReasonType} onValueChange={(v) => setRejectReasonType(v as any)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="damaged" id="rej-damaged" />
                                        <Label htmlFor="rej-damaged">Damaged</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="not-functioning" id="rej-func" />
                                        <Label htmlFor="rej-func">Not Functioning</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reject-desc">Details / Description</Label>
                                <Textarea 
                                    id="reject-desc" 
                                    placeholder="Explain the issue in detail..." 
                                    value={rejectDescription}
                                    onChange={(e) => setRejectDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReasonType || !rejectDescription.trim()}>
                                Flag as Inaccurate
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isFormOpen} onOpenChange={closeForm}><DialogContent><DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader><form onSubmit={handleFormSubmit} className="grid gap-4 py-4"><div className="grid gap-2"><Label>Name</Label><Input name="name" defaultValue={editingItem?.name} required /></div><div className="grid gap-2"><Label>Description</Label><Textarea name="description" defaultValue={editingItem?.description} /></div><div className="grid gap-2"><Label>Room</Label><Select name="channelId" defaultValue={editingItem?.channelId}><SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger><SelectContent>{dialogChannels.map(c=>(<SelectItem key={c.id} value={c.id}>{c.name.replace('#','')}</SelectItem>))}</SelectContent></Select></div><div className="grid gap-2"><Label>Qty</Label><Input name="quantity" type="number" defaultValue={editingItem?.quantity} required /></div><DialogFooter><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>
            </div>
        </TooltipProvider>
    )
}
