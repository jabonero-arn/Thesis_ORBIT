
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
import { format, isSameDay } from "date-fns"
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
    const { items, borrowHistory, departments, channels, studentDepartmentAccessRequests, allUsers } = useAppContext();
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
        const assignedChannelIds = new Set(channels.filter(c => c.departmentId === assignedDepartmentId).map(c => c.id));
        const departmentItemIds = new Set(items.filter(item => item.channelId && assignedChannelIds.has(item.channelId)).map(item => item.id));
        return borrowHistory.filter(h => h.inventoryItemId && departmentItemIds.has(h.inventoryItemId));
    }, [borrowHistory, items, channels, assignedDepartmentId]);
    
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
      if (isUserLoading) return;
      if (!user) {
        router.push("/login?role=staff");
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

    const handleReservationAction = async (reservationId: string, newStatus: 'Reserved' | 'Denied') => {
        if (!firestore) return;
        const recordsToUpdate = borrowHistory.filter(h => h.reservationId === reservationId && h.status === 'Pending');
        if (recordsToUpdate.length === 0) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'This reservation is no longer pending.' });
            return;
        }
        
        if (newStatus === 'Reserved') {
            const reservationDate = new Date(recordsToUpdate[0].date);
            const startTime = recordsToUpdate[0].startTime;
            const endTime = recordsToUpdate[0].endTime;
            
            for (const record of recordsToUpdate) {
                const item = items.find(i => i.id === record.inventoryItemId);
                if (!item) continue;
                const overlappingReservations = borrowHistory.filter(h => h.inventoryItemId === record.inventoryItemId && h.status === 'Reserved' && h.date && isSameDay(new Date(h.date), reservationDate) && h.startTime && h.endTime && startTime && endTime && h.startTime < endTime && h.endTime > startTime);
                const overlappingQuantity = overlappingReservations.reduce((sum, h) => sum + (h.itemQuantity || 1), 0);
                const requestedQuantity = record.itemQuantity || 1;
                if ((overlappingQuantity + requestedQuantity) > item.quantity) {
                    toast({ variant: 'destructive', title: 'Approval Failed: Conflict', description: `Not enough stock for "${item.name}" at the selected time to approve this reservation.` });
                    return;
                }
            }
        }

        try {
            const batch = writeBatch(firestore);
            recordsToUpdate.forEach(record => {
                const docRef = doc(firestore, 'borrowing_transactions', record.id);
                batch.update(docRef, { status: newStatus });
            });
            await batch.commit();
            toast({ title: `Reservation ${newStatus}`, description: `The reservation has been ${newStatus.toLowerCase()}.` });
        } catch (error) {
            console.error(`Error updating reservation ${reservationId}:`, error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    }


    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants: Record<BorrowHistoryStatus, "secondary" | "destructive" | "outline" | "default"> = {
            'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive',
            'Returned': 'secondary', 'Pending Return': 'secondary', 'Cancelled': 'destructive', 'Reserved': 'default',
        };
        const textMap: Partial<Record<BorrowHistoryStatus, string>> = { 'Approved': 'Approved for Borrowing', 'Reserved': 'Reserved' };
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
        const individualDamaged = damagedHistory.filter(h => h.borrowingType !== 'Group');
        const groupDamaged = damagedHistory.filter(h => h.borrowingType === 'Group');

        switch (activeView) {
            case 'scanner': return <QrScannerView />;
            case 'accessRequests': 
                const getTeacherName = (teacherId: string) => allUsers.find(u => u.id === teacherId)?.displayName || 'N/A';
                return (
                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Student Department Access</CardTitle>
                            <CardDescription>Approve or deny student requests to access your department's materials.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Student</TableHead>
                                        <TableHead className="whitespace-nowrap">Subject</TableHead>
                                        <TableHead className="whitespace-nowrap">Teacher</TableHead>
                                        <TableHead className="whitespace-nowrap">Date Requested</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingStudentRequests.length > 0 ? pendingStudentRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="whitespace-nowrap">{req.studentName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{req.subject}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getTeacherName(req.teacherId)}</TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(req.requestedAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <Button size="sm" onClick={() => handleAccessRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4"/>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleAccessRequest(req.id, 'denied')}><X className="mr-2 h-4 w-4"/>Deny</Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">No pending student requests.</TableCell>
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
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Name</TableHead>
                                            <TableHead className="whitespace-nowrap">Lab</TableHead>
                                            <TableHead className="whitespace-nowrap">Quantity</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap">Last Updated</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {departmentItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="whitespace-nowrap">{item.name}</TableCell>
                                                <TableCell className="whitespace-nowrap">{channels.find(c=>c.id===item.channelId)?.name.replace('#','')}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell className="whitespace-nowrap"><Badge variant={item.status === 'Available' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                                                <TableCell className="whitespace-nowrap">{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy, h:mm a') : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            );
            case 'transactions': return (
                 <div className="space-y-6">
                    {transactionSubView === 'reservations' && (<>
                        <Card className="bg-card/80">
                            <CardHeader>
                                <CardTitle>Pending Reservations</CardTitle>
                                <CardDescription>Student reservation requests for your department.</CardDescription>
                            </CardHeader>
                             <CardContent className="max-h-[60vh] overflow-auto">
                                {groupedPendingReservations.length > 0 ? (
                                    <div className="space-y-4">
                                        {groupedPendingReservations.map(([reservationId, group]) => (
                                            <div key={reservationId} className="p-4 rounded-lg bg-black/20 border border-border/50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-lg">{group.studentName}</p>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(group.date), 'MMM d, yyyy')} at {group.startTime} - {group.endTime}</p>
                                                    </div>
                                                    <Badge variant="outline">Pending Approval</Badge>
                                                </div>
                                                <ul className="list-disc list-inside my-3 space-y-1 pl-1 text-sm">
                                                    {group.records.map(record => (
                                                        <li key={record.id}>{record.itemName} (x{record.itemQuantity || 1})</li>
                                                    ))}
                                                </ul>
                                                {group.records[0].borrowingType === 'Group' && (
                                                    <div className="mb-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                                        <p><b>Group {group.records[0].groupNumber}</b> ({group.records[0].groupSubject})</p>
                                                        <p>Members: {group.records[0].groupMembers}</p>
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <Button size="sm" variant="secondary" onClick={() => handleReservationAction(reservationId, 'Reserved')}><Check className="mr-2 h-4 w-4"/>Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleReservationAction(reservationId, 'Denied')}><X className="mr-2 h-4 w-4"/>Deny</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No pending reservations.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-card/80">
                            <CardHeader>
                                <CardTitle>Confirmed Reservations</CardTitle>
                                <CardDescription>Upcoming confirmed reservations in your department.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                {groupedConfirmedReservations.length > 0 ? (
                                    <div className="space-y-4">
                                        {groupedConfirmedReservations.map(([reservationId, group]) => (
                                            <div key={reservationId} className="p-4 rounded-lg bg-black/20">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-lg">{group.studentName}</p>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(group.date), 'MMM d, yyyy')} at {group.startTime} - {group.endTime}</p>
                                                    </div>
                                                    <Badge variant="default">Confirmed</Badge>
                                                </div>
                                                <ul className="list-disc list-inside my-3 space-y-1 pl-1 text-sm">
                                                    {group.records.map(record => (
                                                        <li key={record.id}>{record.itemName} (x{record.itemQuantity || 1})</li>
                                                    ))}
                                                </ul>
                                                {group.records[0].borrowingType === 'Group' && (
                                                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                                        <p><b>Group {group.records[0].groupNumber}</b> ({group.records[0].groupSubject})</p>
                                                        <p>Members: {group.records[0].groupMembers}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No confirmed reservations.</p>
                                )}
                            </CardContent>
                        </Card>
                    </>)}
                    {transactionSubView === 'borrowed' && (
                        <Card className="bg-card/80"><CardHeader><CardTitle>Currently Borrowed</CardTitle><CardDescription>Items currently checked out from your department.</CardDescription></CardHeader>
                           <CardContent className="max-h-[60vh] overflow-auto">
                               <Table>
                                   <TableHeader>
                                       <TableRow>
                                           <TableHead className="whitespace-nowrap">Student</TableHead>
                                           <TableHead className="whitespace-nowrap">Item</TableHead>
                                           <TableHead className="whitespace-nowrap">Date</TableHead>
                                       </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                       {activeBorrows.map(b => <TableRow key={b.id}><TableCell className="whitespace-nowrap">{b.studentName}</TableCell><TableCell className="whitespace-nowrap">{b.itemName}</TableCell><TableCell className="whitespace-nowrap">{format(new Date(b.date), 'MMM d, yyyy, h:mm a')}</TableCell></TableRow>)}
                                   </TableBody>
                               </Table>
                           </CardContent>
                        </Card>
                    )}
                 </div>
            );
            case 'history': 
                const indvHist = departmentHistory.filter(h => h.borrowingType !== 'Group');
                const groupHist = departmentHistory.filter(h => h.borrowingType === 'Group');
                return (
                 <div className="space-y-8">
                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Individual Transaction History</CardTitle>
                            <CardDescription>Complete log of individual sessions for your department.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Student</TableHead>
                                        <TableHead className="whitespace-nowrap">Item</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {indvHist.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="whitespace-nowrap">{h.studentName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.itemName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(h.date), 'MMM d, yyyy, h:mm a')}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {h.status === 'Returned' && h.returnCondition ? (
                                                    <ReturnConditionBadge condition={h.returnCondition}/>
                                                ) : getHistoryStatusBadge(h.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Group Activity History</CardTitle>
                            <CardDescription>A log of all group sessions including members for accountability.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Representative</TableHead>
                                        <TableHead className="whitespace-nowrap">Group Info</TableHead>
                                        <TableHead className="whitespace-nowrap">Members</TableHead>
                                        <TableHead className="whitespace-nowrap">Item</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupHist.length > 0 ? groupHist.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="whitespace-nowrap">{h.studentName}</TableCell>
                                            <TableCell className="whitespace-nowrap">Group {h.groupNumber} ({h.groupSubject})</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={h.groupMembers}>{h.groupMembers}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.itemName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(h.date), 'MMM d, yyyy, h:mm a')}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {h.status === 'Returned' && h.returnCondition ? (
                                                    <ReturnConditionBadge condition={h.returnCondition}/>
                                                ) : getHistoryStatusBadge(h.status)}
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={6} className="text-center h-24">No group history found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            );
            case 'damaged': return (
                <div className="space-y-8">
                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Individual Damaged & Lost Items</CardTitle>
                            <CardDescription>Log of issues from individual borrowing sessions.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Student</TableHead>
                                        <TableHead className="whitespace-nowrap">Item</TableHead>
                                        <TableHead className="whitespace-nowrap">Date Returned</TableHead>
                                        <TableHead className="whitespace-nowrap">Condition</TableHead>
                                        <TableHead className="whitespace-nowrap">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {individualDamaged.length > 0 ? individualDamaged.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="whitespace-nowrap">{h.studentName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.itemName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(h.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.returnCondition && <ReturnConditionBadge condition={h.returnCondition}/>}</TableCell>
                                            <TableCell className="min-w-[200px] whitespace-nowrap">
                                                <span className="text-sm italic opacity-80">{h.returnNotes || 'No specific details provided.'}</span>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No individual issues found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>Group Damaged & Lost Items</CardTitle>
                            <CardDescription>Issues from group sessions. All listed members are accountable for these materials.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Representative</TableHead>
                                        <TableHead className="whitespace-nowrap">Members</TableHead>
                                        <TableHead className="whitespace-nowrap">Item</TableHead>
                                        <TableHead className="whitespace-nowrap">Date Returned</TableHead>
                                        <TableHead className="whitespace-nowrap">Condition</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupDamaged.length > 0 ? groupDamaged.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="whitespace-nowrap">{h.studentName}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={h.groupMembers}>{h.groupMembers}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.itemName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{format(new Date(h.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.returnCondition && <ReturnConditionBadge condition={h.returnCondition}/>}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No group issues found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
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
        <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
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

                <main className="flex-1 flex flex-col h-dvh">
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
