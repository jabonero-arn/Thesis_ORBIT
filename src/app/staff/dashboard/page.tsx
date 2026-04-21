
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { 
    Package, PackageOpen, History as HistoryIcon, Edit, Trash, QrCode, Loader2, Menu,
    Hourglass, PackageCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, User as UserType, Department } from "@/lib/types"
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

type StaffView = 'scanner' | 'inventory' | 'transactions' | 'history';
type TransactionSubView = 'reservations' | 'borrowed';

export default function StaffDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, borrowHistory, departments, channels } = useAppContext();
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
        return items.filter(item => assignedChannelIds.has(item.channelId));
    }, [items, assignedChannels, assignedDepartmentId]);

    const departmentHistory = React.useMemo(() => {
        if (!assignedDepartmentId) return [];
        const itemNamesInDept = new Set(departmentItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, departmentItems]);

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


    // Handlers
    const handleViewChange = (view: StaffView) => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
    }

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
        { id: 'inventory', label: 'Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
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

        switch (activeView) {
            case 'scanner': return <QrScannerView />;
            case 'inventory': return (
                <Card className="bg-card/80"><CardHeader><CardTitle>Department Inventory</CardTitle><CardDescription>All items in the {assignedDepartment?.name} department.</CardDescription></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Lab</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>{departmentItems.map(item => (<TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{channels.find(c=>c.id===item.channelId)?.name.replace('#','')}</TableCell><TableCell>{item.quantity}</TableCell><TableCell><Badge variant={item.status === 'Available' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell></TableRow>))}</TableBody>
                    </Table></CardContent>
                </Card>
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
                    <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                        <TableBody>{departmentHistory.map(h => <TableRow key={h.id}><TableCell>{h.studentName}</TableCell><TableCell>{h.itemName}</TableCell><TableCell>{format(new Date(h.date), 'MMM d, yyyy, h:mm a')}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(h.status)}</TableCell></TableRow>)}</TableBody>
                    </Table></CardContent>
                 </Card>
            );
            default: return null;
        }
    }

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
                                {activeView === 'transactions' ? (
                                     <>
                                        <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">QUEUES</h2>
                                        <ul className="flex flex-col gap-1">
                                            <li><button onClick={() => setTransactionSubView('reservations')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'reservations' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Reservations</button></li>
                                            <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                        </ul>
                                     </>
                                ) : (
                                    <>
                                        <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">MENU</h2>
                                        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white">
                                            {navItems.find(i => i.id === activeView)?.icon}
                                            {navItems.find(i => i.id === activeView)?.label}
                                        </button>
                                    </>
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
                                    {/* Mobile sidebar content would go here */}
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
