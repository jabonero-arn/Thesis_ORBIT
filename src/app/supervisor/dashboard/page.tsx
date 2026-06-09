
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon, PlusCircle,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List, AlertTriangle, CheckCircle, KeyRound, QrCode, FileText, UserPlus, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, UserCircle, Clock, Filter, Tags, Plus
} from "lucide-react"
import { format } from "date-fns"
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

// Helper to safely get categories from an item
const getItemCategories = (item: InventoryItem): string[] => {
    if (Array.isArray(item.categories)) return item.categories;
    if (item.category) return [item.category];
    return [];
}

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
        if (isUserLoading || isProfileLoading || !user || !userProfile) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    const [activeView, setActiveView] = React.useState<SupervisorView>('dashboard');
    const [usersSubView, setUsersSubView] = React.useState<'all' | Role>('all');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [customCategoryInput, setCustomCategoryInput] = React.useState('');

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
        if (categoryFilter === 'all') return departmentItems;
        if (categoryFilter === 'uncategorized') return departmentItems.filter(i => getItemCategories(i).length === 0);
        return departmentItems.filter(i => getItemCategories(i).includes(categoryFilter));
    }, [departmentItems, categoryFilter]);

    const departmentHistory = React.useMemo(() => {
        if (!assignedDepartmentId) return borrowHistory;
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems, assignedDepartmentId]);

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
        
        let finalChannelId = formData.get("channelId") as string;
        if (finalChannelId === 'unassigned') finalChannelId = "";

        const itemData: Partial<InventoryItem> = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            channelId: finalChannelId,
            status: formData.get("status") as ItemStatus,
            categories: selectedCategories,
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

    const navItems = [
        { id: 'dashboard' as SupervisorView, label: 'Dashboard', icon: <LayoutGrid />, description: 'Overview of laboratory performance and status.' },
        { id: 'scanner' as SupervisorView, label: 'QR Scanner', icon: <QrCode />, description: 'Process checkouts and returns instantly.' },
        { id: 'inventory' as SupervisorView, label: 'Inventory', icon: <Package />, description: 'Manage and categorize laboratory equipment.' },
        { id: 'transactions' as SupervisorView, label: 'Active Transactions', icon: <PackageOpen />, description: 'Monitor items currently in use.' },
        { id: 'accessRequests' as SupervisorView, label: 'Access Requests', icon: <KeyRound />, description: 'Manage teacher and student access permissions.' },
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
                 const totalItems = departmentItems.length;
                 const uncategorizedItems = departmentItems.filter(i => getItemCategories(i).length === 0);
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const activeHistory = departmentHistory.filter(h => h.status === 'Active');
                 const borrowedCount = activeHistory.length;
                 
                 const categoryCounts = departmentItems.reduce((acc, item) => {
                    const cats = getItemCategories(item);
                    if (cats.length === 0) {
                        acc['Uncategorized'] = (acc['Uncategorized'] || 0) + 1;
                    } else {
                        cats.forEach(cat => {
                            acc[cat] = (acc[cat] || 0) + 1;
                        });
                    }
                    return acc;
                 }, {} as Record<string, number>);

                 const lowStockItems = departmentItems.filter(i => i.quantity > 0 && i.quantity < LOW_STOCK_THRESHOLD);
                 const recentActivity = activityLogs.slice(0, 5);

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
                            <Card className="bg-card/40 backdrop-blur-md border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Borrowed</CardTitle><Activity className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-3xl font-bold text-white">{borrowedCount}</div></CardContent></Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-6">
                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /> Category Breakdown</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).map(([cat, count]) => (
                                            <div key={cat} className="flex items-center justify-between p-2 rounded bg-black/20">
                                                <span className={cn("text-sm", cat === 'Uncategorized' ? "text-amber-500 font-bold" : "text-white")}>
                                                    {cat === 'Uncategorized' && "⚠ "}{cat}
                                                </span>
                                                <Badge variant="secondary">{count} items</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {uncategorizedItems.length > 0 && (
                                    <Card className="bg-card/40 border-amber-500/20 bg-amber-500/5">
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                <CardTitle className="text-lg font-headline">Pending Categorization</CardTitle>
                                            </div>
                                            <CardDescription>These items require classification for better tracking.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {uncategorizedItems.slice(0, 5).map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-2 rounded bg-black/20 border border-amber-500/10">
                                                    <span className="text-sm">{item.name}</span>
                                                    <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setSelectedCategories(getItemCategories(item)); setIsFormOpen(true); }}>Classify</Button>
                                                </div>
                                            ))}
                                            <Button variant="link" className="w-full text-xs text-amber-500 h-auto p-0 pt-2" onClick={() => { setCategoryFilter('uncategorized'); setActiveView('inventory'); }}>View all uncategorized items</Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className="space-y-6">
                                <Card className="bg-card/40 border-destructive/20">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            <CardTitle className="text-lg font-headline">Low Stock Alerts</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/10">
                                                <span className="text-sm text-foreground">{item.name}</span>
                                                <Badge variant="destructive" className="font-mono">{item.quantity} left</Badge>
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-emerald-500 text-sm flex items-center justify-center gap-2">
                                                <CheckCircle className="h-4 w-4" /> All stock levels healthy.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/40 border-border/50">
                                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><HistoryIcon className="h-5 w-5 text-amber-500" /> Recent Activity</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {recentActivity.length > 0 ? recentActivity.map(log => (
                                                <div key={log.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{log.action}</p>
                                                            <span className="text-[10px] text-muted-foreground">{format(new Date(log.timestamp), 'MMM d, p')}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{log.details}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-center text-sm text-muted-foreground italic">No recent system events.</p>}
                                        </div>
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold font-headline text-white">Inventory Management</h2>
                                <p className="text-muted-foreground">Manage and classify your laboratory assets.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-card/40 border border-border/50 px-3 py-1.5 rounded-md">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="w-[180px] h-8 border-none bg-transparent focus:ring-0">
                                            <SelectValue placeholder="Filter by Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="uncategorized" className="text-amber-500 font-medium">⚠ Uncategorized</SelectItem>
                                            <Separator className="my-1" />
                                            {availableCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={() => setIsAddChannelOpen(true)} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                            </div>
                        </div>

                        <Card className="bg-card/80 border-border/50">
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Name</TableHead>
                                            <TableHead className="whitespace-nowrap">Categories</TableHead>
                                            <TableHead className="whitespace-nowrap">Lab / Room</TableHead>
                                            <TableHead className="whitespace-nowrap">Qty</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInventoryItems.length > 0 ? filteredInventoryItems.map(item => (
                                            <TableRow key={item.id} className="hover:bg-white/[0.02] transition-colors border-border/40">
                                                <TableCell className="font-medium whitespace-nowrap text-white">{item.name}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1">
                                                        {getItemCategories(item).length > 0 ? getItemCategories(item).map(cat => (
                                                            <Badge key={cat} variant="outline" className="font-normal border-primary/20 bg-primary/5 text-primary-foreground/90 py-0 h-5">
                                                                {cat}
                                                            </Badge>
                                                        )) : (
                                                            <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" /> Uncategorized
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {channels.find(c=>c.id===item.channelId)?.name.replace('#','') || <span className="italic opacity-50">Unassigned</span>}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-mono font-bold">{item.quantity}</TableCell>
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
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setSelectedCategories(getItemCategories(item)); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Permanent removal of {item.name}.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No items found matching the selected filter.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'transactions':
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader><CardTitle className="text-white">Active Borrowing Sessions</CardTitle></CardHeader>
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead className="whitespace-nowrap">Student Representative</TableHead><TableHead className="whitespace-nowrap">Item Description</TableHead><TableHead className="whitespace-nowrap">Session Start</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentHistory.filter(h => h.status === 'Active').map(r => (<TableRow key={r.id} className="border-border/40"><TableCell className="whitespace-nowrap text-white font-medium">{r.studentName}</TableCell><TableCell className="whitespace-nowrap">{r.itemName}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground font-mono">{format(new Date(r.date), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'history':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader><CardTitle className="text-white">Complete Transaction History</CardTitle></CardHeader>
                            <CardContent className="p-0 max-h-[75vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead>Student</TableHead> <TableHead>Item</TableHead><TableHead>Final Status</TableHead><TableHead className="text-right">Transaction Date</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentHistory.map(h => (<TableRow key={h.id} className="border-border/40 hover:bg-white/[0.01]"><TableCell className="text-white font-medium">{h.studentName}</TableCell><TableCell>{h.itemName}</TableCell><TableCell><Badge variant="outline" className="border-primary/20 text-primary-foreground/70">{h.status}</Badge></TableCell><TableCell className="text-right text-xs text-muted-foreground font-mono">{format(new Date(h.date), 'MMM d, p')}</TableCell></TableRow>))}</TableBody>
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
            case 'platformLogs':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader><CardTitle className="text-white">System Audit Logs</CardTitle><CardDescription>Forensic trail of all significant platform activities.</CardDescription></CardHeader>
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead>Actor</TableHead><TableHead>Action Taken</TableHead><TableHead>Operational Details</TableHead><TableHead className="text-right">Execution Time</TableHead></TableRow></TableHeader>
                                    <TableBody>{activityLogs.map(log => (<TableRow key={log.id} className="border-border/40">
                                        <TableCell className="text-white font-medium">{log.userName}</TableCell>
                                        <TableCell><Badge variant="outline" className="border-primary/30 text-primary">{log.action}</Badge></TableCell>
                                        <TableCell className="max-w-md truncate text-muted-foreground">{log.details}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground font-mono">{format(new Date(log.timestamp), 'MMM d, p')}</TableCell>
                                    </TableRow>))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'accessRequests':
                return (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader><CardTitle className="text-white">Laboratory Access Queue</CardTitle><CardDescription>Review and process pending student access permissions.</CardDescription></CardHeader>
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead>Student Name</TableHead> <TableHead>Department</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {pendingStudentRequests.length > 0 ? pendingStudentRequests.map(req => (
                                            <TableRow key={req.id} className="border-border/40">
                                                <TableCell className="text-white font-medium">{req.studentName}</TableCell>
                                                <TableCell className="text-muted-foreground">{req.departmentName}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button size="sm" onClick={()=>handleStudentAccessRequest(req.id, 'approved')} className="h-8 bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={()=>handleStudentAccessRequest(req.id, 'denied')} className="h-8">Deny</Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">No pending access requests.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'damaged':
                 return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-white">Equipment Maintenance Registry</CardTitle>
                                <CardDescription>Tracking hardware reported as inaccurate, damaged, or pending return to central storage.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[70vh] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-black/20 sticky top-0 z-10"><TableRow><TableHead>Equipment Name</TableHead><TableHead>Operational Status</TableHead><TableHead>Last Inspection</TableHead><TableHead className="text-right">Registry Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>{departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').length > 0 ? departmentItems.filter(i => i.status === 'Inaccurate' || i.status === 'Returning').map(item => (
                                        <TableRow key={item.id} className="border-border/40">
                                            <TableCell className="text-white font-medium">{item.name}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy') : 'Pending Initial Verification'}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => handleReturnToCustodian(item)} disabled={item.status === 'Returning'}><RotateCcw className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(item); setSelectedCategories(getItemCategories(item)); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">All department equipment is currently verified and functioning.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            default: return <div className="text-center py-20 text-muted-foreground">Select an operational module from the sidebar.</div>;
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
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
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
            </div>
        </TooltipProvider>
    )
}
