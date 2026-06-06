
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, writeBatch } from "firebase/firestore"
import { User as UserIcon, Cpu, FlaskConical, Cog, Hash, Menu, Check, X, LayoutGrid, ClipboardCheck, CornerDownLeft, Settings, History, Hourglass, Loader2, Building, Inbox, PackageCheck, CalendarDays, XCircle, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, isToday } from "date-fns"
import Image from "next/image"

import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, CartItem, User } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
import { Separator } from "@/components/ui/separator"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { LabSelectionDialog } from "@/components/teacher/lab-selection-dialog"
import { StudentActivity } from "@/components/student-activity"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function TeacherDashboardPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, departments, channels, channelAccessRequests } = useAppContext();
  
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
  const [showLabSelectionDialog, setShowLabSelectionDialog] = React.useState(false);
  const [isLabsOpen, setIsLabsOpen] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userProfileRef);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push("/login?role=teacher");
    } else if (!user.emailVerified) {
      router.push("/verify-email");
    }
  }, [user, isUserLoading, router]);

  React.useEffect(() => {
    if (isUserLoading || isProfileLoading || !user || !userProfile) {
      return;
    }

    if (userProfile.passwordChangeRequired) {
      setShowPasswordChangeDialog(true);
    } else if (userProfile.hasCompletedLabSetup === false) {
      setShowLabSelectionDialog(true);
    } else {
      setShowPasswordChangeDialog(false);
      setShowLabSelectionDialog(false);
    }
  }, [user, userProfile, isUserLoading, isProfileLoading]);

  const teacherData = React.useMemo(() => {
      if (!user) return null;
      return {
          id: user.uid,
          name: userProfile?.displayName || user.displayName || 'Teacher',
          role: 'Teacher',
          avatarUrl: user.photoURL || undefined,
          employeeId: userProfile?.employeeId,
      }
  }, [user, userProfile]);

  // View state
  const [activeView, setActiveView] = React.useState<TeacherView>('requests');
  const [requestSubView, setRequestSubView] = React.useState<RequestSubView>('pending');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'reservations' | 'history' | 'issues'>('borrowed');


  const approvedChannelsInfo = React.useMemo(() => {
    if (!user || !channelAccessRequests || !channels || !departments) return { approvedChannelIds: new Set<string>(), approvedDepartmentIds: new Set<string>() };
    
    // 1. Get approved channel IDs from requests.
    const approvedReqs = channelAccessRequests.filter(req => req.teacherId === user.uid && req.status === 'approved');
    const approvedChannelIds = new Set(approvedReqs.map(req => req.channelId));

    // 2. Add Engineering Office channel ID.
    const engineeringOffice = channels.find(c => c.name.toLowerCase().includes('engineering office'));
    if (engineeringOffice) {
        approvedChannelIds.add(engineeringOffice.id);
    }
    
    // 3. From the final set of channel IDs, derive the department IDs.
    const approvedDepartmentIds = new Set<string>();
    channels.forEach(channel => {
        if (approvedChannelIds.has(channel.id)) {
            approvedDepartmentIds.add(channel.departmentId);
        }
    });

    return { approvedChannelIds, approvedDepartmentIds };
  }, [user, channelAccessRequests, channels, departments]);

  const teacherDepartments = React.useMemo(() => {
    if (!departments) return [];
    return departments.filter(dept => approvedChannelsInfo.approvedDepartmentIds.has(dept.id));
  }, [departments, approvedChannelsInfo.approvedDepartmentIds]);

  const teacherChannels = React.useMemo(() => {
    if (!channels) return [];
    return channels.filter(chan => approvedChannelsInfo.approvedChannelIds.has(chan.id));
  }, [channels, approvedChannelsInfo.approvedChannelIds]);


  // State for borrowing
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string|null>(null);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string|null>(null);

  React.useEffect(() => {
    if (activeView === 'borrow' && !selectedDepartmentId && teacherDepartments.length > 0) {
      setSelectedDepartmentId(teacherDepartments[0].id);
    }
  }, [teacherDepartments, selectedDepartmentId, activeView]);

  React.useEffect(() => {
    if (activeView === 'borrow' && selectedDepartmentId) {
        const firstChannelInDept = teacherChannels.find(c => c.departmentId === selectedDepartmentId);
        if (!selectedChannelId || !teacherChannels.some(c => c.id === selectedChannelId && c.departmentId === selectedDepartmentId)) {
           setSelectedChannelId(firstChannelInDept?.id ?? null);
        }
    }
  }, [selectedDepartmentId, teacherChannels, activeView, selectedChannelId]);


  const [selectedItems, setSelectedItems] = React.useState<CartItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // State for request approvals
  const pendingRequests = borrowHistory.filter((r) => r.status === 'Pending' && r.teacherId === teacherData?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const processedRequests = borrowHistory.filter((r) => r.status !== 'Pending' && r.teacherId === teacherData?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // State for teacher's own activity
  const [itemsToReturn, setItemsToReturn] = React.useState<BorrowHistory[]>([]);
  const [claimQrPayload, setClaimQrPayload] = React.useState<string | null>(null);
  const teacherBorrowHistory = React.useMemo(() => {
      if (!user?.uid) return [];
      return borrowHistory.filter(h => h.borrowerUserId === user.uid);
  }, [borrowHistory, user]);

  const handleRequest = async (id: string, newStatus: 'Approved' | 'Denied') => {
    if (!firestore) return;
    const record = borrowHistory.find(r => r.id === id);
    if (record) {
      try {
        const docRef = doc(firestore, 'borrowing_transactions', id);
        await updateDoc(docRef, { status: newStatus });
        toast({
          title: `Request ${newStatus}`,
          description: `Request for "${record.itemName}" from ${record.studentName} has been ${newStatus.toLowerCase()}.`,
        });
      } catch (e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the request status.",
        })
      }
    }
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
        'Approved': 'Approved for Borrowing',
    };

    const text = textMap[status] || status;
    const variant = variants[status] || 'default';

    return <Badge variant={variant}>{text}</Badge>;
  }


  // Handlers for borrowing
  const handleDepartmentSelect = (deptId: string) => {
    setActiveView('borrow')
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = teacherChannels.find(c => c.departmentId === deptId);
    setSelectedChannelId(firstChannelInDept?.id ?? null);
    setSelectedItems([]);
  }

  const items = React.useMemo(
    () => allItems.filter((item) => item.channelId === selectedChannelId),
    [allItems, selectedChannelId]
  )
  
  const selectedChannel = React.useMemo(() => teacherChannels.find(c => c.id === selectedChannelId), [selectedChannelId, teacherChannels])
  const selectedDepartment = React.useMemo(() => teacherDepartments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId, teacherDepartments]);
  const channelsForSidebar = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return teacherChannels.filter(c => c.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId, teacherChannels]);

  const handleItemSelect = (item: InventoryItem) => {
    if (item.status === "Borrowed" || item.quantity === 0) return;

    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        // Quantity is managed in cart
    } else {
        // Teachers can borrow any item directly, regardless of 'Locked' status
        setSelectedItems((prev) => [...prev, {item, quantity: 1}])
    }
  }

  const handleChannelSelect = (id: string) => {
    setSelectedChannelId(id)
    setSelectedItems([])
    setIsMobileMenuOpen(false) // Close mobile menu on selection
  }
  
  const handleItemQuantityChange = (itemId: string, newQuantity: number) => {
    const cartItem = selectedItems.find(ci => ci.item.id === itemId);
    if (!cartItem) return;

    if (newQuantity > cartItem.item.quantity) {
        toast({ variant: 'destructive', title: `Only ${cartItem.item.quantity} available.`});
        return;
    }

    if (newQuantity <= 0) {
        // Remove from cart
        setSelectedItems(prev => prev.filter(ci => ci.item.id !== itemId));
    } else {
        // Update quantity
        setSelectedItems(prev => prev.map(ci => 
            ci.item.id === itemId ? { ...ci, quantity: newQuantity } : ci
        ));
    }
  };

  const handleInitiateReturn = (records: BorrowHistory[]) => {
    if (!records.length) return;
    setItemsToReturn(records);
  }

  const handleCancelReservation = async (reservationId: string) => {
    if (!firestore) return;
    try {
        const recordsToCancel = teacherBorrowHistory.filter(h => h.reservationId === reservationId && (h.status === 'Pending' || h.status === 'Reserved'));
        
        if (recordsToCancel.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot Cancel', description: 'This reservation is no longer pending or reserved.' });
            return;
        }

        if (recordsToCancel.length > 0 && recordsToCancel[0].status === 'Reserved') {
          if (isToday(new Date(recordsToCancel[0].date))) {
            toast({ variant: 'destructive', title: 'Cannot Cancel', description: 'You cannot cancel a reservation on the day it is scheduled.' });
            return;
          }
        }

        const batch = writeBatch(firestore);
        recordsToCancel.forEach(record => {
            const docRef = doc(firestore, 'borrowing_transactions', record.id);
            batch.update(docRef, { status: 'Cancelled' });
        });

        await batch.commit();
        toast({
            title: "Reservation Cancelled",
            description: "Your reservation has been cancelled.",
        });
    } catch (error) {
        console.error("Error cancelling reservation:", error);
        toast({ variant: 'destructive', title: 'Failed to cancel reservation' });
    }
  };


  type TeacherView = 'borrow' | 'requests' | 'my-activity';
  type RequestSubView = 'pending' | 'history';

  const ApprovalRequests = () => {
    if (requestSubView === 'pending') {
      return (
        <div>
          <h3 className="text-lg font-semibold font-headline mb-4">Pending Requests</h3>
          <div className="border rounded-lg bg-card/50">
            {pendingRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.itemName}</TableCell>
                      <TableCell>{record.itemQuantity || 1}</TableCell>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy, h:mm a')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" className="h-8" onClick={() => handleRequest(record.id, 'Approved')}>
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" className="h-8" onClick={() => handleRequest(record.id, 'Denied')}>
                          <X className="mr-2 h-4 w-4" /> Deny
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
                <p>No pending requests for you.</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (requestSubView === 'history') {
      return (
        <div>
          <h3 className="text-lg font-semibold font-headline mb-4">Request History</h3>
          <div className="border rounded-lg max-h-[70vh] overflow-y-auto bg-card/50">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-card z-10">
                  <TableHead>Student</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.length > 0 ? processedRequests.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell>{record.itemName}</TableCell>
                    <TableCell>{record.itemQuantity || 1}</TableCell>
                    <TableCell>{format(new Date(record.date), 'MMM d, yyyy, h:mm a')}</TableCell>
                    <TableCell className="text-right">
                      {getHistoryStatusBadge(record.status)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No processed requests yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return null;
  };
  
  const getDeptIcon = (prefix: string) => {
    if (prefix.startsWith('comp')) return <Cpu />;
    if (prefix.startsWith('chem')) return <FlaskConical />;
    if (prefix.startsWith('robo')) return <Cog />;
    if (prefix.startsWith('eng')) return <Building />;
    return <UserIcon />;
  }

  const activityNavItems = [
    { id: 'borrowed', label: 'My Borrowed Items', icon: <PackageCheck /> },
    { id: 'reservations', label: 'My Reservations', icon: <CalendarDays /> },
    { id: 'history', label: 'History Log', icon: <History /> },
    { id: 'issues', label: 'Damaged/Lost Items', icon: <XCircle /> },
  ] as const;


  const mobileSidebarContent = (
    <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                Departments
            </div>
            <div className="p-2 space-y-1">
                {teacherDepartments.map(dept => (
                    <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>
                        {getDeptIcon(dept.prefix)}
                        {dept.name}
                    </Button>
                ))}
            </div>
            
            {activeView === 'borrow' && selectedDepartmentId && (
                <AppSidebar
                    department={selectedDepartment}
                    channelsInDept={channelsForSidebar}
                    selectedChannelId={selectedChannelId}
                    onChannelSelect={handleChannelSelect}
                />
            )}

            <Separator />
            
            <div className="p-4 font-headline text-lg font-bold border-b border-t border-border/50">
                Menu
            </div>
            <div className="p-2 space-y-1">
                 <Button variant={activeView === 'requests' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('requests'); setIsMobileMenuOpen(false); }}>
                    <Hourglass className="h-5 w-5" /> Pending Requests
                </Button>
                <Button variant={activeView === 'my-activity' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('my-activity'); setIsMobileMenuOpen(false); }}>
                    <Inbox className="h-5 w-5" /> My Activity
                </Button>
            </div>
        </div>
        <div className="mt-auto border-t border-border/50 bg-[#0e1015] pb-8">
          <div className="flex items-center justify-between p-2">
            <UserProfileModal role="Teacher">
              <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={userProfile?.avatarUrl || user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                    <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'T'}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Teacher"}</p>
                  <p className="text-xs text-muted-foreground">Teacher</p>
                </div>
              </div>
            </UserProfileModal>
            <UserNav role="Teacher" />
          </div>
        </div>
    </div>
  );

  const BorrowView = () => {
     if (isUserLoading || isProfileLoading || !teacherData || !selectedDepartmentId || !selectedChannelId) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
     }
    return (
        <>
        <header className="flex items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <InventoryGrid
                    items={items}
                    onItemSelect={handleItemSelect}
                    selectedItems={selectedItems.map(ci => ci.item)}
                    isTeacherView={true}
                />
            </div>
        </>
    )
  };

  const RequestsView = () => (
    <>
        <header className="flex items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    {requestSubView === 'pending' ? <Hourglass className="text-muted-foreground" /> : <History className="text-muted-foreground" />}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">
                      {requestSubView === 'pending' ? 'Pending Requests' : 'Request History'}
                    </h1>
                </div>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <ApprovalRequests />
        </div>
    </>
  );

  const MyActivityView = () => (
     <>
        <header className="flex items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    {React.cloneElement(activityNavItems.find(i => i.id === activitySubView)?.icon || <Inbox/>, { className: "text-muted-foreground" })}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">
                       {activityNavItems.find(i => i.id === activitySubView)?.label}
                    </h1>
                </div>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <StudentActivity
                borrowHistory={teacherBorrowHistory} 
                onReturn={handleInitiateReturn} 
                view={activitySubView}
                onCancelReservation={handleCancelReservation}
                onClaimReservation={(reservationId) => {
                    const payload = { t: 'res-claim', rId: reservationId };
                    setClaimQrPayload(JSON.stringify(payload));
                }}
            />
        </div>
    </>
  );


  if (isUserLoading || isProfileLoading || !teacherData) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'borrow': return <BorrowView />;
      case 'requests': return <RequestsView />;
      case 'my-activity': return <MyActivityView />;
      default: return null;
    }
  }


  return (
    <TooltipProvider>
      <ForcePasswordChangeDialog
        open={showPasswordChangeDialog}
        onSuccess={() => setShowPasswordChangeDialog(false)}
      />
      <LabSelectionDialog
        open={showLabSelectionDialog}
        onFinished={() => setShowLabSelectionDialog(false)}
      />
      <div className="flex h-dvh bg-[#1e2430]">
        {/* Combined Sidebar */}
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
            <div className="flex flex-1">
                {/* Department & View Rail */}
                <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                  <div className="p-2 mb-2">
                    <Logo />
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full">
                    {teacherDepartments.map(dept => (
                      <Tooltip key={dept.id}>
                          <TooltipTrigger asChild>
                              <Button variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleDepartmentSelect(dept.id)}>
                                  {getDeptIcon(dept.prefix)}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="center"><p>{dept.name}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <Separator className="my-2 bg-border/50 w-8" />

                  <div className="flex flex-col items-center gap-2 w-full">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant={activeView === 'requests' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                className="h-12 w-12 rounded-lg"
                                onClick={() => setActiveView('requests')}>
                                <ClipboardCheck />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">
                            <p>Approve Requests</p>
                        </TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant={activeView === 'my-activity' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                className="h-12 w-12 rounded-lg"
                                onClick={() => setActiveView('my-activity')}>
                                <Inbox />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">
                            <p>My Activity</p>
                        </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {/* Channel List or Sub-menu */}
                {activeView === 'borrow' && selectedDepartmentId && (
                    <div className="w-64 flex-col bg-[#141821] p-2">
                        <button 
                            onClick={() => setIsLabsOpen(!isLabsOpen)}
                            className="flex w-full items-center justify-between p-4 font-headline text-lg font-bold border-b border-border/50 group"
                        >
                            <span>{selectedDepartment?.name}</span>
                            {isLabsOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />}
                        </button>
                        {isLabsOpen && (
                            <AppSidebar
                                department={selectedDepartment}
                                channelsInDept={channelsForSidebar}
                                selectedChannelId={selectedChannelId}
                                onChannelSelect={handleChannelSelect}
                            />
                        )}
                    </div>
                )}
                {(activeView === 'requests' || activeView === 'my-activity') && (
                    <div className="w-64 flex-col bg-[#141821] p-2">
                        <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                            {activeView === 'requests' ? 'Approvals' : 'My Activity'}
                        </div>
                        <div className="flex-1 py-4">
                            <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                {activeView === 'requests' ? 'REQUESTS' : 'CATEGORIES'}
                            </h2>
                            {activeView === 'requests' ? (
                                <ul className="flex flex-col gap-1">
                                    <li><button onClick={() => setRequestSubView('pending')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${requestSubView === 'pending' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /><span className="truncate">Pending Requests</span></button></li>
                                    <li><button onClick={() => setRequestSubView('history')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${requestSubView === 'history' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><History className="h-5 w-5" /><span className="truncate">Request History</span></button></li>
                                </ul>
                            ) : (
                                <ul className="flex flex-col gap-1">
                                    {activityNavItems.map(navItem => (
                                        <li key={navItem.id}><button onClick={() => setActivitySubView(navItem.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${activitySubView === navItem.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{React.cloneElement(navItem.icon, { className: 'h-5 w-5' })}<span className="truncate">{navItem.label}</span></button></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-border/50 bg-[#0e1015]">
                <div className="flex items-center justify-between p-2">
                  <UserProfileModal role="Teacher">
                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={userProfile?.avatarUrl || user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                          <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'T'}</AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Teacher"}</p>
                        <p className="text-xs text-muted-foreground">Teacher</p>
                      </div>
                    </div>
                  </UserProfileModal>
                  <UserNav role="Teacher" />
                </div>
            </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-dvh">
            <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                            {mobileSidebarContent}
                        </SheetContent>
                    </Sheet>
                    <div className="flex items-center gap-2">
                        {activeView === 'borrow' ? <Hash className="text-muted-foreground" /> : <LayoutGrid className="text-muted-foreground" />}
                        <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">
                            {activeView === 'borrow' ? (selectedChannel?.name.replace('#', '') || 'Dashboard') : (activeView === 'requests' ? 'Approvals' : 'My Activity')}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="hidden md:flex bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">
                        {userProfile?.role || 'Teacher'}
                    </Badge>
                    <UserNav role="Teacher" />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">
                {renderActiveView()}
            </div>
        </main>

        {/* Cart */}
        {activeView === 'borrow' && (
            <CheckoutFlow
                key={selectedChannelId}
                items={selectedItems}
                onItemQuantityChange={handleItemQuantityChange}
                onClear={() => setSelectedItems([])}
                onSuccess={() => {
                    setSelectedItems([]);
                }}
                isTeacherView={true}
            />
        )}
        
        <Dialog open={itemsToReturn.length > 0} onOpenChange={(open) => !open && setItemsToReturn([])}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2">Return QR Code for {itemsToReturn.length} item(s)</DialogTitle>
                    <DialogDescription>Present this QR code to lab staff to process your return. This dialog will close automatically after scanning.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    {itemsToReturn.length > 0 && <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
                            JSON.stringify({ t: 'r', ids: itemsToReturn.map(i => i.id) })
                        )}`}
                        alt="Return QR Code"
                        width={256}
                        height={256}
                        className="rounded-lg bg-white p-2"
                        data-ai-hint="qr code"
                    />}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setItemsToReturn([])}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!claimQrPayload} onOpenChange={(open) => !open && setClaimQrPayload(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2">Reservation Claim QR Code</DialogTitle>
                    <DialogDescription>Present this QR code to lab staff to claim your reserved items.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    {claimQrPayload && <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(claimQrPayload)}`}
                        alt="Reservation Claim QR Code"
                        width={256}
                        height={256}
                        className="rounded-lg bg-white p-2"
                        data-ai-hint="qr code"
                    />}
                </div>
                <DialogFooter>
                    <Button onClick={() => setClaimQrPayload(null)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
