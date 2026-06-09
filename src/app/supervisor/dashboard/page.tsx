
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List, AlertTriangle, CheckCircle, KeyRound, QrCode, FileText, UserPlus, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, UserCircle, Clock
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

type SupervisorView = 'dashboard' | 'scanner' | 'inventory' | 'transactions' | 'history' | 'verification' | 'damaged' | 'accessRequests' | 'users' | 'platformLogs';

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
            case 'dashboard': {
                 const totalItemTypes = departmentItems.length;
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const activeHistory = departmentHistory.filter(h => h.status === 'Active');
                 const borrowedCount = activeHistory.length;
                 const reservedCount = departmentHistory.filter(h => h.status === 'Reserved').length;
                 
                 const pendingVerifications = departmentItems.filter(i => i.status === 'Pending Receipt').slice(0, 5);
                 const recentActivity = activityLogs.slice(0, 5);
                 const urgentAccess = [...pendingAccessRequests, ...pendingStudentRequests].slice(0, 5);

                return (
                     <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl font-bold font-headline tracking-tight text-white">Operational Overview</h2>
                            <p className="text-muted-foreground">Welcome back, {userProfile?.displayName || 'Supervisor'}. Here is the status of {assignedDepartment?.name || 'All Labs'}.</p>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Items</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalItemTypes}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Stock</CardTitle><PackageOpen className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Borrowed</CardTitle><Activity className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{borrowedCount}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reserved</CardTitle><Hourglass className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{reservedCount}</div></CardContent></Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Actionable Tasks: Verifications & Access */}
                            <div className="space-y-6">
                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ClipboardCheck className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-lg font-headline">Action Required</CardTitle>
                                        </div>
                                        {pendingVerifications.length > 0 && <Badge variant="destructive">{pendingVerifications.length} New</Badge>}
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {pendingVerifications.length > 0 || urgentAccess.length > 0 ? (
                                            <div className="space-y-4">
                                                {pendingVerifications.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border/30">
                                                        <div>
                                                            <p className="text-sm font-semibold">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">Provisioned by Custodian</p>
                                                        </div>
                                                        <Button size="sm" variant="ghost" onClick={() => setActiveView('verification')}>Verify <ArrowRight className="ml-1 h-3 w-3" /></Button>
                                                    </div>
                                                ))}
                                                {urgentAccess.map((req: any) => (
                                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border/30">
                                                        <div>
                                                            <p className="text-sm font-semibold">{req.studentName || req.teacherName}</p>
                                                            <p className="text-xs text-muted-foreground">Requesting {req.departmentName || req.channelName}</p>
                                                        </div>
                                                        <Button size="sm" variant="ghost" onClick={() => setActiveView('accessRequests')}>Review <ArrowRight className="ml-1 h-3 w-3" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                                <CheckCircle className="h-8 w-8 opacity-20" />
                                                No pending approvals or verifications.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-emerald-500" />
                                            <CardTitle className="text-lg font-headline">Live Transactions</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {activeHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {activeHistory.slice(0, 4).map(h => (
                                                    <div key={h.id} className="flex items-center gap-3 text-sm">
                                                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{h.studentName.charAt(0)}</AvatarFallback></Avatar>
                                                        <div className="flex-1 truncate">
                                                            <span className="font-medium text-white">{h.studentName}</span>
                                                            <span className="text-muted-foreground mx-1">borrowed</span>
                                                            <span className="font-medium text-primary">{h.itemName}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(h.date), 'p')}</span>
                                                    </div>
                                                ))}
                                                <Button variant="link" className="w-full text-xs text-muted-foreground h-auto p-0 pt-2" onClick={() => setActiveView('transactions')}>View all active sessions</Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-muted-foreground text-sm italic">No items currently out.</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* System Status: Logs & Problems */}
                            <div className="space-y-6">
                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <HistoryIcon className="h-5 w-5 text-amber-500" />
                                            <CardTitle className="text-lg font-headline">Recent System Activity</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {recentActivity.length > 0 ? recentActivity.map(log => (
                                                <div key={log.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-bold uppercase tracking-wider text-primary">{log.action}</p>
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {format(new Date(log.timestamp), 'MMM d, p')}</div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{log.details}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-center text-sm text-muted-foreground italic">No recent system events.</p>
                                            )}
                                        </div>
                                        {recentActivity.length > 0 && (
                                            <Button variant="link" className="w-full text-xs text-muted-foreground mt-4 h-auto p-0" onClick={() => setActiveView('platformLogs')}>Open Audit Logs</Button>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/40 border-border/50 border-destructive/20">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            <CardTitle className="text-lg font-headline">Maintenance Issues</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').length > 0 ? (
                                            <div className="space-y-3">
                                                {departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').slice(0, 3).map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/10">
                                                        <span className="text-sm text-foreground truncate max-w-[150px]">{item.name}</span>
                                                        <Badge variant="outline" className={item.status === 'Inaccurate' ? 'text-destructive border-destructive/30' : 'text-amber-500 border-amber-500/30'}>
                                                            {item.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                                <Button variant="link" className="w-full text-xs text-muted-foreground h-auto p-0" onClick={() => setActiveView('damaged')}>Review damaged items</Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-emerald-500 text-sm flex items-center justify-center gap-2">
                                                <Check className="h-4 w-4" />
                                                All equipment verified.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                     </div>
                );
            }
             case 'inventory':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle>Manage Inventory</CardTitle><CardDescription>Edit or remove items from all labs.</CardDescription></div>
                                <Button onClick={() => setIsAddChannelOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead className="whitespace-nowrap">Name</TableHead><TableHead className="whitespace-nowrap">Lab</TableHead><TableHead className="whitespace-nowrap">Qty</TableHead><TableHead className="whitespace-nowrap">Status</TableHead><TableHead className="text-right whitespace-nowrap">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                                            <TableCell className="whitespace-nowrap">{channels.find(c=>c.id===item.channelId)?.name.replace('#','') || 'Unknown'}</TableCell>
                                            <TableCell className="whitespace-nowrap">{item.quantity}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                {item.status === 'Inaccurate' && (
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
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
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
                        <Card className="bg-card/80"><CardHeader><CardTitle>Active Borrows</CardTitle></CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead className="whitespace-nowrap">Student</TableHead><TableHead className="whitespace-nowrap">Item</TableHead><TableHead className="whitespace-nowrap">Date</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentHistory.filter(h => h.status === 'Active').map(r => (<TableRow key={r.id}><TableCell className="whitespace-nowrap">{r.studentName}</TableCell><TableCell className="whitespace-nowrap">{r.itemName}</TableCell><TableCell className="whitespace-nowrap">{format(new Date(r.date), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'history':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80"><CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentHistory.map(h => (<TableRow key={h.id}><TableCell>{h.studentName}</TableCell><TableCell>{h.itemName}</TableCell><TableCell><Badge variant="outline">{h.status}</Badge></TableCell><TableCell className="text-right text-xs">{format(new Date(h.date), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle>User Directory</CardTitle></div>
                                <Button onClick={() => setIsCreateUserOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> New User</Button>
                            </CardHeader>
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
                    </div>
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
             case 'verification': {
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
            }
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
            case 'damaged':
                 return (
                    <Card className="bg-card/80 animate-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <CardTitle>Damaged & Problem Equipment</CardTitle>
                            <CardDescription>Track items reported as inaccurate or pending return to storage.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Last Check</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').map(item => (
                                    <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{getStatusBadge(item.status)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d') : 'N/A'}</TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <Button variant="ghost" size="icon" className="text-amber-500" onClick={() => handleReturnToCustodian(item)} disabled={item.status === 'Returning'}><RotateCcw className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                    </TableCell></TableRow>
                                ))}</TableBody>
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
                {/* UNIFIED COLLAPSIBLE SIDEBAR */}
                <div className={cn(
                    "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full group/sidebar",
                    isSidebarCollapsed ? "w-[72px]" : "w-[280px]"
                )}>
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header: Logo */}
                        <div className={cn(
                            "flex items-center gap-3 p-4 border-b border-border/50 transition-all duration-300",
                            isSidebarCollapsed ? "justify-center" : "justify-start px-6"
                        )}>
                            <Logo />
                            {!isSidebarCollapsed && (
                                <span className="font-headline text-lg font-bold tracking-tighter animate-in fade-in duration-500">ORBIT</span>
                            )}
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-none px-3">
                            {!isSidebarCollapsed && (
                                <h2 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-in fade-in duration-500">
                                    Management
                                </h2>
                            )}
                            <ul className="space-y-1">
                                {navItems.map(item => (
                                    <li key={item.id}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant={activeView === item.id ? 'secondary' : 'ghost'} 
                                                    className={cn(
                                                        "w-full justify-start h-10 transition-all duration-200",
                                                        isSidebarCollapsed ? "px-0 justify-center" : "px-3"
                                                    )} 
                                                    onClick={() => handleViewChange(item.id as SupervisorView)}
                                                >
                                                    <div className={cn("shrink-0", isSidebarCollapsed ? "" : "mr-3")}>
                                                        {React.cloneElement(item.icon as any, { className: "h-5 w-5" })}
                                                    </div>
                                                    {!isSidebarCollapsed && (
                                                        <span className="truncate text-sm font-medium animate-in fade-in duration-300">
                                                            {item.label}
                                                        </span>
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            {isSidebarCollapsed && (
                                                <TooltipContent side="right" sideOffset={10} className="font-medium">
                                                    {item.label}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Footer: User Profile */}
                        <div className="p-3 border-t border-border/50 bg-[#0e1015]">
                             <UserProfileModal role="Supervisor">
                                <div className={cn(
                                    "flex items-center gap-3 cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors",
                                    isSidebarCollapsed ? "justify-center" : "justify-start"
                                )}>
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">S</AvatarFallback>
                                    </Avatar>
                                    {!isSidebarCollapsed && (
                                        <div className="overflow-hidden animate-in fade-in duration-500">
                                            <p className="text-sm font-semibold truncate text-white">{userProfile?.displayName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Supervisor</p>
                                        </div>
                                    )}
                                </div>
                            </UserProfileModal>
                        </div>
                    </div>

                    {/* Centered Toggle Button */}
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
