
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, addDoc, doc, updateDoc, writeBatch } from "firebase/firestore"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, CornerDownLeft, Settings, QrCode, Inbox, PackageCheck, Hourglass, Loader2, History, CalendarDays, XCircle, PackageSearch, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { isToday } from "date-fns"

import type { InventoryItem, BorrowHistory, CartItem, User as UserType } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { RequestApprovalDialog } from "@/components/request-approval-dialog"
import { StudentActivity } from "@/components/student-activity"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, departments, channels, allUsers, channelAccessRequests, studentDepartmentAccessRequests } = useAppContext();

  const [activeView, setActiveView] = React.useState<'borrow' | 'activity'>('borrow');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'requests' | 'reservations' | 'history' | 'issues'>('borrowed');
  
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string| null>(null);
  const [isLabsOpen, setIsLabsOpen] = React.useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  const approvedDepartmentIds = React.useMemo(() => 
    new Set(studentDepartmentAccessRequests.filter(req => req.studentId === user?.uid && req.status === 'approved').map(req => req.departmentId))
  , [studentDepartmentAccessRequests, user]);

  const studentDepartments = React.useMemo(() => 
      departments.filter(dept => approvedDepartmentIds.has(dept.id))
  , [departments, approvedDepartmentIds]);

  const teachersForDialog = React.useMemo(() => {
      if (!selectedChannelId || !channelAccessRequests || !allUsers) return [];
      
      const approvedTeacherIds = new Set(
          channelAccessRequests
              .filter(req => req.channelId === selectedChannelId && req.status === 'approved')
              .map(req => req.teacherId)
      );
  
      return allUsers
          .filter(user => user.role === 'Teacher' && approvedTeacherIds.has(user.id))
          .map(t => ({ id: t.id, name: t.displayName }));
  
  }, [selectedChannelId, channelAccessRequests, allUsers]);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push("/login?role=student");
    } else if (!user.emailVerified) {
      router.push("/verify-email");
    }
  }, [user, isUserLoading, router]);

  React.useEffect(() => {
    if (studentDepartments.length > 0 && !selectedDepartmentId) {
      setSelectedDepartmentId(studentDepartments[0].id);
    } else if (studentDepartments.length === 0) {
        setActiveView('activity');
    }
  }, [studentDepartments, selectedDepartmentId]);

  React.useEffect(() => {
    if (selectedDepartmentId) {
        const firstChannel = channels.find(c => c.departmentId === selectedDepartmentId);
        setSelectedChannelId(firstChannel?.id ?? null);
    }
  }, [selectedDepartmentId, channels]);
  
  
  const [selectedItems, setSelectedItems] = React.useState<CartItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = React.useState(false);
  const [itemToRequest, setItemToRequest] = React.useState<InventoryItem | null>(null);
  const [itemsToReturn, setItemsToReturn] = React.useState<BorrowHistory[]>([]);
  const [claimQrPayload, setClaimQrPayload] = React.useState<string | null>(null);

  const studentBorrowHistory = React.useMemo(() => {
    if (!user?.uid) return [];
    return borrowHistory.filter(h => h.borrowerUserId === user.uid);
  }, [borrowHistory, user]);

  React.useEffect(() => {
    if (itemsToReturn.length > 0 && borrowHistory.length > 0) {
      const allItemsInDialogReturned = itemsToReturn.every(itemInDialog => {
        const correspondingItemInHistory = borrowHistory.find(h => h.id === itemInDialog.id);
        return correspondingItemInHistory?.status === 'Returned';
      });

      if (allItemsInDialogReturned) {
        toast({
          title: "Return Complete!",
          description: "Your items have been successfully returned.",
        });
        setItemsToReturn([]);
      }
    }
  }, [borrowHistory, itemsToReturn, toast]);


  const pendingRequestedItemNames = React.useMemo(() =>
    new Set(studentBorrowHistory
      .filter(h => h.status === 'Pending')
      .map(h => h.itemName)),
    [studentBorrowHistory]
  );
  
  const approvedForBorrowItemNames = React.useMemo(() =>
    new Set(studentBorrowHistory
        .filter(h => h.status === 'Approved' && !h.checkoutSessionId)
        .map(h => h.itemName)),
    [studentBorrowHistory]
  );
  
  const handleDepartmentSelect = (deptId: string) => {
    setActiveView('borrow');
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = channels.find(c => c.departmentId === deptId);
    setSelectedChannelId(firstChannelInDept?.id ?? null);
    setSelectedItems([]);
    setIsMobileMenuOpen(false);
  }

  const handleActivitySelect = () => {
    setActiveView('activity');
    setActivitySubView('borrowed');
    setIsMobileMenuOpen(false);
  }

  const items = React.useMemo(
    () => allItems.filter((item) => item.channelId === selectedChannelId && item.isVisibleToStudents !== false),
    [allItems, selectedChannelId]
  )
  
  const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId, channels])
  const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId, departments]);
  const channelsForSidebar = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return channels.filter(c => c.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId, channels]);

  const handleItemSelect = (item: InventoryItem) => {
    if (item.quantity === 0) return;
    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        setSelectedItems(prev => prev.filter(ci => ci.item.id !== item.id));
        return;
    }

    if (pendingRequestedItemNames.has(item.name)) {
        toast({
            title: "Request Already Pending",
            description: `You already have a pending request for "${item.name}".`,
        });
        return;
    }

    const studentApprovedRecords = studentBorrowHistory.filter(h => h.status === 'Approved' && !h.checkoutSessionId && h.itemName === item.name);
    const isApproved = studentApprovedRecords.length > 0;

    const isAvailable = item.status === "Available" && item.quantity > 0;
    const isApprovedAndLocked = item.status === "Locked" && isApproved && item.quantity > 0;
    const isBorrowableInconsistency = item.status === "Borrowed" && item.quantity > 0;
    
    if (isAvailable || isBorrowableInconsistency) {
        setSelectedItems((prev) => [...prev, { item, quantity: 1 }]);
        return;
    }

    if (isApprovedAndLocked) {
        const totalApprovedQuantity = studentApprovedRecords.reduce((sum, record) => sum + (record.itemQuantity || 0), 0);
        
        if (totalApprovedQuantity > 0) {
            setSelectedItems((prev) => [...prev, { item, quantity: totalApprovedQuantity }])
            toast({
                title: "Approved Item Added",
                description: `All your approved "${item.name}" (x${totalApprovedQuantity}) have been added to your cart.`,
            });
        } else {
             toast({ variant: 'destructive', title: "Approval Error", description: "Could not find approved quantity." });
        }
        return;
    }

    if (item.status === "Locked" && !isApproved) {
        setItemToRequest(item);
        setIsApprovalDialogOpen(true);
        return;
    }
    
    toast({
        variant: "destructive",
        title: "Item Unavailable",
        description: `"${item.name}" is not available for borrowing at this time. Its current status is: ${item.status}.`,
    });
  }

  const handleConfirmRequest = async (teacherId: string, quantity: number) => {
    if (!itemToRequest || !user?.displayName || !firestore || !user.uid) return;
    
    const newRequest: Omit<BorrowHistory, 'id'> = {
        studentName: user.displayName,
        itemName: itemToRequest.name,
        itemQuantity: quantity,
        date: new Date().toISOString(),
        status: 'Pending',
        teacherId: teacherId,
        borrowerUserId: user.uid,
    };

    try {
      await addDoc(collection(firestore, 'borrowing_transactions'), newRequest);
      setIsApprovalDialogOpen(false);
      setItemToRequest(null);
      toast({
          title: "Approval Request Sent",
          description: `Your request for ${quantity} of "${itemToRequest.name}" has been sent for approval.`,
      });
    } catch (error) {
      console.error("Error sending request:", error);
      toast({ variant: 'destructive', title: 'Failed to send request' });
    }
  }
  
  const handleInitiateReturn = (records: BorrowHistory[]) => {
    if (!records.length) return;
    setItemsToReturn(records);
  }

  const handleCancelReservation = async (reservationId: string) => {
    if (!firestore) return;
    try {
        const recordsToCancel = borrowHistory.filter(h => h.reservationId === reservationId && (h.status === 'Pending' || h.status === 'Reserved'));
        
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
            description: "Your reservation request has been cancelled.",
        });
    } catch (error) {
        console.error("Error cancelling reservation:", error);
        toast({ variant: 'destructive', title: 'Failed to cancel reservation' });
    }
  }


  const handleChannelSelect = (id: string) => {
    setSelectedChannelId(id)
    setSelectedItems([])
    setIsMobileMenuOpen(false)
  }

  const handleItemQuantityChange = (itemId: string, newQuantity: number) => {
    const cartItem = selectedItems.find(ci => ci.item.id === itemId);
    if (!cartItem) return;

    if (newQuantity > cartItem.item.quantity) {
        toast({ variant: 'destructive', title: `Only ${cartItem.item.quantity} available.`});
        return;
    }

    if (newQuantity <= 0) {
        setSelectedItems(prev => prev.filter(ci => ci.item.id !== itemId));
    } else {
        setSelectedItems(prev => prev.map(ci => 
            ci.item.id === itemId ? { ...ci, quantity: newQuantity } : ci
        ));
    }
  };
  
  const getDeptIcon = (prefix: string) => {
    if (prefix.startsWith('comp')) return <Cpu />;
    if (prefix.startsWith('chem')) return <FlaskConical />;
    if (prefix.startsWith('robo')) return <Cog />;
    return <User />;
  }

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (studentDepartments.length === 0) {
     return (
      <TooltipProvider>
       <div className="flex h-dvh bg-[#1e2430]">
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
            <div className="flex flex-1 overflow-hidden h-full">
                 <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 w-[72px] border-r border-border/50">
                  <div className="p-2 mb-2"><Logo /></div>
                  <div className="flex flex-col items-center gap-2 w-full">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={'ghost'} size="icon" className="h-12 w-12 rounded-lg" disabled>
                                <Inbox />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center"><p>My Activity</p></TooltipContent>
                    </Tooltip>
                  </div>
                 </div>
                 <div className="w-64 flex flex-col bg-[#141821] p-2">
                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">
                        No Departments
                    </div>
                 </div>
            </div>
            <div className="border-t border-border/50 bg-[#0e1015]">
              <div className="flex items-center justify-between p-2">
                   <UserProfileModal role="Student">
                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                            <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || user?.displayName || "Student"}</p>
                          <p className="text-xs text-muted-foreground">Student</p>
                        </div>
                    </div>
                  </UserProfileModal>
                  <UserNav role="Student" />
              </div>
            </div>
        </div>
         <main className="flex-1 flex flex-col h-dvh">
          <header className="flex h-16 items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                     <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">
                                Menu
                            </div>
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                You don't have access to any labs yet. Request access from your profile.
                            </div>
                        </div>
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015] pb-8">
                            <div className="flex items-center justify-between p-2">
                                <UserProfileModal role="Student">
                                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                            <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || user?.displayName || "Student"}</p>
                                            <p className="text-xs text-muted-foreground">Student</p>
                                        </div>
                                    </div>
                                </UserProfileModal>
                                <UserNav role="Student" />
                            </div>
                        </div>
                      </div>
                  </SheetContent>
                </Sheet>
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">No Labs Available</h1>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
                <PackageSearch className="mx-auto h-16 w-16" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">No Approved Departments</h2>
                <p className="mt-2">You do not have access to any departments yet.</p>
                <p>Request access via your user profile to get started.</p>
            </div>
          </div>
        </main>
      </div>
      </TooltipProvider>
    );
  }

  const activityNavItems = [
    { id: 'borrowed', label: 'My Borrowed Items', icon: <PackageCheck /> },
    { id: 'requests', label: 'My Requests', icon: <Hourglass /> },
    { id: 'reservations', label: 'My Reservations', icon: <CalendarDays /> },
    { id: 'history', label: 'History Log', icon: <History /> },
    { id: 'issues', label: 'Damaged/Lost Items', icon: <XCircle /> },
  ] as const;

  return (
    <TooltipProvider>
      <div className="flex h-dvh bg-[#1e2430]">
        {/* PERSISTENT SIDEBAR WRAPPER */}
        <div className={cn(
            "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full",
            isSidebarCollapsed ? "w-[72px]" : "w-[320px]"
        )}>
            <div className="flex flex-1 overflow-hidden h-full">
                {/* RAIL - ALWAYS VISIBLE */}
                <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                  <div className="p-2 mb-2">
                    <Logo />
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 w-full">
                    {studentDepartments.map(dept => (
                      <Tooltip key={dept.id}>
                          <TooltipTrigger asChild>
                              <Button 
                                variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'}
                                size="icon" 
                                className="h-12 w-12 rounded-lg"
                                onClick={() => handleDepartmentSelect(dept.id)}>
                                  {getDeptIcon(dept.prefix)}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="center">
                            <p>{dept.name}</p>
                          </TooltipContent>
                      </Tooltip>
                    ))}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                            variant={activeView === 'activity' ? 'secondary' : 'ghost'}
                            size="icon" 
                            className="h-12 w-12 rounded-lg"
                            onClick={handleActivitySelect}>
                                <Inbox />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">
                        <p>My Activity</p>
                        </TooltipContent>
                    </Tooltip>
                  </div>
                  {isSidebarCollapsed && (
                      <div className="pb-4 mt-auto">
                        <UserProfileModal role="Student">
                             <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                                <AvatarImage src={user?.photoURL || undefined} />
                                <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                             </Avatar>
                        </UserProfileModal>
                      </div>
                  )}
                </div>

                {/* SIDEBAR CONTENT - COLLAPSIBLE */}
                <div 
                    className={cn(
                        "flex flex-col bg-[#141821] transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full",
                        isSidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
                    )}
                >
                    <div className="w-64 flex flex-col h-full">
                        {activeView === 'borrow' ? (
                            <div className="flex flex-col h-full">
                                <button 
                                    onClick={() => setIsLabsOpen(!isLabsOpen)}
                                    className="flex w-full items-center justify-between p-4 font-headline text-lg font-bold border-b border-border/50 group text-white"
                                >
                                    <span className="truncate">{selectedDepartment?.name}</span>
                                    {isLabsOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />}
                                </button>
                                {isLabsOpen && (
                                    <div className="flex-1 overflow-y-auto">
                                        <AppSidebar
                                            department={selectedDepartment}
                                            channelsInDept={channelsForSidebar}
                                            selectedChannelId={selectedChannelId}
                                            onChannelSelect={handleChannelSelect}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">
                                    My Activity
                                </div>
                                 <div className="flex-1 py-4 overflow-y-auto">
                                    <h2 className="mb-2 px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                                        CATEGORIES
                                    </h2>
                                    <ul className="flex flex-col gap-1 px-2">
                                        {activityNavItems.map(navItem => (
                                            <li key={navItem.id}>
                                                <button
                                                    onClick={() => setActivitySubView(navItem.id)}
                                                    className={cn(
                                                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                                                        activitySubView === navItem.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                                    )}
                                                >
                                                    {React.cloneElement(navItem.icon, { className: 'h-4 w-4' })}
                                                    <span className="truncate">{navItem.label}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                            <div className="flex items-center justify-between p-2">
                                <UserProfileModal role="Student">
                                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                            <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                        <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || user?.displayName || "Student"}</p>
                                        <p className="text-xs text-muted-foreground">Student</p>
                                        </div>
                                    </div>
                                </UserProfileModal>
                                <UserNav role="Student" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOGGLE BUTTON */}
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={cn(
                    "absolute -right-3 top-12 z-50 h-6 w-6 rounded-full bg-[#141821] border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-md group",
                    isSidebarCollapsed && "bg-[#0e1015]"
                )}
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isSidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-dvh overflow-hidden">
          <header className="flex h-16 items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="md:hidden">
                          <Menu />
                          <span className="sr-only">Open Menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                      <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">
                                Departments
                            </div>
                            <div className="p-2 space-y-1">
                                {studentDepartments.map(dept => (
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
                            <Separator className="my-2" />
                            <div className="p-2 space-y-1">
                                {activityNavItems.map(navItem => (
                                     <Button key={navItem.id} variant={activeView === 'activity' && activitySubView === navItem.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('activity'); setActivitySubView(navItem.id); setIsMobileMenuOpen(false); }}>
                                        {navItem.icon}
                                        {navItem.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015] pb-8">
                          <div className="flex items-center justify-between p-2">
                              <UserProfileModal role="Student">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                        <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                      <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || user?.displayName || "Student"}</p>
                                      <p className="text-xs text-muted-foreground">Student</p>
                                    </div>
                                </div>
                              </UserProfileModal>
                              <UserNav role="Student" />
                          </div>
                        </div>
                      </div>
                  </SheetContent>
              </Sheet>
              {activeView === 'borrow' ? (
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">{selectedChannel?.name?.replace('#', '') || 'Select a Lab'}</h1>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    {React.cloneElement(activityNavItems.find(i => i.id === activitySubView)?.icon || <Inbox/>, { className: "text-muted-foreground" })}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">
                       {activityNavItems.find(i => i.id === activitySubView)?.label}
                    </h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden md:flex bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">
                  {userProfile?.role || 'Student'}
              </Badge>
              <UserNav role="Student" />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {activeView === 'borrow' ? (
                <div className="animate-in fade-in duration-500">
                    <InventoryGrid 
                    items={items} 
                    onItemSelect={handleItemSelect}
                    selectedItems={selectedItems.map(ci => ci.item)}
                    pendingRequestedItemNames={Array.from(pendingRequestedItemNames)} 
                    approvedForBorrowItemNames={Array.from(approvedForBorrowItemNames)}
                    />
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <StudentActivity 
                        borrowHistory={studentBorrowHistory} 
                        onReturn={handleInitiateReturn} 
                        view={activitySubView}
                        onCancelReservation={handleCancelReservation}
                        onClaimReservation={(reservationId) => {
                            const payload = {
                                t: 'res-claim',
                                rId: reservationId
                            };
                            setClaimQrPayload(JSON.stringify(payload));
                        }}
                    />
                </div>
            )}
          </div>
        </main>
        
        {/* Cart - responsive */}
        {activeView === 'borrow' && (
            <CheckoutFlow
            key={selectedChannelId}
            items={selectedItems}
            onItemQuantityChange={handleItemQuantityChange}
            onClear={() => setSelectedItems([])}
            onSuccess={() => {
                setSelectedItems([]);
            }}
            />
        )}

        <RequestApprovalDialog
          item={itemToRequest}
          teachers={teachersForDialog}
          open={isApprovalDialogOpen}
          onOpenChange={setIsApprovalDialogOpen}
          onConfirm={handleConfirmRequest}
        />
        
        <Dialog open={itemsToReturn.length > 0} onOpenChange={(open) => !open && setItemsToReturn([])}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><QrCode/> Return QR Code for {itemsToReturn.length} item(s)</DialogTitle>
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
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><QrCode/> Reservation Claim QR Code</DialogTitle>
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

