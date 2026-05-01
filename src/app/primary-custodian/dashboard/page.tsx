
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    User, Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle, 
    Edit, Trash, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, ClipboardList, BookUser, Crown, Activity, Loader2, UserPlus, Building, AlertTriangle, Check, X, ClipboardCheck, CheckSquare
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, Role, User as UserType, Department, ItemStatus } from "@/lib/types"
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
type TransactionSubView = 'borrowed' | 'history';
type VerificationSubView = 'queue' | 'provisioning' | 'assign';
type ActivityLogSubView = 'approvals';


export default function HeadSupervisorDashboardPage() {
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
                toast({ title: "Item Updated", description: `${itemData.name} has been updated.` });
            } else {
                // This form is for editing only now
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
            const itemDocRef = doc(firestore, "inventory_items", itemId);
            await deleteDoc(itemDocRef);
            toast({ variant: "destructive", title: "Item Removed", description: `Item has been removed from inventory.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the item.' });
        }
    }
    
     const handleVerificationAction = async (itemId: string, newStatus: 'Available' | 'Inaccurate') => {
        if (!firestore) return;
        const itemDocRef = doc(firestore, "inventory_items", itemId);
        try {
            const updatePayload: { status: 'Available' | 'Inaccurate'; verifiedAt: string; inaccuracyReason?: string } = {
                status: newStatus,
                verifiedAt: new Date().toISOString(),
            };

            if (newStatus === 'Inaccurate') {
                 // For now, let's use a generic reason. A dialog could be added later.
                updatePayload.inaccuracyReason = "Flagged during initial verification.";
            }

            await updateDoc(itemDocRef, updatePayload);
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
        selectedToAssign.forEach(itemId => {
            const itemDocRef = doc(firestore, "inventory_items", itemId);
            batch.update(itemDocRef, { departmentId });
        });

        try {
            await batch.commit();
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
                         {transactionSubView === 'history' && (
                            <Card className="bg-card/80">
                                <CardHeader><CardTitle>Full Transaction History</CardTitle><CardDescription>A complete log of all borrow requests and their statuses.</CardDescription></CardHeader>
                                <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{borrowHistory.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell>{r.borrowingType === 'Group' ? (<Tooltip><TooltipTrigger><Badge variant="outline">Group</Badge></TooltipTrigger><TooltipContent><p className="font-medium">Group {r.groupNumber} ({r.groupSubject})</p><p className="text-muted-foreground max-w-xs">{r.groupMembers}</p></TooltipContent></Tooltip>) : 'Individual'}</TableCell><TableCell className="text-right">{r.status === 'Returned' && r.returnCondition ? <ReturnConditionBadge condition={r.returnCondition}/> : getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
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
                                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Assigned Department</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {usersToDisplay.map(u => {
                                            const isSelf = u.id === user?.uid;
                                            const canEdit = u.role === 'Supervisor' || u.role === 'Staff';
                                            const departmentName = (u.role === 'Supervisor' || u.role === 'Staff') ? departments.find(d => d.id === u.assignedDepartmentId)?.name || 'Not Assigned' : 'N/A';
                                            return (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-medium">{u.displayName} {isSelf && "(You)"}</TableCell>
                                                    <TableCell><Badge variant={(u.role === 'Supervisor' || u.role === 'Head Supervisor' || u.role === 'Property Custodian') ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
                                                    <TableCell>{departmentName}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        {canEdit && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(u)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isSelf}>
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete the user account for <strong>{u.displayName}</strong> and revoke their access to the system. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteUser(u)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                        Delete Account
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
             case 'verification':
                 const pendingItems = items.filter(i => i.status === 'Pending Receipt');
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {verificationSubView === 'queue' && (
                            <Card className="bg-card/80">
                                <CardHeader><CardTitle>Pending Item Verification</CardTitle><CardDescription>Confirm receipt of new items provisioned by the Property Custodian.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Date Added</TableHead><TableHead>Quantity</TableHead><TableHead>Assigned Room</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {pendingItems.length > 0 ? pendingItems.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" onClick={() => handleVerificationAction(item.id, 'Available')}><Check className="mr-2 h-4 w-4"/> Confirm</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleVerificationAction(item.id, 'Inaccurate')}><X className="mr-2 h-4 w-4"/> Inaccurate</Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No items pending verification.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                        {verificationSubView === 'provisioning' && (
                            <Card className="bg-card/80"><CardHeader><CardTitle>Provisioning Log</CardTitle><CardDescription>History of all items added to the inventory.</CardDescription></CardHeader>
                                <CardContent><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Date Added</TableHead><TableHead>Date Verified</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{[...items].sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map(i => (<TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.createdAt ? format(new Date(i.createdAt), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell><TableCell>{i.verifiedAt ? format(new Date(i.verifiedAt), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell><TableCell className="text-right">{getStatusBadge(i)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                            </Card>
                        )}
                         {verificationSubView === 'assign' && (
                            <Card className="bg-card/80">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Assign Materials to Department</CardTitle>
                                        <CardDescription>Select verified, unassigned items and assign them to a department.</CardDescription>
                                    </div>
                                    <Button onClick={() => setIsAssignDialogOpen(true)} disabled={selectedToAssign.length === 0}>
                                        Assign Selected ({selectedToAssign.length})
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <UiCheckbox 
                                                        checked={selectedToAssign.length > 0 && selectedToAssign.length === unassignedItems.length}
                                                        onCheckedChange={handleToggleAllForAssignment}
                                                        aria-label="Select all for assignment"
                                                    />
                                                </TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Date Verified</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unassignedItems.length > 0 ? unassignedItems.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <UiCheckbox
                                                            checked={selectedToAssign.includes(item.id)}
                                                            onCheckedChange={(checked) => handleToggleAssignment(item.id, !!checked)}
                                                            aria-label={`Select ${item.name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">No unassigned items available.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );
            default: return null;
        }
    };
    
    const getHeaderContent = () => {
        const currentNavItem = navItems.find(item => item.id === activeView);

        if (activeView === 'verification') {
            const label = verificationSubView === 'queue' ? 'Verification Queue' : verificationSubView === 'provisioning' ? 'Provisioning Log' : 'Assign Materials';
            const icon = verificationSubView === 'queue' ? <ClipboardCheck /> : verificationSubView === 'provisioning' ? <HistoryIcon /> : <CheckSquare />;
             return (
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{icon}</div>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{label}</h1>
                </div>
             );
        }
        
        if (activeView === 'transactions') {
             const label = transactionSubView === 'borrowed' ? 'Currently Borrowed' : 'Full History';
             const icon = transactionSubView === 'borrowed' ? <PackageCheck /> : <HistoryIcon />;
              return (
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{icon}</div>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{label}</h1>
                </div>
             );
        }

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
            {activeView === 'dashboard' && (<div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2><ul className="flex flex-col gap-1"><li><button onClick={() => {setDashboardSubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>{departments?.map(dept => (<li key={dept.id}><button onClick={() => {setDashboardSubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}</ul></div>)}
            {activeView === 'inventory' && (<div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">DEPARTMENTS</h2><ul className="flex flex-col gap-1"><li><button onClick={() => {setInventorySubView('all'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Package className="h-5 w-5" />All Items</button></li>{departments?.map(dept => (<li key={dept.id}><button onClick={() => {setInventorySubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}<li><button onClick={() => {setInventorySubView('inaccurate'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'inaccurate' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><AlertTriangle className="h-5 w-5" />Inaccurate Items</button></li></ul><Button className="w-full mt-2" variant="outline" onClick={() => setIsAddDeptOpen(true)}>Add Department</Button></div>)}
            {activeView === 'transactions' && (<div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VIEWS</h2><ul className="flex flex-col gap-1">
                <li><button onClick={() => {setTransactionSubView('borrowed'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                <li><button onClick={() => {setTransactionSubView('history'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'history' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><HistoryIcon className="h-5 w-5" /> Full History</button></li>
            </ul></div>)}
            {activeView === 'users' && (<div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">ROLES</h2><ul className="flex flex-col gap-1">{userRoles.map(role => (<li key={role.id}><button onClick={() => {setUsersSubView(role.id as any); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${usersSubView === role.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{role.icon}{role.name}</button></li>))}</ul></div>)}
            {activeView === 'verification' && (
                <div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VERIFICATION</h2><ul className="flex flex-col gap-1">
                    <li><button onClick={() => {setVerificationSubView('queue'); setIsMobileMenuOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'queue' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><ClipboardCheck className="h-5 w-5"/>Verification Queue</button></li>
                    <li><button onClick={() => {setVerificationSubView('provisioning'); setIsMobileMenuOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'provisioning' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><HistoryIcon className="h-5 w-5"/>Provisioning Log</button></li>
                    <li><button onClick={() => {setVerificationSubView('assign'); setIsMobileMenuOpen(false)}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'assign' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><CheckSquare className="h-5 w-5"/>Assign Materials</button></li>
                </ul></div>
            )}
            {activeView === 'activityLogs' && (
                <div className="p-2"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">ACTIVITY</h2><ul className="flex flex-col gap-1">
                    <li><button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white`}><Users className="h-5 w-5"/>Approvals (Teachers)</button></li>
                </ul></div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Head Supervisor"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'H'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Head Supervisor"}</p><p className="text-xs text-muted-foreground">Head Supervisor</p></div></div></UserProfileModal><UserNav role="Head Supervisor" /></div></div>
      </div>
    );
    
    if (isUserLoading || !user) {
      return (<div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
    }

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
                <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">{navItems.map(item => (<Tooltip key={item.id}><TooltipTrigger asChild><Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as AdminView)}>{item.icon}</Button></TooltipTrigger><TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent></Tooltip>))}</div>
                        </div>
                        <div className="w-64 flex-col bg-[#141821] p-2">
                             {activeView === 'dashboard' && (<><div className="p-4 font-headline text-lg font-bold border-b border-border/50">Dashboard View</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2><ul className="flex flex-col gap-1"><li><button onClick={() => setDashboardSubView('overall')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>{departments?.map(dept => (<li key={dept.id}><button onClick={() => setDashboardSubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}</ul></div></>)}
                             {activeView === 'inventory' && (<><div className="p-4 font-headline text-lg font-bold border-b border-border/50">Inventory Filter</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">DEPARTMENTS</h2><ul className="flex flex-col gap-1"><li><button onClick={() => setInventorySubView('all')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Package className="h-5 w-5" />All Items</button></li>{departments?.map(dept => (<li key={dept.id}><button onClick={() => setInventorySubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>))}<li><button onClick={() => setInventorySubView('inaccurate')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'inaccurate' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><AlertTriangle className="h-5 w-5" />Inaccurate Items</button></li></ul><Button className="w-full mt-4" variant="outline" onClick={() => setIsAddDeptOpen(true)}>Add Department</Button></div></>)}
                             {activeView === 'transactions' && (<><div className="p-4 font-headline text-lg font-bold border-b border-border/50">Transactions</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VIEWS</h2><ul className="flex flex-col gap-1">
                                <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                <li><button onClick={() => setTransactionSubView('history')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'history' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><HistoryIcon className="h-5 w-5" /> Full History</button></li>
                             </ul></div></>)}
                             {activeView === 'users' && (<><div className="p-4 font-headline text-lg font-bold border-b border-border/50">User Filter</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">ROLES</h2><ul className="flex flex-col gap-1">{userRoles.map(role => (<li key={role.id}><button onClick={() => setUsersSubView(role.id as any)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${usersSubView === role.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{React.cloneElement(role.icon, {className: "h-5 w-5"})}{role.name}</button></li>))}</ul></div></>)}
                             {activeView === 'verification' && (
                                <><div className="p-4 font-headline text-lg font-bold border-b border-border/50">Verification</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VIEWS</h2><ul className="flex flex-col gap-1">
                                    <li><button onClick={() => setVerificationSubView('queue')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'queue' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><ClipboardCheck className="h-5 w-5"/>Verification Queue</button></li>
                                    <li><button onClick={() => setVerificationSubView('provisioning')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'provisioning' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><HistoryIcon className="h-5 w-5"/>Provisioning Log</button></li>
                                    <li><button onClick={() => setVerificationSubView('assign')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'assign' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><CheckSquare className="h-5 w-5"/>Assign Materials</button></li>
                                </ul></div></>
                             )}
                              {activeView === 'activityLogs' && (
                                <><div className="p-4 font-headline text-lg font-bold border-b border-border/50">Activity Logs</div><div className="py-4"><h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LOGS</h2><ul className="flex flex-col gap-1">
                                    <li><button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white`}><Users className="h-5 w-5"/>Approvals (Teachers)</button></li>
                                </ul></div></>
                             )}
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Head Supervisor"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'H'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Head Supervisor"}</p><p className="text-xs text-muted-foreground">Head Supervisor</p></div></div></UserProfileModal><UserNav role="Head Supervisor" /></div></div>
                </div>

                <main className="flex-1 flex flex-col h-dvh">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30"><div className="flex items-center gap-4"><Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">{mobileSidebarContent}</SheetContent></Sheet>{getHeaderContent()}</div></header>
                    {renderContent()}
                </main>

                 <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Inventory Item"}</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label htmlFor="name">Item Name</Label><Input id="name" name="name" defaultValue={editingItem?.name} required/></div>
                            <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editingItem?.description} required/></div>
                            <div className="grid gap-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" name="quantity" type="number" defaultValue={editingItem?.quantity} required/></div>
                           
                            <div className="grid gap-2">
                                {formDepartmentContext && (<div className="mb-1"><Badge variant="outline" className="border-dashed">Department: {formDepartmentContext.name}</Badge></div>)}
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="channelId">Specific Room</Label>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddChannelOpen(true)} disabled={!formDepartmentContext}><PlusCircle className="mr-2 h-4 w-4" />Add Room</Button>
                                </div>
                                <Select name="channelId" defaultValue={editingItem?.channelId} required><SelectTrigger id="channelId"><SelectValue placeholder="Select a room..." /></SelectTrigger><SelectContent>{dialogChannels.map(c => (<SelectItem key={c.id} value={c.id}>{c.name.replace(/#/g, '')}</SelectItem>))}</SelectContent></Select>
                            </div>

                             {editingItem && (
                               <div className="grid gap-2">
                                  <Label htmlFor="status">Status</Label>
                                  <Select name="status" value={formStatus} onValueChange={(value) => setFormStatus(value as ItemStatus)} required>
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
                             {formStatus === 'Inaccurate' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="inaccuracyReason">Reason for Inaccuracy</Label>
                                    <Textarea id="inaccuracyReason" name="inaccuracyReason" value={formInaccuracyReason} onChange={(e) => setFormInaccuracyReason(e.target.value)} placeholder="e.g., Item count mismatch, minor damage..." required/>
                                </div>
                             )}
                            <div className="grid gap-2"><Label htmlFor="imageUrl">Image URL</Label><Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} placeholder="https://..."/></div>
                            <DialogFooter><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <CreateUserForm open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} roleToCreate={usersSubView as Exclude<Role, "Student">} />
                <AddDepartmentForm open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen} />
                <AddChannelForm open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} department={formDepartmentContext} />
                <EditUserRoleDialog open={isEditUserRoleOpen} onOpenChange={setIsEditUserRoleOpen} user={userToEdit} />
                <AssignMaterialsDialog
                    open={isAssignDialogOpen}
                    onOpenChange={setIsAssignDialogOpen}
                    onAssign={handleAssignItems}
                />

            </div>
        </TooltipProvider>
    )
}
