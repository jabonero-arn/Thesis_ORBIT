
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, PackageOpen, History as HistoryIcon, Edit, Trash, QrCode, Loader2, Menu,
    Hourglass, PackageCheck, LayoutGrid, List, AlertTriangle, ClipboardCheck, Check, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, User as UserType, Department, StudentDepartmentAccessRequestStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { QrScannerView } from "@/components/qr-scanner-view"
import { format } from "date-fns"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { InventoryGrid } from "@/components/inventory-grid"
import { ReturnConditionBadge } from "@/components/return-condition-badge"

type StaffView = 'scanner' | 'inventory' | 'transactions' | 'history' | 'damaged' | 'accessRequests';
type TransactionSubView = 'reservations' | 'borrowed';
type InventorySubView = 'grid' | 'table';

export default function StaffDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, departments, channels, studentDepartmentAccessRequests } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

    const assignedDepartmentId = userProfile?.assignedDepartmentId;
    const assignedDepartment = React.useMemo(() => departments.find(d => d.id === assignedDepartmentId), [departments, assignedDepartmentId]);

    const assignedChannels = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        return channels.filter(c => c.departmentId === assignedDepartmentId);
    }, [channels, assignedDepartmentId]);

    // Data filtering based on assigned department
    const departmentItems = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        const assignedChannelIds = new Set(assignedChannels.map(c => c.id));
        return items.filter(item => item.channelId && assignedChannelIds.has(item.channelId));
    }, [items, assignedChannels, assignedDepartmentId]);

    const departmentHistory = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems]);
    
    const pendingStudentRequests = React.useMemo(() => {
        return studentDepartmentAccessRequests.filter(req => req.departmentId === assignedDepartmentId && req.status === 'pending');
    }, [studentDepartmentAccessRequests, assignedDepartmentId]);

    const { groupedPendingReservations, groupedConfirmedReservations } = React.useMemo(() => {
        const pending: { [id: string]: { records: BorrowHistory[], date: string, studentName: string, startTime?: string, endTime?: string } } = {};
        const confirmed: { [id: string]: { records: BorrowHistory[], date: string, studentName: string, startTime?: string, endTime?: string } } = {};
        
        departmentHistory.forEach(h => {
            if (h.reservationId) {
                if (h.status === 'Pending') {
                    if (!pending[h.reservationId]) {
                        pending[h.reservationId] = { records: [], date: h.date, studentName: h.studentName, startTime: h.startTime, endTime: h.endTime };
                    }
                    pending[h.reservationId].records.push(h);
                } else if (h.status === 'Reserved') {
                    if (!confirmed[h.reservationId]) {
                        confirmed[h.reservationId] = { records: [], date: h.date, studentName: h.studentName, startTime: h.startTime, endTime: h.endTime };
                    }
                    confirmed[h.reservationId].records.push(h);
                }
            }
        });

        return {
            groupedPendingReservations: Object.entries(pending).sort((a,b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime()),
            groupedConfirmedReservations: Object.entries(confirmed).sort((a,b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime()),
        }
    }, [departmentHistory]);


    React.useEffect(() => {
      if (!isUserLoading && !user) {
        router.push("/login?role=staff")
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
    const [activeView, setActiveView] = React.useState<StaffView>('scanner');
    const [transactionSubView, setTransactionSubView] = React.useState<TransactionSubView>('reservations');
    const [inventorySubView, setInventorySubView] = React.useState<InventorySubView>('grid');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


    // Handlers
    const handleViewChange = (view: StaffView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }
    
    const handleAccessRequest = async (requestId: string, newStatus: StudentDepartmentAccessRequestStatus) => {
        if (!firestore) return;
        try {
            const docRef = doc(firestore, 'student_department_access_requests', requestId);
            await updateDoc(docRef, { status: newStatus });
            toast({
                title: `Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
                description: `The student's access request has been updated.`,
            });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };


    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants: Record<BorrowHistoryStatus, "secondary" | "destructive" | "outline" | "default"> = {
            'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive',
            'Returned': 'secondary', 'Pending Return': 'secondary', 'Cancelled': 'destructive', 'Reserved': 'default',
        };
        const textMap: Partial<Record<BorrowHistoryStatus, string>> = { 'Approved': 'Approved for Pickup', 'Reserved': 'Reserved' };
        return <Badge variant={variants[status] || 'default'}>{textMap[status] || status}</Badge>;
    }
    
    const navItems = [
        { id: 'scanner', label: 'QR Scanner', icon: <QrCode /> },
        { id: 'accessRequests', label: 'Access Requests', icon: <ClipboardCheck /> },
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
        { id: 'damaged', label: 'Damaged Items', icon: <AlertTriangle /> },
    ];

    const getHeaderContent = () => {
        const currentNavItem = navItems.find(item => item.id === activeView);
        return (
            <div className="flex items-center gap-2">
                {currentNavItem?.icon && <div className="text-muted-foreground">{currentNavItem.icon}</div>}
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{currentNavItem?.label}</h1>
            </div>
        )
    }

    const renderContent = () => {
        const activeBorrows = departmentHistory.filter(h => h.status === 'Active');
        const damagedHistory = departmentHistory.filter(h => h.returnCondition && h.returnCondition !== 'Good');

        switch (activeView) {
            case 'scanner': return <QrScannerView />;
            case 'accessRequests': return (
                <Card className="bg-card/80">
                    <CardHeader>
                        <CardTitle>Student Department Access</CardTitle>
                        <CardDescription>Approve or deny student requests to access your department's materials.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Date Requested</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingStudentRequests.length > 0 ? pendingStudentRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell>{req.studentName}</TableCell>
                                        <TableCell>{req.departmentName}</TableCell>
                                        <TableCell>{format(new Date(req.requestedAt), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" onClick={() => handleAccessRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4"/>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleAccessRequest(req.id, 'denied')}><X className="mr-2 h-4 w-4"/>Deny</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No pending student requests.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            );
            case 'inventory': return (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {inventorySubView === 'grid' ? (
                        <InventoryGrid
                            items={departmentItems}
                            onItemSelect={() => {}}
                            selectedItems={[]}
                            isSelectionEnabled={false}
                        />
                    ) : (
                        <Card className="bg-card/80"><CardHeader><CardTitle>Department Inventory</CardTitle><CardDescription>All items in the {assignedDepartment?.name} department.</CardDescription></CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Lab</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Last Updated</TableHead></TableRow></TableHeader>
                                <TableBody>{departmentItems.map(item => (<TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{channels.find(c=>c.id===item.channelId)?.name.replace('#','')}</TableCell><TableCell>{item.quantity}</TableCell><TableCell><Badge variant={item.status === 'Available' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell><TableCell>{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell></TableRow>))}</TableBody>
                            </Table></CardContent>
                        </Card>
                    )}
                </div>
            );
            case 'transactions': return (
                 <div className="space-y-6">
                    {transactionSubView === 'reservations' && (<>
                        <Card className="bg-card/80"><CardHeader><CardTitle>Pending Reservations</CardTitle><CardDescription>Student reservation requests for your department.</CardDescription></CardHeader>
                            <CardContent>{groupedPendingReservations.length > 0 ? groupedPendingReservations.map(([id, group]) => <div key={id} />) : <p className="text-center text-muted-foreground py-8">No pending reservations.</p>}</CardContent>
                        </Card>
                        <Card className="bg-card/80"><CardHeader><CardTitle>Confirmed Reservations</CardTitle><CardDescription>Upcoming confirmed reservations in your department.</CardDescription></CardHeader>
                             <CardContent>{groupedConfirmedReservations.length > 0 ? groupedConfirmedReservations.map(([id, group]) => <div key={id} />) : <p className="text-center text-muted-foreground py-8">No confirmed reservations.</p>}</CardContent>
                        </Card>
                    </>)}
                    {transactionSubView === 'borrowed' && (
                        <Card className="bg-card/80"><CardHeader><CardTitle>Currently Borrowed</CardTitle><CardDescription>Items currently checked out from your department.</CardDescription></CardHeader>
                           <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{activeBorrows.map(b => <TableRow key={b.id}><TableCell>{b.studentName}</TableCell><TableCell>{b.itemName}</TableCell><TableCell>{format(new Date(b.date), 'MMM d, yyyy, h:mm a')}</TableCell></TableRow>)}</TableBody></Table></CardContent>
                        </Card>
                    )}
                 </div>
            );
            case 'history': return (
                 <Card className="bg-card/80"><CardHeader><CardTitle>Transaction History</CardTitle><CardDescription>Complete log of all transactions for your department.</CardDescription></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                        <TableBody>{departmentHistory.map(h => <TableRow key={h.id}><TableCell>{h.studentName}</TableCell><TableCell>{h.itemName}</TableCell><TableCell>{format(new Date(h.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell>{h.borrowingType === 'Group' ? (<Tooltip><TooltipTrigger><Badge variant="outline">Group</Badge></TooltipTrigger><TooltipContent><p className="font-medium">Group {h.groupNumber} ({h.groupSubject})</p><p className="text-muted-foreground max-w-xs">{h.groupMembers}</p></TooltipContent></Tooltip>) : 'Individual'}</TableCell><TableCell className="text-right">{h.status === 'Returned' && h.returnCondition ? <ReturnConditionBadge condition={h.returnCondition}/> : getHistoryStatusBadge(h.status)}</TableCell></TableRow>)}</TableBody>
                    </Table></CardContent>
                 </Card>
            );
            case 'damaged': return (
                <Card className="bg-card/80"><CardHeader><CardTitle>Damaged & Lost Items</CardTitle><CardDescription>Log of all items returned with issues from your department.</CardDescription></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Returned</TableHead><TableHead className="text-right">Condition</TableHead></TableRow></TableHeader>
                        <TableBody>{damagedHistory.length > 0 ? damagedHistory.map(h => <TableRow key={h.id}><TableCell>{h.studentName}</TableCell><TableCell>{h.itemName}</TableCell><TableCell>{format(new Date(h.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{h.returnCondition && <ReturnConditionBadge condition={h.returnCondition}/>}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="text-center h-24">No damaged or lost items found.</TableCell></TableRow>}</TableBody>
                    </Table></CardContent>
                </Card>
            );
            default: return null;
        }
    }
    
    const mobileSidebarContent = (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{assignedDepartment?.name || "Staff"}</div>
                <div className="p-2 space-y-1">
                    {navItems.map(item => (
                      <Button key={item.id} variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleViewChange(item.id as StaffView)}>{item.icon} {item.label}</Button>
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
                
                {activeView === 'transactions' && (
                    <div className="p-2">
                        <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">QUEUES</h2>
                        <div className="space-y-1">
                             <Button variant={transactionSubView === 'reservations' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setTransactionSubView('reservations'); setIsMobileMenuOpen(false); }}>
                                <Hourglass /> Reservations
                            </Button>
                            <Button variant={transactionSubView === 'borrowed' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setTransactionSubView('borrowed'); setIsMobileMenuOpen(false); }}>
                                <PackageCheck /> Currently Borrowed
                            </Button>
                        </div>
                    </div>
                )}
    
            </div>
            <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                <div className="flex items-center justify-between p-2">
                    <UserProfileModal role="Staff">
                        <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                              <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Staff"}</p>
                            <p className="text-xs text-muted-foreground">Staff</p>
                          </div>
                        </div>
                      </UserProfileModal>
                  <UserNav role="Staff" />
                </div>
            </div>
        </div>
    );

     if (isUserLoading || isProfileLoading || !user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#1e2430]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-screen bg-[#1e2430]">
                 <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}><TooltipTrigger asChild>
                                        <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as StaffView)}>
                                            {item.icon}
                                        </Button>
                                    </TooltipTrigger><TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent></Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="w-64 flex-col bg-[#141821] p-2">
                             <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{assignedDepartment?.name || "Staff"}</div>
                             <div className="py-4">
                                <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                    {activeView === 'inventory' ? 'VIEW OPTIONS' : (activeView === 'transactions' ? 'QUEUES' : 'MENU')}
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
                                ) : activeView === 'transactions' ? (
                                     <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setTransactionSubView('reservations')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'reservations' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Reservations</button></li>
                                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                    </ul>
                                ) : (
                                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white">
                                        {navItems.find(i => i.id === activeView)?.icon}
                                        {navItems.find(i => i.id === activeView)?.label}
                                    </button>
                                )}
                             </div>
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]">
                      <div className="flex items-center justify-between p-2">
                            <UserProfileModal role="Staff">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                      <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                  </Avatar>
                                  <div className="overflow-hidden">
                                    <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Staff"}</p>
                                    <p className="text-xs text-muted-foreground">Staff</p>
                                  </div>
                                </div>
                              </UserProfileModal>
                          <UserNav role="Staff" />
                        </div>
                    </div>
                </div>

                <main className="flex-1 flex flex-col h-screen">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger>
                                <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                                    {mobileSidebarContent}
                                </SheetContent>
                            </Sheet>
                            {getHeaderContent()}
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </TooltipProvider>
    )
}
