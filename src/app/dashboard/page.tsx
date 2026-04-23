
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, addDoc, doc, updateDoc, writeBatch } from "firebase/firestore"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, CornerDownLeft, Settings, QrCode, Inbox, PackageCheck, Hourglass, Loader2, History, CalendarDays, XCircle, PackageSearch } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

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

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, departments, channels, allUsers, channelAccessRequests } = useAppContext();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);

  const teachersForDialog = React.useMemo(() => {
      if (!selectedChannelId || !channelAccessRequests || !allUsers) return [];
      
      // Find approved teacher IDs for the selected lab
      const approvedTeacherIds = new Set(
          channelAccessRequests
              .filter(req => req.channelId === selectedChannelId && req.status === 'approved')
              .map(req => req.teacherId)
      );
  
      // Filter all users to get the teacher objects
      return allUsers
          .filter(user => user.role === 'Teacher' && approvedTeacherIds.has(user.id))
          .map(t => ({ id: t.id, name: t.displayName }));
  
  }, [selectedChannelId, channelAccessRequests, allUsers]);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login?role=student")
    }
  }, [user, isUserLoading, router])

  const [activeView, setActiveView] = React.useState<'borrow' | 'activity'>('borrow');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'requests' | 'reservations' | 'history' | 'issues'>('borrowed');

  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string| null>(null)
  
  React.useEffect(() => {
    if (!selectedDepartmentId && departments.length > 0) {
      setSelectedDepartmentId(departments[0].id);
    }
  }, [departments, selectedDepartmentId]);

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
    () => allItems.filter((item) => item.channelId === selectedChannelId),
    [allItems, selectedChannelId]
  )
  
  const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId, channels])
  const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId, departments]);

  const handleItemSelect = (item: InventoryItem) => {
    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        return; // Already in cart, do nothing
    }

    if (pendingRequestedItemNames.has(item.name)) {
        toast({
            title: "Request Already Pending",
            description: `You already have a pending request for "${item.name}".`,
        });
        return;
    }

    const isApproved = approvedForBorrowItemNames.has(item.name);

    // Primary conditions for adding an item to the cart
    const isAvailable = item.status === "Available" && item.quantity > 0;
    const isApprovedAndLocked = item.status === "Locked" && isApproved && item.quantity > 0;
    // This case handles data inconsistencies where an item is borrowed but still has stock.
    const isBorrowableInconsistency = item.status === "Borrowed" && item.quantity > 0;
    
    if (isAvailable || isApprovedAndLocked || isBorrowableInconsistency) {
        setSelectedItems((prev) => [...prev, { item, quantity: 1 }])
        if (isApprovedAndLocked) {
            toast({
                title: "Approved Item Added",
                description: `"${item.name}" has been added to your cart.`,
            });
        }
        return;
    }

    // Condition to request approval for a locked item
    if (item.status === "Locked" && !isApproved) {
        setItemToRequest(item);
        setIsApprovalDialogOpen(true);
        return;
    }
    
    // All other cases are unavailable. Show a more descriptive toast.
    toast({
        variant: "destructive",
        title: "Item Unavailable",
        description: `"${item.name}" is not available for borrowing at this time. Its current status is: ${item.status}.`,
    });
  }

  const handleConfirmRequest = async (teacherId: string) => {
    if (!itemToRequest || !user?.displayName || !firestore || !user.uid) return;
    
    const newRequest: Omit<BorrowHistory, 'id'> = {
        studentName: user.displayName,
        itemName: itemToRequest.name,
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
          description: `Your request for "${itemToRequest.name}" has been sent for approval.`,
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
        const batch = writeBatch(firestore);
        const recordsToCancel = borrowHistory.filter(h => h.reservationId === reservationId && h.status === 'Pending');
        
        if (recordsToCancel.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot Cancel', description: 'This reservation is no longer pending.' });
            return;
        }

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
  
  const getDeptIcon = (prefix: string) => {
    if (prefix.startsWith('comp')) return <Cpu />;
    if (prefix.startsWith('chem')) return <FlaskConical />;
    if (prefix.startsWith('robo')) return <Cog />;
    return <User />;
  }

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (departments.length === 0) {
     return (
      <TooltipProvider>
       <div className="flex h-screen bg-[#1e2430]">
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
            <div className="flex flex-1">
                 <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
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
                 <div className="w-64 flex-col bg-[#141821] p-2">
                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
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
                          <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Student"}</p>
                          <p className="text-xs text-muted-foreground">Student</p>
                        </div>
                    </div>
                  </UserProfileModal>
                  <UserNav role="Student" />
              </div>
            </div>
        </div>
         <main className="flex-1 flex flex-col h-screen">
          <header className="flex items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                  </SheetContent>
                </Sheet>
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">No Labs Available</h1>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
                <PackageSearch className="mx-auto h-16 w-16" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">Nothing to see here yet!</h2>
                <p className="mt-2">No laboratories have been set up by the administrator.</p>
                <p>Please check back later.</p>
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
      <div className="flex h-screen bg-[#1e2430]">
        {/* Combined Sidebar */}
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
            <div className="flex flex-1">
                 {/* Department Rail */}
                <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                  <div className="p-2 mb-2">
                    <Logo />
                  </div>
                  <div className="flex flex-col items-center gap-2 w-full">
                    {departments.map(dept => (
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
                </div>

                {/* Channel List */}
                {activeView === 'borrow' ? (
                    <div className="w-64 flex-col bg-[#141821] p-2">
                        <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                          {selectedDepartment?.name}
                        </div>
                        <AppSidebar
                          departmentId={selectedDepartmentId}
                          selectedChannelId={selectedChannelId}
                          onChannelSelect={handleChannelSelect}
                        />
                    </div>
                ) : (
                    <div className="w-64 flex-col bg-[#141821] p-2">
                        <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                            My Activity
                        </div>
                         <div className="flex-1 py-4">
                            <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                CATEGORIES
                            </h2>
                            <ul className="flex flex-col gap-1">
                                {activityNavItems.map(navItem => (
                                    <li key={navItem.id}>
                                        <button
                                            onClick={() => setActivitySubView(navItem.id)}
                                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${
                                                activitySubView === navItem.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                            }`}
                                        >
                                            {React.cloneElement(navItem.icon, { className: 'h-5 w-5' })}
                                            <span className="truncate">{navItem.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
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
                          <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Student"}</p>
                          <p className="text-xs text-muted-foreground">Student</p>
                        </div>
                    </div>
                  </UserProfileModal>
                  <UserNav role="Student" />
              </div>
            </div>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen">
          <header className="flex items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
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
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                                Departments
                            </div>
                            <div className="p-2 space-y-1">
                                {departments.map(dept => (
                                    <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>
                                        {getDeptIcon(dept.prefix)}
                                        {dept.name}
                                    </Button>
                                ))}
                            </div>
                            {activeView === 'borrow' && selectedDepartmentId && (
                                <AppSidebar
                                    departmentId={selectedDepartmentId}
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
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                          <div className="flex items-center justify-between p-2">
                              <UserProfileModal role="Student">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                        <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                      <p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Student"}</p>
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
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name?.replace('#', '') || 'Select a Lab'}</h1>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    {React.cloneElement(activityNavItems.find(i => i.id === activitySubView)?.icon || <Inbox/>, { className: "text-muted-foreground" })}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">
                       {activityNavItems.find(i => i.id === activitySubView)?.label}
                    </h1>
                </div>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {activeView === 'borrow' ? (
                <InventoryGrid 
                items={items} 
                onItemSelect={handleItemSelect}
                selectedItems={selectedItems.map(ci => ci.item)}
                pendingRequestedItemNames={Array.from(pendingRequestedItemNames)} 
                approvedForBorrowItemNames={Array.from(approvedForBorrowItemNames)}
                />
            ) : (
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
            )}
          </div>
        </main>
        
        {/* Cart - now responsive */}
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
                    <DialogTitle className="font-headline flex items-center gap-2"><QrCode/> Return QR Code for {itemsToReturn.length} item(s)</DialogTitle>
                    <DialogDescription>Present this QR code to lab staff to process your return.</DialogDescription>
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
                    <Button onClick={() => setItemsToReturn([])}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!claimQrPayload} onOpenChange={(open) => !open && setClaimQrPayload(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><QrCode/> Reservation Claim QR Code</DialogTitle>
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
