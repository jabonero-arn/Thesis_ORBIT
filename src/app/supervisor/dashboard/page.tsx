
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch, collection } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List, AlertTriangle, CheckCircle, KeyRound, QrCode, FileText, UserPlus, RotateCcw
} from "lucide-react"
import { format } from "date-fns"
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, User as UserType, ChannelAccessRequest, ChannelAccessRequestStatus, Department, Role, ActivityLog, StudentDepartmentAccessRequestStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { InventoryGrid } from "@/components/inventory-grid"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReturnConditionBadge } from "@/components/return-condition-badge"
import { Checkbox as UiCheckbox } from "@/components/ui/checkbox"
import { AssignRoomDialog } from "@/components/supervisor/assign-room-dialog"
import { Switch } from "@/components/ui/switch"
import { AddChannelForm } from "@/components/primary-custodian/add-channel-form"
import { QrScannerView } from "@/components/qr-scanner-view"
import { AddDepartmentForm } from "@/components/primary-custodian/add-department-form"
import { CreateUserForm } from "@/components/admin/create-user-form"
import { EditUserRoleDialog } from "@/components/primary-custodian/edit-user-role-dialog"
import { AssignMaterialsDialog } from "@/components/primary-custodian/assign-materials-dialog"
import { createActivityLog } from "@/lib/logging"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

type SupervisorView = 'dashboard' | 'scanner' | 'inventory' | 'transactions' | 'history' | 'verification' | 'damaged' | 'assignment' | 'accessRequests' | 'users' | 'platformLogs';

const userRoles = [
    { id: 'all', name: 'All Users', icon: <Users /> },
    { id: 'Property Custodian', name: 'Property Custodian', icon: <Building /> },
    { id: 'Supervisor', name: 'Supervisor', icon: <Shield /> },
    { id: 'Teacher', name: 'Teacher', icon: <Cog /> },
    { id: 'Student', name: 'Student', icon: <Users /> },
];

