
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List, AlertTriangle, CheckCircle, KeyRound, QrCode, FileText, UserPlus, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, UserCircle, Clock, Filter, Tags, Plus, Search, Image as ImageIcon, ExternalLink, Calendar
} from "lucide-react"
import { format, isToday, isPast, parseISO } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

type SupervisorView = 'dashboard' | 'scanner' | 'inventory' | 'transactions' | 'history' | 'damaged' | 'accessRequests' | 'users' | 'platformLogs';

const PREDEFINED_CATEGORIES = [
    "Equipment",
    "Consumable",
    "Electronic Component",
    "Tool",
    "Device",
    "Laboratory Material"
];

const LOW_STOCK_THRESHOLD = 5;

const getItemCategories = (item: InventoryItem): string[] => {
    if (Array.isArray(item.categories)) return item.categories;
    if (item.category) return [item.category];
    return [];
}

export default function SupervisorDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, channels, departments, allUsers, studentDepartmentAccessRequests, activityLogs } = useAppContext();
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
        if (isUserLoading || isProfileLoading || !user || !userProfile) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    const [activeView, setActiveView] = React.useState<SupervisorView>('dashboard');
    const [usersSubView, setUsersSubView] = React.useState<'all' | Role>('all');
    
    // Inventory Filters
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [roomFilter, setRoomFilter] = React.useState<string>('all');
    const [inventorySearch, setInventorySearch] = React.useState('');

    // Access Request Filter
    const [accessRequestStatus, setAccessRequestStatus] = React.useState<string>('pending');
    const [accessSearch, setAccessSearch] = React.useState('');

    // History Filters
    const [historyStatusFilter, setHistoryStatusFilter] = React.useState<string>('all');
    const [historySearch, setHistorySearch] = React.useState('');

    // Audit Log Filters
    const [auditActorFilter, setAuditActorFilter] = React.useState<string>('all');
    const [auditActionFilter, setAuditActionFilter] = React.useState<string>('all');
    const [auditSearch, setAuditSearch] = React.useState('');
    const [selectedLog, setSelectedLog] = React.useState<ActivityLog | null>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [customCategoryInput, setCustomCategoryInput] = React.useState('');
    const [formImageUrl, setFormImageUrl] = React.useState('');

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

    const availableCategories = React.useMemo(() => {
        const uniqueInDb = Array.from(new Set(items.flatMap(i => getItemCategories(i)))) as string[];
        const combined = Array.from(new Set([...PREDEFINED_CATEGORIES, ...uniqueInDb]));
        return combined.sort();
    }, [items]);

    const filteredInventoryItems = React.useMemo(() => {
        let result = [...departmentItems];

        if (inventorySearch.trim()) {
            const q = inventorySearch.toLowerCase();
            result = result.filter(i => 
                i.name.toLowerCase().includes(q) || 
                i.description?.toLowerCase().includes(q) ||
                getItemCategories(i).some(cat => cat.toLowerCase().includes(q)) ||
                channels.find(c => c.id === i.channelId)?.name.toLowerCase().includes(q)
            );
        }

        if (categoryFilter !== 'all') {
            if (categoryFilter === 'uncategorized') {
                result = result.filter(i => getItemCategories(i).length === 0);
            } else {
                result = result.filter(i => getItemCategories(i).includes(categoryFilter));
            }
        }

        if (statusFilter !== 'all') {
            result = result.filter(i => i.status === statusFilter);
        }

        if (roomFilter !== 'all') {
            result = result.filter(i => i.channelId === roomFilter);
        }

        return result;
    }, [departmentItems, inventorySearch, categoryFilter, statusFilter, roomFilter, channels]);

    const departmentHistory = React.useMemo(() => {
        if (!assignedDepartmentId) return borrowHistory;
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems, assignedDepartmentId]);

    const filteredHistory = React.useMemo(() => {
        let result = [...departmentHistory];
        if (historyStatusFilter !== 'all') {
            result = result.filter(h => h.status === historyStatusFilter);
        }
        if (historySearch.trim()) {
            const q = historySearch.toLowerCase();
            result = result.filter(h => 
                h.studentName.toLowerCase().includes(q) || 
                h.itemName.toLowerCase().includes(q)
            );
        }
        return result;
    }, [departmentHistory, historyStatusFilter, historySearch]);

    const pendingStudentRequests = React.useMemo(() => {
        return studentDepartmentAccessRequests.filter(req => (!assignedDepartmentId || req.departmentId === assignedDepartmentId));
    }, [studentDepartmentAccessRequests, assignedDepartmentId]);

    const filteredAccessRequests = React.useMemo(() => {
        let result = pendingStudentRequests;
        if (accessRequestStatus !== 'all') {
            result = result.filter(req => req.status === accessRequestStatus);
        }
        if (accessSearch.trim()) {
            const q = accessSearch.toLowerCase();
            result = result.filter(req => 
                req.studentName.toLowerCase().includes(q) || 
                req.departmentName.toLowerCase().includes(q)
            );
        }
        return result;
    }, [pendingStudentRequests, accessRequestStatus, accessSearch]);

    const usersToDisplay = React.useMemo(() => {
        if (usersSubView === 'all') return allUsers;
        return allUsers.filter(u => u.role === usersSubView);
    }, [usersSubView, allUsers]);

    const filteredAuditLogs = React.useMemo(() => {
        let result = [...activityLogs];
        if (auditActorFilter !== 'all') {
            result = result.filter(log => log.userId === auditActorFilter);
        }
        if (auditActionFilter !== 'all') {
            result = result.filter(log => log.action === auditActionFilter);
        }
        if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            result = result.filter(log => 
                log.userName.toLowerCase().includes(q) || 
                log.details.toLowerCase().includes(q) ||
                log.action.toLowerCase().includes(q)
            );
        }
        return result;
    }, [activityLogs, auditActorFilter, auditActionFilter, auditSearch]);

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
        
        let finalChannelId = formData.get("channelId") as string;
        if (finalChannelId === 'unassigned') finalChannelId = "";

        const itemData: Partial<InventoryItem> = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: finalChannelId,
            status: formData.get("status") as ItemStatus,
            categories: selectedCategories,
            imageUrl: formImageUrl,
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

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    }

    const addCustomCategory = () => {
        const cat = customCategoryInput.trim()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        
        if (cat && !selectedCategories.includes(cat)) {
            setSelectedCategories(prev => [...prev, cat]);
            setCustomCategoryInput('');
        }
    }

    const closeForm = () => {
        setEditingItem(null);
        setIsFormOpen(false);
        setSelectedCategories([]);
        setCustomCategoryInput('');
        setFormImageUrl('');
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

    const handleReservationApproval = async (reservationId: string, newStatus: 'Reserved' | 'Denied') => {
        if (!firestore) return;
        const recordsToUpdate = borrowHistory.filter(h => h.reservationId === reservationId && h.status === 'Pending');
        if (recordsToUpdate.length === 0) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'This reservation is no longer pending.' });
            return;
        }

        try {
            const batch = writeBatch(firestore);
            recordsToUpdate.forEach(record => {
                batch.update(doc(firestore, 'borrowing_transactions', record.id), { status: newStatus });
            });
            await batch.commit();

            createActivityLog(
                firestore,
                user?.uid || 'sys',
                userProfile?.displayName || 'Supervisor',
                newStatus === 'Reserved' ? 'Approved Reservation' : 'Rejected Reservation',
                `${newStatus === 'Reserved' ? 'Approved' : 'Rejected'} reservation ${reservationId} for ${recordsToUpdate[0].studentName}`,
                'Transaction'
            );

            toast({ title: `Reservation ${newStatus === 'Reserved' ? 'Approved' : 'Rejected'}` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error' });
        }
    };

    const navItems = [
        { id: 'dashboard' as SupervisorView, label: 'Dashboard', icon: <LayoutGrid />, description: 'Overview of laboratory performance and status.' },
        { id: 'scanner' as SupervisorView, label: 'QR Scanner', icon: <QrCode />, description: 'Process checkouts and returns instantly.' },
        { id: 'inventory' as SupervisorView, label: 'Inventory', icon: <Package />, description: 'Manage and classify laboratory assets.' },
        { id: 'transactions' as SupervisorView, label: 'Active Transactions', icon: <PackageOpen />, description: 'Monitor items currently in use.' },
        { id: 'accessRequests' as SupervisorView, label: 'Access Requests', icon: <KeyRound />, description: 'Manage teacher and student access permissions.' },
        { id: 'history' as SupervisorView, label: 'History', icon: <HistoryIcon />, description: 'Review past borrowing activities.' },
        { id: 'damaged' as SupervisorView, label: 'Maintenance Reports', icon: <AlertTriangle />, description: 'Track malfunctioning or broken materials.' },
        { id: 'users' as SupervisorView, label: 'User Directory', icon: <Users />, description: 'Manage laboratory staff and teachers.' },
        { id: 'platformLogs' as SupervisorView, label: 'Audit Logs', icon: <FileText />, description: 'System-wide activity logs for security.' },
    ];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "secondary" | "destructive" | "outline" | "default"> = { 
            "Available": "secondary", 
            "Borrowed": "destructive", 
            "Locked": "outline", 
            "Pending Receipt": "outline", 
            "Inaccurate": "destructive", 
            "Returning": "outline",
            "Approved": "default",
            "Returned": "secondary",
            "Denied": "destructive",
            "Cancelled": "outline"
        };
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    }

    const renderContent = () => {
        switch (activeView) {
            case 'scanner': return <div className="animate-in fade-in duration-500"><QrScannerView /></div>;
            case 'dashboard': {
                 const totalItems = departmentItems.length;
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const activeBorrows = departmentHistory.filter(h => h.status === 'Active');
                 const borrowedCount = activeBorrows.length;
                 
                 const categoryCounts = departmentItems.reduce((acc, item) => {
                    const cats = getItemCategories(item);
                    if (cats.length === 0) acc['Uncategorized'] = (acc['Uncategorized'] || 0) + 1;
                    else cats.forEach(cat => acc[cat] = (acc[cat] || 0) + 1);
                    return acc;
                 }, {} as Record<string, number>);

                 const lowStockItems = departmentItems.filter(i => i.quantity > 0 && i.quantity < LOW_STOCK_THRESHOLD);
                 const pendingReservations = departmentHistory.filter(h => h.status === 'Pending' && h.reservationId);
                 const pendingAccess = studentDepartmentAccessRequests.filter(req => req.status === 'pending');
                 const maintenanceCount = departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').length;

                return (
                     <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl font-bold font-headline tracking-tight text-white">Inventory Oversight</h2>
                            <p className="text-muted-foreground">Status summary for {assignedDepartment?.name || 'All Labs'}.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Items</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalItems}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Categories</CardTitle><Tags className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{Object.keys(categoryCounts).length}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Available Stock</CardTitle><PackageOpen className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currently Borrowed</CardTitle><Activity className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{borrowedCount}</div></CardContent></Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="md:col-span-2 space-y-6">
                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader><CardTitle className="text-lg font-headline">Pending Actions</CardTitle><CardDescription>System tasks requiring attention.</CardDescription></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div onClick={() => setActiveView('accessRequests')} className="p-4 rounded-xl bg-black/20 border border-border/50 cursor-pointer hover:bg-black/40 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500"><KeyRound className="h-5 w-5"/></div><div><p className="text-sm font-bold">Access Requests</p><p className="text-xs text-muted-foreground">{pendingAccess.length} Pending</p></div></div><ChevronRight className="h-4 w-4 opacity-30"/>
                                        </div>
                                        <div onClick={() => setActiveView('transactions')} className="p-4 rounded-xl bg-black/20 border border-border/50 cursor-pointer hover:bg-black/40 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Calendar className="h-5 w-5"/></div><div><p className="text-sm font-bold">Reservations</p><p className="text-xs text-muted-foreground">{Array.from(new Set(pendingReservations.map(r=>r.reservationId))).length} Queue</p></div></div><ChevronRight className="h-4 w-4 opacity-30"/>
                                        </div>
                                        <div onClick={() => setActiveView('transactions')} className="p-4 rounded-xl bg-black/20 border border-border/50 cursor-pointer hover:bg-black/40 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><PackageCheck className="h-5 w-5"/></div><div><p className="text-sm font-bold">Active Borrows</p><p className="text-xs text-muted-foreground">{borrowedCount} In Session</p></div></div><ChevronRight className="h-4 w-4 opacity-30"/>
                                        </div>
                                        <div onClick={() => setActiveView('damaged')} className="p-4 rounded-xl bg-black/20 border border-border/50 cursor-pointer hover:bg-black/40 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><AlertTriangle className="h-5 w-5"/></div><div><p className="text-sm font-bold">Maintenance</p><p className="text-xs text-muted-foreground">{maintenanceCount} Issues</p></div></div><ChevronRight className="h-4 w-4 opacity-30"/>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Category Breakdown</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                                            <div key={cat} className="flex items-center justify-between p-2 rounded bg-black/20">
                                                <span className={cn("text-sm", cat === 'Uncategorized' ? "text-amber-500 font-bold" : "text-white")}>{cat === 'Uncategorized' && "⚠ "}{cat}</span>
                                                <Badge variant="secondary">{count} items</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="bg-card/40 border-destructive/20 h-full">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            <CardTitle className="text-lg font-headline">Low Stock Alerts</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map(item => (
                                            <div key={item.id} onClick={() => { setEditingItem(item); setSelectedCategories(getItemCategories(item)); setFormImageUrl(item.imageUrl || ''); setIsFormOpen(true); }} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 cursor-pointer transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-black/40 overflow-hidden relative flex-shrink-0">
                                                        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <Package className="h-4 w-4 absolute inset-0 m-auto text-muted-foreground/30" />}
                                                    </div>
                                                    <span className="text-sm text-foreground group-hover:text-white transition-colors truncate max-w-[120px]">{item.name}</span>
                                                </div>
                                                <Badge variant="destructive" className="font-mono">{item.quantity} left</Badge>
                                            </div>
                                        )) : (
                                            <div className="text-center py-20 text-emerald-500 text-sm flex flex-col items-center gap-3 opacity-40">
                                                <CheckCircle className="h-12 w-12" /> All stock levels healthy.
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
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div><h2 className="text-2xl font-bold font-headline text-white">Inventory Management</h2><p className="text-muted-foreground">Manage and classify your laboratory assets.</p></div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={() => setIsAddChannelOpen(true)} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card/40 border border-border/50 rounded-xl">
                                <div className="md:col-span-2 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search name, room, description..." value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)} className="pl-10 bg-black/20" />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-black/20"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Available">Available</SelectItem><SelectItem value="Locked">Locked</SelectItem><SelectItem value="Borrowed">Borrowed</SelectItem></SelectContent>
                                </Select>
                                <Select value={roomFilter} onValueChange={setRoomFilter}>
                                    <SelectTrigger className="bg-black/20"><SelectValue placeholder="All Rooms" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Rooms</SelectItem>{channels.filter(c=>!assignedDepartmentId || c.departmentId===assignedDepartmentId).map(c=>(<SelectItem key={c.id} value={c.id}>{c.name.replace('#','')}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Card className="bg-card/80 border-border/50">
                            <CardContent className="p-0 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow>
                                        <TableHead className="w-16">Preview</TableHead>
                                        <TableHead>Name</TableHead><TableHead>Categories</TableHead><TableHead>Room</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {filteredInventoryItems.length > 0 ? filteredInventoryItems.map(item => (
                                            <TableRow key={item.id} className="hover:bg-white/[0.02] transition-colors border-border/40">
                                                <TableCell>
                                                    <div className="h-10 w-10 rounded-md bg-black/40 border border-border/50 overflow-hidden relative">
                                                        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <ImageIcon className="h-4 w-4 absolute inset-0 m-auto text-muted-foreground/30" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-white max-w-[200px] truncate" title={item.name}>{item.name}</TableCell>
                                                <TableCell><div className="flex flex-wrap gap-1">
                                                    {getItemCategories(item).length > 0 ? getItemCategories(item).map(cat => (<Badge key={cat} variant="outline" className="text-[9px] py-0">{cat}</Badge>)) : <span className="text-[10px] text-amber-500 font-bold">⚠ Uncategorized</span>}
                                                </div></TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{channels.find(c=>c.id===item.channelId)?.name.replace('#','') || <span className="italic opacity-30">Unassigned</span>}</TableCell>
                                                <TableCell className="font-mono font-bold">{item.quantity}</TableCell>
                                                <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setSelectedCategories(getItemCategories(item)); setFormImageUrl(item.imageUrl || ''); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger>
                                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle><AlertDialogDescription>Permanent removal of {item.name}.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">No assets found matching the criteria.</SelectItem></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'transactions': {
                const pendingReservations = departmentHistory.filter(h => h.status === 'Pending' && h.reservationId);
                const groupedPending: { [id: string]: { studentName: string, items: string[], totalQty: number, date: string, startTime?: string, endTime?: string, type?: string } } = {};
                pendingReservations.forEach(r => {
                    if (!r.reservationId) return;
                    if (!groupedPending[r.reservationId]) {
                        groupedPending[r.reservationId] = { studentName: r.studentName, items: [], totalQty: 0, date: r.date, startTime: r.startTime, endTime: r.endTime, type: r.borrowingType };
                    }
                    groupedPending[r.reservationId].items.push(r.itemName);
                    groupedPending[r.reservationId].totalQty += (r.itemQuantity || 1);
                });

                const activeBorrows = departmentHistory.filter(h => h.status === 'Active');
                const dueToday = activeBorrows.filter(h => h.endTime && isToday(parseISO(h.date))); // Rough check
                const overdue = activeBorrows.filter(h => h.date && isPast(parseISO(h.date)) && !isToday(parseISO(h.date)));

                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pending Reservations</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{Object.keys(groupedPending).length}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Borrows</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{activeBorrows.length}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Due Today</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-blue-500">{dueToday.length}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overdue</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-destructive">{overdue.length}</div></CardContent></Card>
                        </div>

                        <Card className="bg-card/80 border-border/50 overflow-hidden">
                            <CardHeader className="border-b border-border/40 bg-white/[0.02]"><CardTitle>Reservation Requests</CardTitle><CardDescription>Queued scheduling requests requiring approval.</CardDescription></CardHeader>
                            <CardContent className="p-0 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Borrower</TableHead><TableHead>Requested Items</TableHead><TableHead>Qty</TableHead><TableHead>Schedule</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(groupedPending).map(([resId, data]) => (
                                            <TableRow key={resId} className="border-border/40">
                                                <TableCell className="text-white font-medium">{data.studentName}</TableCell>
                                                <TableCell className="max-w-[250px] truncate text-xs">{data.items.join(', ')}</TableCell>
                                                <TableCell className="font-mono text-xs">{data.totalQty}</TableCell>
                                                <TableCell className="text-xs font-mono">{format(new Date(data.date), 'MMM d')} | {data.startTime}-{data.endTime}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-[10px]">{data.type || 'Individual'}</Badge></TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" variant="secondary" onClick={() => handleReservationApproval(resId, 'Reserved')} className="h-8">Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleReservationApproval(resId, 'Denied')} className="h-8">Reject</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {Object.keys(groupedPending).length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No pending reservation requests found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/80 border-border/50 overflow-hidden">
                            <CardHeader className="border-b border-border/40 bg-white/[0.02]"><CardTitle>Active Borrowing Sessions</CardTitle><CardDescription>Current material sessions in rotation.</CardDescription></CardHeader>
                            <CardContent className="p-0 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Borrower</TableHead><TableHead>Items</TableHead><TableHead>Checkout Time</TableHead><TableHead>Schedule</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {activeBorrows.length > 0 ? activeBorrows.map(r => (
                                            <TableRow key={r.id} className="border-border/40">
                                                <TableCell className="text-white font-medium">{r.studentName}</TableCell>
                                                <TableCell className="text-xs">{r.itemName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(r.date), 'MMM d, p')}</TableCell>
                                                <TableCell className="text-xs font-mono">{r.startTime && r.endTime ? `${r.startTime}-${r.endTime}` : 'No fixed end'}</TableCell>
                                                <TableCell>{getStatusBadge('Active')}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No active sessions found.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            }
            case 'accessRequests':
                return (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h2 className="text-2xl font-bold font-headline text-white">Laboratory Access Queue</h2><p className="text-muted-foreground">Manage user permissions for departmental resources.</p></div>
                            <Tabs value={accessRequestStatus} onValueChange={setAccessRequestStatus} className="w-auto">
                                <TabsList className="bg-black/20"><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="denied">Rejected</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
                            </Tabs>
                        </div>

                        <Card className="bg-card/80 border-border/50">
                            <CardHeader className="p-6 bg-white/[0.01] border-b border-border/40">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search student or department..." value={accessSearch} onChange={e=>setAccessSearch(e.target.value)} className="pl-10 bg-black/20" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Student Name</TableHead><TableHead>Requested Facility</TableHead><TableHead>Request Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredAccessRequests.length > 0 ? filteredAccessRequests.map(req => (
                                            <TableRow key={req.id} className="border-border/40">
                                                <TableCell className="text-white font-medium">{req.studentName}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{req.departmentName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(req.requestedAt), 'MMM d, yyyy')}</TableCell>
                                                <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    {req.status === 'pending' && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" onClick={()=>handleStudentAccessRequest(req.id, 'approved')} className="h-8 bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                                                            <Button size="sm" variant="destructive" onClick={()=>handleStudentAccessRequest(req.id, 'denied')} className="h-8">Deny</Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={5} className="h-64 text-center text-muted-foreground italic flex flex-col items-center justify-center gap-2">
                                            <KeyRound className="h-8 w-8 opacity-20" />
                                            <div>
                                                <p className="font-semibold">No access requests match the selected criteria.</p>
                                                <p className="text-xs">New student access requests will appear here once submitted.</p>
                                            </div>
                                        </TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'history': {
                const returnedCount = departmentHistory.filter(h=>h.status==='Returned').length;
                const cancelledCount = departmentHistory.filter(h=>h.status==='Cancelled').length;
                const approvedCount = departmentHistory.filter(h=>h.status==='Approved').length;

                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{departmentHistory.length}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Returned</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-emerald-500">{returnedCount}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cancelled</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-muted-foreground">{cancelledCount}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Approved</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-blue-500">{approvedCount}</div></CardContent></Card>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card/40 border border-border/50 rounded-xl">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search student or item..." value={historySearch} onChange={e=>setHistorySearch(e.target.value)} className="pl-10 bg-black/20" />
                                </div>
                                <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                                    <SelectTrigger className="bg-black/20"><SelectValue placeholder="All History" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem><SelectItem value="Returned">Returned</SelectItem><SelectItem value="Denied">Denied</SelectItem></SelectContent>
                                </Select>
                            </div>

                            <Card className="bg-card/80 border-border/50 overflow-hidden">
                                <CardContent className="p-0 max-h-[60vh] overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Final Status</TableHead><TableHead className="text-right">Execution Date</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {filteredHistory.length > 0 ? filteredHistory.map(h => (
                                                <TableRow key={h.id} className="border-border/40 hover:bg-white/[0.01]">
                                                    <TableCell className="text-white font-medium">{h.studentName}</TableCell>
                                                    <TableCell className="text-xs">{h.itemName}</TableCell>
                                                    <TableCell>{getStatusBadge(h.status)}</TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground font-mono">{format(new Date(h.date), 'MMM d, p')}</TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No historical records found matching the filter.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                );
            }
            case 'damaged': {
                 const issues = departmentHistory.filter(h => h.returnCondition && h.returnCondition !== 'Good');
                 const reportedCount = issues.filter(i=>!i.resolutionStatus || i.resolutionStatus==='Pending').length;
                 const resolvedCount = issues.filter(i=>i.resolutionStatus==='Resolved').length;
                 const lostCount = issues.filter(i=>i.returnCondition==='Lost').length;

                 return (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col gap-1"><h2 className="text-2xl font-bold font-headline text-white">Damage & Maintenance Reports</h2><p className="text-muted-foreground">Manage hardware integrity and resolution flows.</p></div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reported Issues</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-amber-500">{reportedCount}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resolved</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-emerald-500">{resolvedCount}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lost Items</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-destructive">{lostCount}</div></CardContent></Card>
                            <Card className="bg-card/40 border-border/50"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Sessions</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-white">{departmentHistory.filter(h=>h.status==='Active').length}</div></CardContent></Card>
                        </div>

                        <Card className="bg-card/80 border-border/50">
                            <CardContent className="p-6 overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Item Name</TableHead><TableHead>Reported By</TableHead><TableHead>Issue Type</TableHead><TableHead>Date Reported</TableHead><TableHead>Current Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {issues.length > 0 ? issues.map(h => (
                                            <TableRow key={h.id} className="border-border/40">
                                                <TableCell className="text-white font-medium">{h.itemName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{h.studentName}</TableCell>
                                                <TableCell><Badge variant="outline" className={cn("text-[10px]", h.returnCondition==='Lost' ? "text-destructive border-destructive/30" : "text-amber-500 border-amber-500/30")}>{h.returnCondition}</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(h.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell>{h.resolutionStatus === 'Resolved' ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Resolved</Badge> : <Badge variant="outline" className="text-amber-500 border-amber-500/20">Reported</Badge>}</TableCell>
                                                <TableCell className="text-right">
                                                    {(!h.resolutionStatus || h.resolutionStatus === 'Pending') && (
                                                        <Button size="sm" variant="ghost" onClick={async () => {
                                                            if (!firestore) return;
                                                            await updateDoc(doc(firestore, 'borrowing_transactions', h.id), { resolutionStatus: 'Resolved' });
                                                            toast({ title: "Issue Marked as Resolved" });
                                                        }} className="text-emerald-500 hover:text-emerald-400">Resolve</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={6} className="h-64 text-center text-muted-foreground italic flex flex-col items-center justify-center gap-2">
                                            <AlertTriangle className="h-8 w-8 opacity-20" />
                                            <div>
                                                <p className="font-semibold">No maintenance reports found.</p>
                                                <p className="text-xs">Damage, lost item, and repair reports will appear here for supervisor review.</p>
                                            </div>
                                        </TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            }
            case 'platformLogs':
                const actors = Array.from(new Set(activityLogs.map(l=>l.userId))).map(uid => ({ id: uid, name: activityLogs.find(l=>l.userId===uid)?.userName || 'Unknown' }));
                const actionTypes = Array.from(new Set(activityLogs.map(l=>l.action)));

                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="flex flex-col gap-1"><h2 className="text-2xl font-bold font-headline text-white">Platform Audit Logs</h2><p className="text-muted-foreground">Forensic trail of system activities and administrative changes.</p></div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card/40 border border-border/50 rounded-xl">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search user, action, details..." value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} className="pl-10 bg-black/20" /></div>
                            <Select value={auditActorFilter} onValueChange={setAuditActorFilter}><SelectTrigger className="bg-black/20"><SelectValue placeholder="All Actors" /></SelectTrigger><SelectContent><SelectItem value="all">All Actors</SelectItem>{actors.map(a=>(<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select>
                            <Select value={auditActionFilter} onValueChange={setAuditActionFilter}><SelectTrigger className="bg-black/20"><SelectValue placeholder="All Actions" /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{actionTypes.map(at=>(<SelectItem key={at} value={at}>{at}</SelectItem>))}</SelectContent></Select>
                        </div>

                        <Card className="bg-card/80 border-border/50 overflow-hidden">
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0"><TableRow><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Operational Details</TableHead><TableHead className="text-right">Execution Time</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredAuditLogs.map(log => {
                                            const getActionColor = (action: string) => {
                                                if (action.includes('Updated')) return "text-blue-400 border-blue-500/30 bg-blue-500/5";
                                                if (action.includes('Approved')) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
                                                if (action.includes('Deleted')) return "text-destructive border-destructive/30 bg-destructive/5";
                                                if (action.includes('Created')) return "text-purple-400 border-purple-500/30 bg-purple-500/5";
                                                if (action.includes('Denied')) return "text-destructive border-destructive/30 bg-destructive/5";
                                                if (action.includes('Returned')) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
                                                return "text-muted-foreground border-muted-foreground/30 bg-muted-foreground/5";
                                            };
                                            return (
                                                <TableRow key={log.id} className="border-border/40">
                                                    <TableCell className="text-white font-medium">{log.userName}</TableCell>
                                                    <TableCell><Badge variant="outline" className={cn("text-[10px] font-bold", getActionColor(log.action))}>{log.action}</Badge></TableCell>
                                                    <TableCell className="max-w-md truncate text-muted-foreground text-xs">{log.details}</TableCell>
                                                    <TableCell className="text-right flex items-center justify-end gap-3 h-full">
                                                        <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(log.timestamp), 'MMM d, p')}</span>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=>setSelectedLog(log)}><ExternalLink className="h-3 w-3"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40">
                                <div><CardTitle className="text-white">User Directory</CardTitle><CardDescription>Manage laboratory staff and associated teachers.</CardDescription></div>
                                <Button onClick={() => setIsCreateUserOpen(true)} size="sm"><UserPlus className="mr-2 h-4 w-4" /> New User</Button>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead>Display Name</TableHead> <TableHead>Role Assignment</TableHead><TableHead className="text-right">Account Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>{usersToDisplay.map(u => (
                                        <TableRow key={u.id} className="border-border/40">
                                            <TableCell className="text-white font-medium">{u.displayName}</TableCell>
                                            <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary border-none">{u.role}</Badge></TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUserToEdit(u); setIsEditUserRoleOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(u)} disabled={u.id === user?.uid}><Trash className="h-4 w-4"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            default: return null;
        }
    };

    if (isUserLoading || !user) return <div className="flex h-dvh items-center justify-center bg-[#1e2430]"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <TooltipProvider delayDuration={500}>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
                <div className={cn(
                    "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full group/sidebar",
                    isSidebarCollapsed ? "w-[72px]" : "w-[280px]"
                )}>
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className={cn(
                            "flex items-center gap-3 p-4 border-b border-border/50 transition-all duration-300",
                            isSidebarCollapsed ? "justify-center" : "justify-start px-6"
                        )}>
                            <Logo />
                            {!isSidebarCollapsed && (
                                <span className="font-headline text-lg font-bold tracking-tighter text-white animate-in fade-in duration-500">ORBIT</span>
                            )}
                        </div>

                        <div className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-none px-3">
                            {!isSidebarCollapsed && (
                                <h2 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-in fade-in duration-500">
                                    Laboratory Control
                                </h2>
                            )}
                            <ul className="space-y-1">
                                {navItems.map(item => (
                                    <li key={item.id}>
                                        <Tooltip>
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
                                                <TooltipContent side="right" sideOffset={10} className="font-medium bg-popover border-border">
                                                    {item.label}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-3 border-t border-border/50 bg-[#0e1015]">
                            <div className={cn("flex items-center justify-between gap-2", isSidebarCollapsed && "flex-col")}>
                                <UserProfileModal role="Supervisor">
                                    <div className={cn(
                                        "flex items-center gap-3 cursor-pointer p-2 hover:bg-accent rounded-lg transition-colors flex-1 min-w-0",
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
                                {!isSidebarCollapsed && (
                                    <UserNav role="Supervisor" />
                                )}
                            </div>
                        </div>
                    </div>

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
                                    <Button variant="ghost" size="icon" className="md:hidden text-white"><Menu /></Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="bg-[#141821] p-0 border-none">
                                    <div className="p-4 font-bold border-b border-border/50 text-white flex items-center gap-2"><Logo className="h-6 w-6"/> Navigation</div>
                                    <div className="p-2 space-y-1">
                                        {navItems.map(i=>(
                                            <Button 
                                                key={i.id} 
                                                variant={activeView === i.id ? 'secondary' : 'ghost'} 
                                                className="w-full justify-start gap-2 text-white" 
                                                onClick={()=> {setActiveView(i.id); setIsMobileMenuOpen(false);}}
                                            >
                                                {i.icon} <span>{i.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </SheetContent>
                            </Sheet>
                            
                            <h1 className="font-headline text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                {navItems.find(i=>i.id===activeView)?.icon}
                                <span>{navItems.find(i=>i.id===activeView)?.label}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">
                                {userProfile?.role || 'Lab Supervisor'}
                            </Badge>
                            <UserNav role="Supervisor" />
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto">
                        {renderContent()}
                    </div>
                </main>

                <CreateUserForm open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen} roleToCreate="Supervisor" />
                <AddDepartmentForm open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen} />
                <AddChannelForm open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} department={assignedDepartment || departments[0] || null} />
                <EditUserRoleDialog open={isEditUserRoleOpen} onOpenChange={setIsEditUserRoleOpen} user={userToEdit} />
                
                <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader><DialogTitle className="text-white">Inaccuracy Report: {rejectItem?.name}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Issue Category</Label>
                                <RadioGroup value={rejectReasonType} onValueChange={(v) => setRejectReasonType(v as any)} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="damaged" id="rej-damaged" /><Label htmlFor="rej-damaged" className="text-white">Damaged</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="not-functioning" id="rej-func" /><Label htmlFor="rej-func" className="text-white">Not Functioning</Label></div>
                                </RadioGroup>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reject-desc" className="text-muted-foreground">Detailed Description</Label>
                                <Textarea id="reject-desc" placeholder="Please provide specifics about the item's condition..." value={rejectDescription} onChange={(e) => setRejectDescription(e.target.value)} className="bg-black/20 border-border" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReasonType || !rejectDescription.trim()}>Report Inaccuracy</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent className="bg-card border-border max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white">Edit Inventory Item</DialogTitle>
                            <DialogDescription>Modify details and multi-category classification for laboratory assets.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label className="text-muted-foreground">Item Name</Label><Input name="name" defaultValue={editingItem?.name} required className="bg-black/20 border-border text-white" /></div>
                            
                            <div className="grid gap-2">
                                <Label className="text-muted-foreground">Image URL</Label>
                                <Input value={formImageUrl} onChange={e=>setFormImageUrl(e.target.value)} placeholder="https://..." className="bg-black/20 border-border text-white" />
                                {formImageUrl && (
                                    <div className="mt-2 h-32 w-full rounded-md border border-border/50 overflow-hidden relative bg-black/40">
                                        <Image src={formImageUrl} alt="Preview" fill className="object-contain" />
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3">
                                <Label className="text-muted-foreground">Inventory Classifications (Categories)</Label>
                                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-black/20 border border-border/50">
                                    {availableCategories.map(cat => (
                                        <div key={cat} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`cat-${cat}`} 
                                                checked={selectedCategories.includes(cat)} 
                                                onCheckedChange={() => toggleCategory(cat)}
                                            />
                                            <Label htmlFor={`cat-${cat}`} className="text-xs cursor-pointer text-white/90">{cat}</Label>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Input 
                                        value={customCategoryInput}
                                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                                        placeholder="New custom category..."
                                        className="bg-black/20 border-border h-8 text-xs"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
                                    />
                                    <Button type="button" variant="secondary" size="sm" className="h-8 px-3" onClick={addCustomCategory}>
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Items can belong to multiple categories simultaneously.</p>
                            </div>

                            <div className="grid gap-2"><Label className="text-muted-foreground">Description</Label><Textarea name="description" defaultValue={editingItem?.description} className="bg-black/20 border-border text-white min-h-[80px]" /></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Select name="status" defaultValue={editingItem?.status}>
                                        <SelectTrigger className="bg-black/20 border-border text-white"><SelectValue/></SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Locked">Locked</SelectItem>
                                            <SelectItem value="Inaccurate">Inaccurate</SelectItem>
                                            <SelectItem value="Borrowed">Borrowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-muted-foreground">Assign to Room</Label>
                                    <Select name="channelId" defaultValue={editingItem?.channelId || "unassigned"}>
                                        <SelectTrigger className="bg-black/20 border-border text-white">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {channels.filter(c => c.departmentId === assignedDepartmentId).map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name.replace('#', '')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="mt-4 pt-4 border-t border-border/40">
                                <Button type="button" variant="ghost" onClick={closeForm} className="text-white">Cancel</Button>
                                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white px-8">Save Record</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!selectedLog} onOpenChange={open=>!open && setSelectedLog(null)}>
                    <DialogContent className="max-w-2xl bg-card border-border">
                        <DialogHeader><DialogTitle className="text-white">Log Details</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Execution Time</Label><p className="text-sm">{selectedLog?.timestamp && format(new Date(selectedLog.timestamp), 'PPP p')}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Actor</Label><p className="text-sm">{selectedLog?.userName}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Action Type</Label><p className="text-sm font-bold">{selectedLog?.action}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Category</Label><Badge variant="secondary">{selectedLog?.category}</Badge></div>
                            </div>
                            <Separator className="bg-border/30" />
                            <div><Label className="text-xs text-muted-foreground">Operational Payload / Details</Label><div className="mt-2 p-4 rounded-lg bg-black/40 border border-border/50 text-sm font-mono leading-relaxed whitespace-pre-wrap">{selectedLog?.details}</div></div>
                        </div>
                        <DialogFooter><Button onClick={()=>setSelectedLog(null)}>Close Trace</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
