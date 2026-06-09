
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List, AlertTriangle, CheckCircle, KeyRound, QrCode, FileText, UserPlus, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, UserCircle
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, User as UserType, ChannelAccessRequest, Department, Role, ItemStatus, ActivityLog, StudentDepartmentAccessRequestStatus, ChannelAccessRequestStatus } from "@/lib/types"
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
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { Separator } from "@/components/ui/separator"
import { AddChannelForm } from "@/components/primary-custodian/add-channel-form"
import { QrScannerView } from "@/components/qr-scanner-view"
import { AddDepartmentForm } from "@/components/primary-custodian/add-department-form"
import { CreateUserForm } from "@/components/admin/create-user-form"
import { EditUserRoleDialog } from "@/components/primary-custodian/edit-user-role-dialog"
import { createActivityLog } from "@/lib/logging"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    const assignedDepartmentId = userProfile?.assignedDepartmentId;
    const assignedDepartment = React.useMemo(() => departments.find(d => d.id === assignedDepartmentId), [departments, assignedDepartmentId]);

    React.useEffect(() => {
      if (isUserLoading) return;
      if (!user) {
        router.push("/login");
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

    const [activeView, setActiveView] = React.useState<SupervisorView>('dashboard');
    const [usersSubView, setUsersSubView] = React.useState<'all' | Role>('all');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
    const [isLabsOpen, setIsLabsOpen] = React.useState(true);

    const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
    const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);
    const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false);
    const [isEditUserRoleOpen, setIsEditUserRoleOpen] = React.useState(false);
    const [userToEdit, setUserToEdit] = React.useState<UserType | null>(null);

    const [rejectItem, setRejectItem] = React.useState<InventoryItem | null>(null);
    const [rejectReasonType, setRejectReasonType] = React.useState<'damaged' | 'not-functioning' | ''>('');
    const [rejectDescription, setRejectDescription] = React.useState('');

    const departmentItems = React.useMemo(() => {
        if (!assignedDepartmentId) return items;
        return items.filter(item => item.departmentId === assignedDepartmentId);
    }, [items, assignedDepartmentId]);

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
            status: formData.get("status") as ItemStatus,
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

    const navItems = [
        { id: 'dashboard' as SupervisorView, label: 'Dashboard', icon: <LayoutGrid />, description: 'Overview of laboratory performance and status.' },
        { id: 'scanner' as SupervisorView, label: 'QR Scanner', icon: <QrCode />, description: 'Process checkouts and returns instantly.' },
        { id: 'verification' as SupervisorView, label: 'Verification', icon: <ClipboardCheck />, description: 'Confirm new items from Property Custodian.' },
        { id: 'accessRequests' as SupervisorView, label: 'Access Requests', icon: <KeyRound />, description: 'Manage teacher and student access permissions.' },
        { id: 'inventory' as SupervisorView, label: 'Inventory', icon: <Package />, description: 'Audit and update laboratory equipment lists.' },
        { id: 'transactions' as SupervisorView, label: 'Active Transactions', icon: <PackageOpen />, description: 'Monitor items currently in use.' },
        { id: 'history' as SupervisorView, label: 'History', icon: <HistoryIcon />, description: 'Review past borrowing activities.' },
        { id: 'damaged' as SupervisorView, label: 'Damaged Items', icon: <AlertTriangle />, description: 'Track malfunctioning or broken materials.' },
        { id: 'users' as SupervisorView, label: 'User Directory', icon: <Users />, description: 'Manage laboratory staff and teachers.' },
        { id: 'platformLogs' as SupervisorView, label: 'Audit Logs', icon: <FileText />, description: 'System-wide activity logs for security.' },
    ];

    const getStatusBadge = (status: ItemStatus) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive", "Returning": "outline" } as const;
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    }

    const renderContent = () => {
        switch (activeView) {
            case 'scanner': return <div className="animate-in fade-in duration-500"><QrScannerView /></div>;
            case 'dashboard':
                 const totalItemTypes = departmentItems.length;
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const borrowedCount = departmentHistory.filter(h => h.status === 'Active').length;
                 const reservedCount = departmentHistory.filter(h => h.status === 'Reserved').length;
                return (
                     <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl font-bold font-headline tracking-tight text-white">Welcome back, {userProfile?.displayName || 'Supervisor'}</h2>
                            <p className="text-muted-foreground">System status for {assignedDepartment?.name || 'All Labs'} is operational.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Unique Items</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalItemTypes}</div><p className="text-xs text-muted-foreground mt-1">Cataloged in inventory</p></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Stock</CardTitle><PackageOpen className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalStock}</div><p className="text-xs text-muted-foreground mt-1">Available physical units</p></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Borrowed</CardTitle><Activity className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{borrowedCount}</div><p className="text-xs text-muted-foreground mt-1">Currently checked out</p></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Reserved</CardTitle><Hourglass className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{reservedCount}</div><p className="text-xs text-muted-foreground mt-1">Pending pick-up today</p></CardContent></Card>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold font-headline text-muted-foreground uppercase tracking-widest px-1">Management Hub</h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {navItems.filter(i => i.id !== 'dashboard').map(item => (
                                    <Card 
                                        key={item.id} 
                                        className="group hover:border-primary/50 transition-all cursor-pointer bg-card/40 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5"
                                        onClick={() => setActiveView(item.id)}
                                    >
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                {React.cloneElement(item.icon as React.ReactElement, { className: "h-6 w-6" })}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-lg font-headline">{item.label}</CardTitle>
                                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                </div>
                                                <CardDescription className="line-clamp-1">{item.description}</CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                                <UserProfileModal role="Supervisor">
                                    <Card className="group hover:border-primary/50 transition-all cursor-pointer bg-card/40 backdrop-blur-sm border-dashed border-primary/20">
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                            <div className="p-3 rounded-xl bg-primary/5 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                                                <UserCircle className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-lg font-headline">My Profile</CardTitle>
                                                <CardDescription>View settings and access history.</CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </UserProfileModal>
                            </div>
                        </div>
                     </div>
                );
            case 'verification':
                const pendingItems = departmentItems.filter(item => item.status === 'Pending Receipt');
                return (
                    <Card className="bg-card/80 animate-in slide-in-from-bottom-4 duration-500">
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
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
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
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Dept</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
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
                    <Card className="bg-card/80 animate-in slide-in-from-bottom-4 duration-500">
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
                    <Card className="bg-card/80 animate-in slide-in-from-bottom-4 duration-500">
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
                    <Card className="bg-card/80 animate-in slide-in-from-bottom-4 duration-500">
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
                {/* PERSISTENT SIDEBAR WRAPPER */}
                <div className={cn(
                    "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full",
                    isSidebarCollapsed ? "w-[72px]" : "w-[320px]"
                )}>
                    <div className="flex flex-1 overflow-hidden h-full">
                        {/* RAIL - ALWAYS VISIBLE */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex-1 flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant={activeView === item.id ? 'secondary' : 'ghost'} 
                                                size="icon" 
                                                className="h-12 w-12 rounded-lg" 
                                                onClick={() => setActiveView(item.id as any)}
                                            >
                                                {item.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                            {/* Avatar at bottom of rail when collapsed */}
                            {isSidebarCollapsed && (
                                <div className="pb-4 mt-auto">
                                    <UserProfileModal role="Supervisor">
                                         <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                                            <AvatarFallback>S</AvatarFallback>
                                         </Avatar>
                                    </UserProfileModal>
                                </div>
                            )}
                        </div>
                        
                        {/* SIDEBAR - COLLAPSIBLE SECTION */}
                        <div 
                            className={cn(
                                "flex flex-col bg-[#141821] transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full",
                                isSidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
                            )}
                        >
                            <div className="w-64 flex flex-col h-full">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 uppercase tracking-tighter whitespace-nowrap">Lab Management</div>
                                <div className="flex-1 py-4 space-y-4 overflow-y-auto scrollbar-none">
                                    <button onClick={() => setIsLabsOpen(!isLabsOpen)} className="flex w-full items-center justify-between px-4 mb-2 group text-muted-foreground hover:text-foreground">
                                        <h2 className="text-xs font-bold uppercase tracking-wider">Navigation</h2>
                                        {isLabsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    {isLabsOpen && (
                                        <ul className="space-y-1 px-2">
                                            {navItems.map(item => (
                                                <li key={item.id}>
                                                    <Button 
                                                        variant={activeView === item.id ? 'secondary' : 'ghost'} 
                                                        className="w-full justify-start h-9 text-sm" 
                                                        onClick={()=>handleViewChange(item.id as SupervisorView)}
                                                    >
                                                        {React.cloneElement(item.icon as any, { className: "mr-2 h-4 w-4"})}
                                                        {item.label}
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="p-2 border-t border-border/50 bg-[#141821]">
                                    <div className="flex items-center justify-between">
                                        <UserProfileModal role="Supervisor">
                                            <div className="flex flex-1 items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded-md transition-colors">
                                                <Avatar className="h-8 w-8"><AvatarFallback>S</AvatarFallback></Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-semibold truncate text-white">{userProfile?.displayName}</p>
                                                    <p className="text-[10px] text-muted-foreground">Lab Supervisor</p>
                                                </div>
                                            </div>
                                        </UserProfileModal>
                                        <UserNav role="Supervisor" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TOGGLE BUTTON */}
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={cn(
                            "absolute -right-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full bg-[#141821] border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-md group",
                            isSidebarCollapsed && "bg-[#0e1015]"
                        )}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </button>
                </div>

                <main className="flex-1 flex flex-col h-dvh overflow-hidden">
                    <header className="flex h-16 items-center p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4 flex-1">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="bg-[#141821] p-0 border-none">
                                    <div className="p-4 font-bold border-b border-border/50 text-white">Menu</div>
                                    <div className="p-2 space-y-1">
                                        {navItems.map(i=>(
                                            <Button 
                                                key={i.id} 
                                                variant={activeView === i.id ? 'secondary' : 'ghost'} 
                                                className="w-full justify-start gap-2" 
                                                onClick={()=> {setActiveView(i.id); setIsMobileMenuOpen(false);}}
                                            >
                                                {i.icon} <span>{i.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </SheetContent>
                            </Sheet>
                            
                            <h1 className="font-headline text-xl font-bold uppercase tracking-wider text-white">
                                {navItems.find(i=>i.id===activeView)?.label}
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">
                                {userProfile?.role || 'Lab Supervisor'}
                            </Badge>
                            <UserNav role="Supervisor" />
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
                
                <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Reject Item: {rejectItem?.name}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Issue Category</Label>
                                <RadioGroup value={rejectReasonType} onValueChange={(v) => setRejectReasonType(v as any)} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="damaged" id="rej-damaged" /><Label htmlFor="rej-damaged">Damaged</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="not-functioning" id="rej-func" /><Label htmlFor="rej-func">Not Functioning</Label></div>
                                </RadioGroup>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reject-desc">Details</Label>
                                <Textarea id="reject-desc" placeholder="Details..." value={rejectDescription} onChange={(e) => setRejectDescription(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReasonType || !rejectDescription.trim()}>Flag Inaccurate</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label>Name</Label><Input name="name" defaultValue={editingItem?.name} required /></div>
                            <div className="grid gap-2"><Label>Description</Label><Textarea name="description" defaultValue={editingItem?.description} /></div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select name="status" defaultValue={editingItem?.status}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Available">Available</SelectItem>
                                        <SelectItem value="Locked">Locked</SelectItem>
                                        <SelectItem value="Inaccurate">Inaccurate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