export default function SupervisorDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, channels, departments, channelAccessRequests, allUsers, studentDepartmentAccessRequests, activityLogs } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    const assignedDepartmentId = userProfile?.assignedDepartmentId;
    const assignedDepartment = React.useMemo(() => departments.find(d => d.id === assignedDepartmentId), [departments, assignedDepartmentId]);

    const assignedChannels = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        return channels.filter(c => c.departmentId === assignedDepartmentId);
    }, [channels, assignedDepartmentId]);
    
    React.useEffect(() => {
      if (isUserLoading) return;
      if (!user) {
        router.push("/login?role=supervisor");
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
    const [activeView, setActiveView] = React.useState<SupervisorView>('dashboard');
    const [dashboardSubView, setDashboardSubView] = React.useState<string>('overall');
    const [inventorySubView, setInventorySubView] = React.useState<'grid' | 'table' | 'all' | 'inaccurate'>('table');
    const [verificationSubView, setVerificationSubView] = React.useState<'pending' | 'history'>('pending');
    const [usersSubView, setUsersSubView] = React.useState<'all' | Role>('all');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);

    const [selectedForRoomAssignment, setSelectedForRoomAssignment] = React.useState<string[]>([]);
    const [isAssignRoomDialogOpen, setIsAssignRoomDialogOpen] = React.useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
    const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isEditUserRoleOpen, setIsEditUserRoleOpen] = React.useState(false);
    const [userToEdit, setUserToEdit] = React.useState<UserType | null>(null);
    const [selectedToAssign, setSelectedToAssign] = React.useState<string[]>([]);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

    // Rejection State
    const [rejectItem, setRejectItem] = React.useState<InventoryItem | null>(null);
    const [rejectReasonType, setRejectReasonType] = React.useState<'damaged' | 'not-functioning' | ''>('');
    const [rejectDescription, setRejectDescription] = React.useState('');

    // Data Filtering
    const departmentItems = React.useMemo(() => {
        if (!assignedDepartmentId) return items; // Platform view
        return items.filter(item => item.departmentId === assignedDepartmentId);
    }, [items, assignedDepartmentId]);

    const itemsToAssign = React.useMemo(() => {
        return departmentItems.filter(item => !item.channelId && item.status === 'Available');
    }, [departmentItems]);

    const departmentHistory = React.useMemo(() => {
        if (!assignedDepartmentId) return borrowHistory;
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems, assignedDepartmentId]);

    const pendingAccessRequests = React.useMemo(() => {
        return channelAccessRequests.filter(req => (!assignedDepartmentId || req.departmentId === assignedDepartmentId) && req.status === 'pending');
    }, [channelAccessRequests, assignedDepartmentId]);

    const pendingStudentRequests = React.useMemo(() => {
        return studentDepartmentAccessRequests.filter(req => (!assignedDepartmentId || req.departmentId === assignedDepartmentId) && req.status === 'pending');
    }, [studentDepartmentAccessRequests, assignedDepartmentId]);

    const usersToDisplay = React.useMemo(() => {
        if (usersSubView === 'all') return allUsers;
        return allUsers.filter(u => u.role === usersSubView);
    }, [usersSubView, allUsers]);

    // Handlers
    const handleViewChange = (view: SupervisorView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }
    
    const handleVerificationAction = async (itemId: string, newStatus: 'Available' | 'Inaccurate', details?: string) => {
        if (!firestore) return;
        const item = items.find(i => i.id === itemId);
        try {
            const updatePayload: any = { status: newStatus, verifiedAt: new Date().toISOString() };
            if (details) updatePayload.inaccuracyReason = details;
            await updateDoc(doc(firestore, "inventory_items", itemId), updatePayload);
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Supervisor', newStatus === 'Available' ? 'Verified Item' : 'Flagged Inaccurate', `Processed receipt of ${item?.name}`, 'Inventory');
            toast({ title: `Item ${newStatus === 'Available' ? 'Confirmed' : 'Flagged'}` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleRejectSubmit = () => {
        if (!rejectItem || !rejectReasonType || !rejectDescription.trim()) return;
        const reasonText = rejectReasonType === 'damaged' ? 'Damaged' : 'Not Functioning';
        handleVerificationAction(rejectItem.id, 'Inaccurate', `${reasonText}: ${rejectDescription}`);
        setRejectItem(null);
        setRejectReasonType('');
        setRejectDescription('');
    };
    
    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !editingItem) return;
        const formData = new FormData(event.currentTarget);
        const itemData: Partial<InventoryItem> = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            status: formData.get("status") as InventoryItem['status'],
        };
        try {
            await updateDoc(doc(firestore, "inventory_items", editingItem.id), { ...itemData, verifiedAt: new Date().toISOString() } as any);
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Supervisor', 'Updated Item', `Updated ${itemData.name}`, 'Inventory');
            toast({ title: "Item Updated" });
            closeForm();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error" });
        }
    }

    const closeForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        try {
            const item = items.find(i => i.id === itemId);
            await deleteDoc(doc(firestore, "inventory_items", itemId));
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Supervisor', 'Deleted Item', `Removed ${item?.name}`, 'Inventory');
            toast({ variant: "destructive", title: "Item Removed" });
        } catch (e) {
            console.error(e);
        }
    }

    const handleReturnToCustodian = async (item: InventoryItem) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, "inventory_items", item.id), { status: 'Returning' });
            createActivityLog(firestore, user?.uid || 'sys', userProfile?.displayName || 'Supervisor', 'Returned to Custodian', `Flagged ${item.name} for return`, 'Inventory');
            toast({ title: "Item Flagged for Return" });
        } catch (error) {
            console.error(error);
        }
    };

    const handleAccessRequest = async (requestId: string, newStatus: ChannelAccessRequestStatus) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'channel_access_requests', requestId), { status: newStatus });
            toast({ title: `Teacher Request ${newStatus.toUpperCase()}` });
        } catch (e) {
            console.error(e);
        }
    };

    const handleStudentAccessRequest = async (requestId: string, newStatus: StudentDepartmentAccessRequestStatus) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'student_department_access_requests', requestId), { status: newStatus });
            toast({ title: `Student Access ${newStatus.toUpperCase()}` });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteUser = async (userToDelete: UserType) => {
        if (!firestore || userToDelete.id === user?.uid) return;
        try {
            const batch = writeBatch(firestore);
            batch.delete(doc(firestore, "users", userToDelete.id));
            let col = "";
            switch (userToDelete.role) {
                case "Supervisor": col = "roles_supervisor"; break;
                case "Property Custodian": col = "roles_property_custodian"; break;
                case "Teacher": col = "roles_teachers"; break;
            }
            if (col) batch.delete(doc(firestore, col, userToDelete.id));
            await batch.commit();
            toast({ title: "User Deleted" });
        } catch (e) {
            console.error(e);
        }
    }

    // Nav Items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
        { id: 'scanner', label: 'QR Scanner', icon: <QrCode /> },
        { id: 'verification', label: 'Verification', icon: <ClipboardCheck /> },
        { id: 'accessRequests', label: 'Access Requests', icon: <KeyRound /> },
        { id: 'assignment', label: 'Material Assignment', icon: <PackageCheck /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Active Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
        { id: 'damaged', label: 'Damaged Items', icon: <AlertTriangle /> },
        { id: 'users', label: 'User Directory', icon: <Users /> },
        { id: 'platformLogs', label: 'Audit Logs', icon: <FileText /> },
    ];

    const getStatusBadge = (status: InventoryItem['status']) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive", "Returning": "outline" } as const;
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    }

    const renderContent = () => {
        const damagedHistory = departmentHistory.filter(h => h.returnCondition && h.returnCondition !== 'Good');
        const individualDamaged = damagedHistory.filter(h => h.borrowingType !== 'Group');
        const groupDamaged = damagedHistory.filter(h => h.borrowingType === 'Group');

        switch (activeView) {
            case 'scanner': return <QrScannerView />;
            case 'dashboard':
                 const totalItemTypes = departmentItems.length;
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const borrowedCount = departmentHistory.filter(h => h.status === 'Active').length;
                 const reservedCount = departmentHistory.filter(h => h.status === 'Reserved').length;
                return (
                     <div className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Items</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalItemTypes}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Stock</CardTitle><PackageOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Borrowed</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{borrowedCount}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Reserved</CardTitle><Hourglass className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reservedCount}</div></CardContent></Card>
                        </div>
                     </div>
                );
            case 'verification':
                const pendingItems = departmentItems.filter(item => item.status === 'Pending Receipt');
                return (
                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Provisioning Queue</CardTitle>
                            <CardDescription>Confirm receipt of new materials from the Property Custodian.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{pendingItems.map(i => (<TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.quantity}</TableCell><TableCell className="text-right space-x-2">
                                    <Button size="sm" onClick={() => handleVerificationAction(i.id, 'Available')}><Check className="mr-1 h-4 w-4"/>Confirm</Button>
                                    <Button size="sm" variant="destructive" onClick={() => setRejectItem(i)}><X className="mr-1 h-4 w-4"/>Reject</Button>
                                </TableCell></TableRow>))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            case 'accessRequests':
                return (
                    <div className="space-y-6">
                        <Card className="bg-card/80">
                            <CardHeader><CardTitle>Teacher Lab Access</CardTitle></CardHeader>
                            <CardContent className="max-h-[50vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Lab</TableHead><TableHead>Subject</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>{pendingAccessRequests.map(req => (
                                        <TableRow key={req.id}><TableCell>{req.teacherName}</TableCell><TableCell>{req.channelName.replace('#','')}</TableCell><TableCell>{req.subject}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" onClick={()=>handleAccessRequest(req.id, 'approved')}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={()=>handleAccessRequest(req.id, 'denied')}>Deny</Button>
                                        </TableCell></TableRow>
                                    ))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/80">
                            <CardHeader><CardTitle>Student Dept Access</CardTitle></CardHeader>
                            <CardContent className="max-h-[50vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Dept</TableHead><TableHead className="text-right">Actions</TableHead></TableHeader>
                                    <TableBody>{pendingStudentRequests.map(req => (
                                        <TableRow key={req.id}><TableCell>{req.studentName}</TableCell><TableCell>{req.departmentName}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" onClick={()=>handleStudentAccessRequest(req.id, 'approved')}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={()=>handleStudentAccessRequest(req.id, 'denied')}>Deny</Button>
                                        </TableCell></TableRow>
                                    ))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'inventory':
                 return (
                    <Card className="bg-card/80">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Inventory List</CardTitle><CardDescription>Edit lab equipment or return items to storage.</CardDescription></div>
                            <Button onClick={() => setIsAddChannelOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Room</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{departmentItems.map(item => (
                                    <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{channels.find(c=>c.id===item.channelId)?.name.replace('#','') || 'None'}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{getStatusBadge(item.status)}</TableCell>
                                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                                        {item.status === 'Inaccurate' && (
                                            <Button variant="ghost" size="icon" className="text-amber-500" onClick={() => handleReturnToCustodian(item)}><RotateCcw className="h-4 w-4"/></Button>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash className="h-4 w-4"/></Button>
                                    </TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            case 'users':
                return (
                    <Card className="bg-card/80">
                        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>User Directory</CardTitle></div><Button onClick={() => setIsCreateUserOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> New User</Button></CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{usersToDisplay.map(u => (
                                    <TableRow key={u.id}><TableCell>{u.displayName}</TableCell><TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setUserToEdit(u); setIsEditUserRoleOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(u)}><Trash className="h-4 w-4"/></Button>
                                    </TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            case 'platformLogs':
                return (
                    <Card className="bg-card/80">
                        <CardHeader><CardTitle>Platform Audit Logs</CardTitle></CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
                                <TableBody>{activityLogs.map(log => (<TableRow key={log.id}><TableCell>{log.userName}</TableCell><TableCell><Badge variant="outline">{log.action}</Badge></TableCell><TableCell className="max-w-md truncate">{log.details}</TableCell><TableCell className="text-right text-xs">{format(new Date(log.timestamp), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            default: return <div className="text-center py-20 text-muted-foreground">Select a category from the sidebar.</div>;
        }
    };

    if (isUserLoading || isProfileLoading || !user) return <div className="flex h-dvh items-center justify-center bg-[#1e2430]"><Loader2 className="animate-spin" /></div>;

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
                {/* Combined Sidebar */}
                <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col gap-2">
                                {navItems.slice(0, 6).map(item => (
                                    <Tooltip key={item.id}><TooltipTrigger asChild><Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" onClick={() => handleViewChange(item.id as SupervisorView)}>{item.icon}</Button></TooltipTrigger><TooltipContent side="right"><p>{item.label}</p></TooltipContent></Tooltip>
                                ))}
                                <Separator className="bg-border/50 my-2" />
                                {navItems.slice(6).map(item => (
                                    <Tooltip key={item.id}><TooltipTrigger asChild><Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" onClick={() => handleViewChange(item.id as SupervisorView)}>{item.icon}</Button></TooltipTrigger><TooltipContent side="right"><p>{item.label}</p></TooltipContent></Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="w-64 bg-[#141821] p-2 overflow-y-auto">
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50 uppercase tracking-tighter">Lab Management</div>
                            <div className="py-4 space-y-4">
                                <ul className="space-y-1">
                                    {navItems.map(item => (
                                        <li key={item.id}><Button variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=>handleViewChange(item.id as SupervisorView)}>{React.cloneElement(item.icon as any, { className: "mr-2 h-4 w-4"})}{item.label}</Button></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between"><UserProfileModal role="Supervisor"><div className="flex flex-1 items-center gap-2 cursor-pointer p-1"><Avatar className="h-8 w-8"><AvatarFallback>S</AvatarFallback></Avatar><div className="overflow-hidden"><p className="text-sm font-semibold truncate">{userProfile?.displayName}</p><p className="text-[10px] text-muted-foreground">Lab Supervisor</p></div></div></UserProfileModal><UserNav role="Supervisor" /></div></div>
                </div>
                <main className="flex-1 flex flex-col h-dvh">
                    <header className="flex h-16 items-center p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="bg-[#141821] p-0 border-none"><div className="p-4 font-bold border-b border-border/50">Menu</div><div className="p-2 space-y-1">{navItems.map(i=>(<Button key={i.id} variant={activeView === i.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={()=> {setActiveView(i.id as any); setIsMobileMenuOpen(false);}}>{i.icon} <span className="ml-2">{i.label}</span></Button>))}</div></SheetContent></Sheet>
                            <h1 className="font-headline text-xl font-bold uppercase tracking-wider">{navItems.find(i=>i.id===activeView)?.label}</h1>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {renderContent()}
                    </div>
                </main>

                {/* Dialogs */}
                <CreateUserForm open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} roleToCreate="Supervisor" />
                <AddDepartmentForm open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen} />
                <AddChannelForm open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} department={assignedDepartment || departments[0] || null} />
                <EditUserRoleDialog open={isEditUserRoleOpen} onOpenChange={setIsEditUserRoleOpen} user={userToEdit} />
                
                {/* Rejection Dialog */}
                <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
                    <DialogContent><DialogHeader><DialogTitle>Reject Item: {rejectItem?.name}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2"><Label>Issue Category</Label><RadioGroup value={rejectReasonType} onValueChange={(v) => setRejectReasonType(v as any)} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="damaged" id="rej-damaged" /><Label htmlFor="rej-damaged">Damaged</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="not-functioning" id="rej-func" /><Label htmlFor="rej-func">Not Functioning</Label></div>
                            </RadioGroup></div>
                            <div className="grid gap-2"><Label htmlFor="reject-desc">Details</Label><Textarea id="reject-desc" placeholder="Details..." value={rejectDescription} onChange={(e) => setRejectDescription(e.target.value)} /></div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button><Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReasonType || !rejectDescription.trim()}>Flag Inaccurate</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Item Dialog */}
                <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent><DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label>Name</Label><Input name="name" defaultValue={editingItem?.name} required /></div>
                            <div className="grid gap-2"><Label>Description</Label><Textarea name="description" defaultValue={editingItem?.description} /></div>
                            <div className="grid gap-2"><Label>Status</Label><Select name="status" defaultValue={editingItem?.status}><SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Available">Available</SelectItem><SelectItem value="Locked">Locked</SelectItem><SelectItem value="Inaccurate">Inaccurate</SelectItem></SelectContent>
                            </Select></div>
                            <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
