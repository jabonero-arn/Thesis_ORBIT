
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { 
    Package, Users, Hourglass, LayoutGrid, PackageOpen, History as HistoryIcon,
    Edit, Trash, PackageCheck, Cpu, FlaskConical, Cog, Menu,
    Shield, Activity, Loader2, Building, ClipboardCheck, Check, X, List
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
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, User as UserType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { InventoryGrid } from "@/components/inventory-grid"

type SupervisorView = 'dashboard' | 'inventory' | 'transactions' | 'history' | 'verification';

export default function SupervisorDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, channels, departments } = useAppContext();
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
      if (!isUserLoading && !user) {
        router.push("/login?role=supervisor")
      }
    }, [user, isUserLoading, router])
    
    React.useEffect(() => {
        if (!isProfileLoading && assignedDepartmentId === undefined && userProfile) {
             toast({
                variant: 'destructive',
                title: 'Assignment Error',
                description: "Your account has not been assigned to a department. Please contact the Primary Custodian."
            })
        }
    }, [userProfile, isProfileLoading, assignedDepartmentId, toast]);

    React.useEffect(() => {
        if (isUserLoading || isProfileLoading || !user) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    // View state
    const [activeView, setActiveView] = React.useState<SupervisorView>('verification');
    const [inventorySubView, setInventorySubView] = React.useState<'grid' | 'table'>('grid');
    const [verificationSubView, setVerificationSubView] = React.useState<'pending' | 'history'>('pending');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Data Filtering
    const departmentItems = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        const assignedChannelIds = new Set(assignedChannels.map(c => c.id));
        return items.filter(item => assignedChannelIds.has(item.channelId));
    }, [items, assignedChannels, assignedDepartmentId]);

    const departmentHistory = React.useMemo(() => {
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems]);

    // Handlers
    const handleViewChange = (view: SupervisorView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }
    
    const handleVerificationAction = async (itemId: string, newStatus: 'Available' | 'Inaccurate') => {
        if (!firestore) return;
        const itemDocRef = doc(firestore, "inventory_items", itemId);
        try {
            await updateDoc(itemDocRef, { status: newStatus, verifiedAt: new Date().toISOString() });
            toast({
                title: `Item ${newStatus === 'Available' ? 'Confirmed' : 'Flagged'}`,
                description: `The item status has been updated.`,
            });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };
    
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
        { id: 'verification', label: 'Verification', icon: <ClipboardCheck /> },
        { id: 'inventory', label: 'Department Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
    ];
    
    const VerificationView = () => {
        const pendingItems = departmentItems.filter(item => item.status === 'Pending Receipt');

        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle>Pending Item Verification</CardTitle>
                    <CardDescription>Confirm receipt of new items for your department.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Date Added</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Assigned Room</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingItems.length > 0 ? pendingItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" onClick={() => handleVerificationAction(item.id, 'Available')}>
                                            <Check className="mr-2 h-4 w-4"/> Confirm
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleVerificationAction(item.id, 'Inaccurate')}>
                                            <X className="mr-2 h-4 w-4"/> Inaccurate
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No items pending verification.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const VerificationHistoryView = () => {
        const processedItems = departmentItems.filter(item => item.status === 'Available' || item.status === 'Inaccurate' || item.status === 'Pending Receipt');
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle>Verification History</CardTitle>
                    <CardDescription>A log of items that are pending, received, or flagged as inaccurate.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Lab</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedItems.length > 0 ? processedItems.map(item => {
                                const dateToShow = item.status === 'Pending Receipt' ? item.createdAt : item.verifiedAt;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{dateToShow ? format(new Date(dateToShow), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell>
                                        <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {item.status === 'Available' && <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Received</Badge>}
                                            {item.status === 'Pending Receipt' && <Badge variant="outline">Pending</Badge>}
                                            {item.status === 'Inaccurate' && <Badge variant="destructive">Inaccurate</Badge>}
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No verification history.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard':
                 const totalItemTypes = departmentItems.length;
                 const totalStock = departmentItems.reduce((sum, item) => sum + item.quantity, 0);
                 const borrowedItemsCount = departmentHistory.filter(h => h.status === 'Active').length;
                 const reservedItemsCount = departmentHistory.filter(h => h.status === 'Approved').length;
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
            case 'verification':
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {verificationSubView === 'pending' ? <VerificationView /> : <VerificationHistoryView />}
                    </div>
                );
             case 'inventory':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {inventorySubView === 'grid' ? (
                            <InventoryGrid
                                items={departmentItems}
                                onItemSelect={() => {}}
                                selectedItems={[]}
                                isSelectionEnabled={false}
                            />
                        ) : (
                            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                                <CardHeader><div><CardTitle>Item List</CardTitle><CardDescription>A detailed list of all items in your department.</CardDescription></div></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Lab</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {departmentItems.length > 0 ? departmentItems.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No items found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );
            case 'transactions':
                const activeBorrows = departmentHistory.filter(h => h.status === 'Active');
                return (
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50"><CardHeader><CardTitle>Currently Borrowed Items</CardTitle><CardDescription>Items that are currently checked out from your department.</CardDescription></CardHeader>
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
                            <CardHeader><CardTitle>Full Transaction History</CardTitle><CardDescription>A complete log of all borrow requests and their statuses for your department.</CardDescription></CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{departmentHistory.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{format(new Date(r.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
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
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{assignedDepartment?.name || "Supervisor"}</div>
            <div className="p-2 space-y-1">
                {navItems.map(item => (
                  <Button key={item.id} variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleViewChange(item.id as SupervisorView)}>{item.icon} {item.label}</Button>
                ))}
            </div>
            {activeView === 'inventory' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VIEW OPTIONS</h2>
                    <div className="space-y-1">
                        <Button variant={inventorySubView === 'grid' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setInventorySubView('grid'); setIsMobileMenuOpen(false); }}>
                            <LayoutGrid /> Grid View
                        </Button>
                        <Button variant={inventorySubView === 'table' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setInventorySubView('table'); setIsMobileMenuOpen(false); }}>
                            <List /> Table View
                        </Button>
                    </div>
                </div>
            )}
             {activeView === 'verification' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">VERIFICATION</h2>
                    <div className="space-y-1">
                        <Button variant={verificationSubView === 'pending' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setVerificationSubView('pending'); setIsMobileMenuOpen(false); }}>
                            <ClipboardCheck /> Pending
                        </Button>
                        <Button variant={verificationSubView === 'history' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setVerificationSubView('history'); setIsMobileMenuOpen(false); }}>
                            <HistoryIcon /> History
                        </Button>
                    </div>
                </div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
              <div className="flex items-center justify-between p-2">
                  <UserProfileModal role="Supervisor">
                      <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                           <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                              <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                              <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Supervisor"}</p>
                              <p className="text-xs text-muted-foreground">Supervisor</p>
                          </div>
                      </div>
                  </UserProfileModal>
                  <UserNav role="Supervisor" />
              </div>
          </div>
      </div>
    );
    
    if (isUserLoading || !user || isProfileLoading) {
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
                                            <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as SupervisorView)}>
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
                             <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{assignedDepartment?.name || "Supervisor"}</div>
                             <div className="py-4">
                                <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    {activeView === 'inventory' ? 'VIEW OPTIONS' : (activeView === 'verification' ? 'VERIFICATION' : 'MENU')}
                                </h2>
                                {activeView === 'inventory' ? (
                                    <ul className="flex flex-col gap-1">
                                        <li>
                                            <button onClick={() => setInventorySubView('grid')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'grid' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <LayoutGrid className="h-5 w-5" /> Grid View
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => setInventorySubView('table')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${inventorySubView === 'table' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <List className="h-5 w-5" /> Table View
                                            </button>
                                        </li>
                                    </ul>
                                ) : activeView === 'verification' ? (
                                     <ul className="flex flex-col gap-1">
                                        <li>
                                            <button onClick={() => setVerificationSubView('pending')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'pending' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <ClipboardCheck className="h-5 w-5" /> Pending
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => setVerificationSubView('history')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${verificationSubView === 'history' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <HistoryIcon className="h-5 w-5" /> History
                                            </button>
                                        </li>
                                    </ul>
                                ) : (
                                    <ul className="flex flex-col gap-1">
                                        {navItems.filter(item => item.id === activeView).map(item => (
                                            <li key={item.id}>
                                                <button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white`}>
                                                    {React.cloneElement(item.icon, {className: "h-5 w-5"})}
                                                    {item.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                             </div>
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]">
                         <div className="flex items-center justify-between p-2">
                             <UserProfileModal role="Supervisor">
                                 <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                     <Avatar className="h-8 w-8 flex-shrink-0">
                                         <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                         <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                     </Avatar>
                                     <div className="overflow-hidden">
                                         <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Supervisor"}</p>
                                         <p className="text-xs text-muted-foreground">Supervisor</p>
                                     </div>
                                 </div>
                             </UserProfileModal>
                             <UserNav role="Supervisor" />
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

            </div>
        </TooltipProvider>
    )
}
