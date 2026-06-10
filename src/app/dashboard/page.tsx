
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, addDoc, writeBatch } from "firebase/firestore"
import { 
    LayoutGrid, Inbox, PackageCheck, Hourglass, CalendarDays, 
    XCircle, History, Menu, Hash, Search, Filter, 
    CheckCircle, ChevronDown, ChevronRight, ChevronLeft, 
    Loader2, Sparkles, Clock, AlertCircle, ShoppingCart
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { isToday, format } from "date-fns"

import type { InventoryItem, BorrowHistory, CartItem, User as UserType } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { StudentInventoryGrid } from "@/components/student/student-inventory-grid"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { StudentItemDetailsDialog } from "@/components/student/student-item-details-dialog"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { QrCode } from "lucide-react"

type StudentView = 'overview' | 'borrow' | 'activity';

export default function StudentDashboardPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, departments, channels, allUsers, channelAccessRequests, studentDepartmentAccessRequests } = useAppContext();

  const [activeView, setActiveView] = React.useState<StudentView>('overview');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'requests' | 'reservations' | 'history' | 'issues'>('borrowed');
  
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string| null>(null);
  const [isLabsOpen, setIsLabsOpen] = React.useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = React.useState(false);

  // Detail Modal State
  const [itemInDetail, setItemInDetail] = React.useState<InventoryItem | null>(null);

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

  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    allItems.forEach(item => {
        if (Array.isArray(item.categories)) {
            item.categories.forEach(c => categories.add(c));
        } else if (item.category) {
            categories.add(item.category);
        }
    });
    return Array.from(categories).sort();
  }, [allItems]);

  const teachersForDialog = React.useMemo(() => {
      if (!channelAccessRequests) return [];
      
      const bestNamesMap = new Map<string, string>();

      if (allUsers && allUsers.length > 0) {
          allUsers.forEach(u => {
              if (u.role === 'Teacher') {
                  const name = u.displayName || (u as any).name || (u as any).fullName || u.email;
                  if (name) bestNamesMap.set(u.id, name);
              }
          });
      }

      channelAccessRequests.forEach(req => {
          if (req.teacherId && req.teacherName) {
              const currentBest = bestNamesMap.get(req.teacherId);
              const isCurrentGeneric = !currentBest || currentBest === 'Unknown Teacher' || currentBest === 'Teacher';
              const isNewBetter = req.teacherName && req.teacherName !== 'Unknown Teacher' && req.teacherName !== 'Teacher';
              
              if (isCurrentGeneric && (isNewBetter || !currentBest)) {
                  bestNamesMap.set(req.teacherId, req.teacherName);
              }
          }
      });

      let relevantTeacherIds = new Set<string>();

      const channelRequests = channelAccessRequests.filter(req => 
          req.status === 'approved' && req.channelId === selectedChannelId
      );
      channelRequests.forEach(req => relevantTeacherIds.add(req.teacherId));

      if (relevantTeacherIds.size === 0 && selectedDepartmentId) {
          const deptRequests = channelAccessRequests.filter(req => 
              req.status === 'approved' && req.departmentId === selectedDepartmentId
          );
          deptRequests.forEach(req => relevantTeacherIds.add(req.teacherId));
      }

      if (relevantTeacherIds.size === 0) {
          const allApproved = channelAccessRequests.filter(req => req.status === 'approved');
          allApproved.forEach(req => relevantTeacherIds.add(req.teacherId));
      }

      return Array.from(relevantTeacherIds).map(id => {
          let name = bestNamesMap.get(id);
          if (!name || name === 'Unknown Teacher' || name === 'Teacher') {
              name = "Teacher Profile Missing";
          }
          return { id, name };
      });
  
  }, [selectedChannelId, selectedDepartmentId, channelAccessRequests, allUsers]);

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

  const filteredItems = React.useMemo(() => {
    let list = allItems.filter(item => 
        (activeView === 'borrow' ? item.channelId === selectedChannelId : true) &&
        item.isVisibleToStudents !== false
    );

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(item => 
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            channels.find(c => c.id === item.channelId)?.name.toLowerCase().includes(q)
        );
    }

    if (categoryFilter !== 'all') {
        list = list.filter(item => {
            const cats = Array.isArray(item.categories) ? item.categories : (item.category ? [item.category] : []);
            return cats.includes(categoryFilter);
        });
    }

    if (showAvailableOnly) {
        list = list.filter(item => item.quantity > 0 && item.status === 'Available');
    }

    return list;
  }, [allItems, searchQuery, categoryFilter, showAvailableOnly, selectedChannelId, activeView, channels]);

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

  const handleItemSelect = (item: InventoryItem) => {
    if (item.quantity === 0) return;
    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        setSelectedItems(prev => prev.filter(ci => ci.item.id !== item.id));
        return;
    }

    if (pendingRequestedItemNames.has(item.name)) {
        toast({ title: "Request Already Pending", description: `You already have a pending request for "${item.name}".` });
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
        setSelectedItems((prev) => [...prev, { item, quantity: totalApprovedQuantity }])
        toast({ title: "Approved Item Added", description: `"${item.name}" (x${totalApprovedQuantity}) added to cart.` });
        return;
    }

    if (item.status === "Locked" && !isApproved) {
        setItemToRequest(item);
        setIsApprovalDialogOpen(true);
        return;
    }
    
    toast({ variant: "destructive", title: "Item Unavailable", description: `"${item.name}" is currently ${item.status}.` });
  }

  const handleConfirmRequest = async (teacherId: string, quantity: number) => {
    if (!itemToRequest || !firestore || !user?.uid) return;
    
    const studentDisplayName = userProfile?.displayName || user.displayName || 'Student';

    try {
      await addDoc(collection(firestore, 'borrowing_transactions'), {
        studentName: studentDisplayName,
        itemName: itemToRequest.name,
        inventoryItemId: itemToRequest.id,
        itemQuantity: quantity,
        date: new Date().toISOString(),
        status: 'Pending',
        teacherId: teacherId,
        borrowerUserId: user.uid,
      });
      
      setIsApprovalDialogOpen(false);
      setItemToRequest(null);
      setItemInDetail(null);
      toast({ title: "Approval Request Sent", description: `Request for ${itemToRequest.name} sent to teacher.` });
    } catch (error) {
      console.error("Failed to create request:", error);
      toast({ variant: 'destructive', title: 'Failed to send request' });
    }
  }
  
  const handleInitiateReturn = (records: BorrowHistory[]) => records.length && setItemsToReturn(records);

  const handleCancelReservation = async (reservationId: string) => {
    if (!firestore) return;
    try {
        const recordsToCancel = borrowHistory.filter(h => h.reservationId === reservationId && (h.status === 'Pending' || h.status === 'Reserved'));
        const batch = writeBatch(firestore);
        recordsToCancel.forEach(record => batch.update(doc(firestore, 'borrowing_transactions', record.id), { status: 'Cancelled' }));
        await batch.commit();
        toast({ title: "Reservation Cancelled" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to cancel' });
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
    setSelectedItems(prev => newQuantity <= 0 ? prev.filter(ci => ci.item.id !== itemId) : prev.map(ci => ci.item.id === itemId ? { ...ci, quantity: newQuantity } : ci));
  };
  
  const getDeptIcon = (prefix: string) => {
    const p = prefix.toLowerCase();
    if (p.includes('comp')) return <LayoutGrid />;
    if (p.includes('chem')) return <Sparkles />;
    if (p.includes('robo')) return <Clock />;
    return <PackageCheck />;
  }

  const renderOverview = () => {
    const currentlyBorrowed = studentBorrowHistory.filter(h => h.status === 'Active').length;
    const pendingReqs = studentBorrowHistory.filter(h => h.status === 'Pending').length;
    const activeRes = studentBorrowHistory.filter(h => h.status === 'Reserved').length;
    const recentEvents = studentBorrowHistory.slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold font-headline tracking-tight text-white">Welcome back, {userProfile?.displayName?.split(' ')[0] || 'Student'}</h2>
                <p className="text-muted-foreground text-sm">Here's what's happening with your laboratory equipment.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Currently Borrowed</CardTitle>
                        <PackageCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{currentlyBorrowed}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Requests</CardTitle>
                        <Hourglass className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{pendingReqs}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Reservations</CardTitle>
                        <CalendarDays className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{activeRes}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issues Reported</CardTitle>
                        <XCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{studentBorrowHistory.filter(h => h.returnCondition && h.returnCondition !== 'Good').length}</div></CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card/40 border-border/50 h-fit">
                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Recent Activity</CardTitle></CardHeader>
                    <CardContent>
                        {recentEvents.length > 0 ? (
                            <div className="space-y-4">
                                {recentEvents.map(event => (
                                    <div key={event.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{event.status}</p>
                                                <span className="text-[10px] text-muted-foreground">{format(new Date(event.date), 'MMM d, p')}</span>
                                            </div>
                                            <p className="text-sm text-white mt-0.5">{event.itemName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm italic">You have no recent activity.</div>
                        )}
                        <Button variant="link" className="w-full text-xs text-primary mt-4" onClick={() => setActiveView('activity')}>View full history log</Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/50">
                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Quick Start</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select an approved department to start browsing and borrowing equipment.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {studentDepartments.map(dept => (
                                <Button key={dept.id} variant="secondary" className="justify-start gap-2 text-xs" onClick={() => handleDepartmentSelect(dept.id)}>
                                    {getDeptIcon(dept.prefix)} {dept.name}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  };

  const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId, channels])
  const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId, departments]);
  const channelsForSidebar = React.useMemo(() => {
    if (!selectedDepartmentId) return [];
    return channels.filter(c => c.departmentId === selectedDepartmentId);
  }, [selectedDepartmentId, channels]);

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (studentDepartments.length === 0 && activeView !== 'activity') {
     return (
      <TooltipProvider>
       <div className="flex h-dvh bg-[#1e2430]">
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50 shrink-0 w-[72px]">
             <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 h-full border-r border-border/50">
              <div className="p-2 mb-2"><Logo /></div>
              <div className="flex flex-col items-center gap-2 w-full">
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={activeView === 'activity' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => setActiveView('activity')}>
                            <Inbox />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center"><p>My Activity</p></TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-auto pb-4">
                <UserProfileModal role="Student">
                    <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                        <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                </UserProfileModal>
              </div>
             </div>
        </div>
         <main className="flex-1 flex flex-col h-dvh">
          <header className="flex h-16 items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                <Logo />
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white ml-2">Orbit Access Hub</h1>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
            {activeView === 'activity' ? (
                <div className="w-full max-w-4xl"><StudentActivity borrowHistory={studentBorrowHistory} onReturn={handleInitiateReturn} view={activitySubView} onCancelReservation={handleCancelReservation} onClaimReservation={(id) => setClaimQrPayload(JSON.stringify({ t: 'res-claim', rId: id }))} /></div>
            ) : (
                <div className="text-center text-muted-foreground animate-in zoom-in duration-500">
                    <AlertCircle className="mx-auto h-16 w-16 opacity-20" />
                    <h2 className="mt-4 text-xl font-semibold text-white">No Laboratory Access</h2>
                    <p className="mt-2 text-sm max-w-xs mx-auto">You do not have access to any departments yet. Request access via your profile to begin borrowing.</p>
                    <UserProfileModal role="Student">
                        <Button className="mt-6">Open Access Portal</Button>
                    </UserProfileModal>
                </div>
            )}
          </div>
        </main>
      </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-dvh bg-[#1e2430]">
        <div className={cn(
            "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full",
            isSidebarCollapsed ? "w-[72px]" : "w-[320px]"
        )}>
            <div className="flex flex-1 overflow-hidden h-full">
                <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                  <div className="p-2 mb-2"><Logo /></div>
                  <div className="flex-1 flex flex-col items-center gap-2 w-full">
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant={activeView === 'overview' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => setActiveView('overview')}><Logo className="h-5 w-5"/></Button>
                    </TooltipTrigger><TooltipContent side="right">Dashboard Home</TooltipContent></Tooltip>
                    
                    {studentDepartments.map(dept => (
                      <Tooltip key={dept.id}><TooltipTrigger asChild>
                          <Button variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleDepartmentSelect(dept.id)}>{getDeptIcon(dept.prefix)}</Button>
                      </TooltipTrigger><TooltipContent side="right">{dept.name}</TooltipContent></Tooltip>
                    ))}
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant={activeView === 'activity' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => { setActiveView('activity'); setActivitySubView('borrowed'); }}><Inbox /></Button>
                    </TooltipTrigger><TooltipContent side="right">My Activity</TooltipContent></Tooltip>
                  </div>
                  {isSidebarCollapsed && (
                      <div className="pb-4 mt-auto">
                        <UserProfileModal role="Student">
                             <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                                <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                             </Avatar>
                        </UserProfileModal>
                      </div>
                  )}
                </div>

                <div className={cn("flex flex-col bg-[#141821] transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full", isSidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100")}>
                    <div className="w-64 flex flex-col h-full">
                        {activeView === 'borrow' ? (
                            <div className="flex flex-col h-full">
                                <button onClick={() => setIsLabsOpen(!isLabsOpen)} className="flex w-full items-center justify-between p-4 font-headline text-lg font-bold border-b border-border/50 group text-white">
                                    <span className="truncate">{selectedDepartment?.name}</span>
                                    {isLabsOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                </button>
                                {isLabsOpen && <div className="flex-1 overflow-y-auto"><AppSidebar department={selectedDepartment} channelsInDept={channelsForSidebar} selectedChannelId={selectedChannelId} onChannelSelect={handleChannelSelect} /></div>}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white uppercase tracking-widest">{activeView === 'overview' ? 'Hub' : 'Activity'}</div>
                                 <div className="flex-1 py-4 overflow-y-auto px-2">
                                    {activeView === 'overview' ? (
                                        <p className="text-xs text-muted-foreground px-2 italic">Select a department rail icon to browse inventory.</p>
                                    ) : (
                                        <ul className="flex flex-col gap-1">
                                            {[{ id: 'borrowed', label: 'Borrowed Items', icon: <PackageCheck /> }, { id: 'requests', label: 'Requests', icon: <Hourglass /> }, { id: 'reservations', label: 'Reservations', icon: <CalendarDays /> }, { id: 'history', label: 'History Log', icon: <History /> }, { id: 'issues', label: 'Damaged/Lost', icon: <XCircle /> }].map(nav => (
                                                <li key={nav.id}>
                                                    <button onClick={() => setActivitySubView(nav.id as any)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors", activitySubView === nav.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white')}>
                                                        {React.cloneElement(nav.icon as any, { className: 'h-4 w-4' })} <span className="truncate">{nav.label}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                            <div className="flex items-center justify-between p-2">
                                <UserProfileModal role="Student">
                                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                        <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback>{userProfile?.displayName?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                                        <div className="overflow-hidden">
                                        <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || "Student"}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Student</p>
                                        </div>
                                    </div>
                                </UserProfileModal>
                                <UserNav role="Student" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={cn("absolute -right-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full bg-[#141821] border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-md group", isSidebarCollapsed && "bg-[#0e1015]")}>
                {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
        </div>
        
        <main className="flex-1 flex flex-col h-dvh overflow-hidden">
          <header className="flex h-16 items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger>
                  <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                      <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">Menu</div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          <Button variant={activeView === 'overview' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('overview'); setIsMobileMenuOpen(false); }}><Logo className="h-4 w-4"/> Home Hub</Button>
                          {studentDepartments.map(dept => (
                              <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>{getDeptIcon(dept.prefix)} {dept.name}</Button>
                          ))}
                          <Separator className="my-2" />
                          <Button variant={activeView === 'activity' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('activity'); setIsMobileMenuOpen(false); }}><Inbox className="h-4 w-4"/> My Activity</Button>
                      </div>
                  </SheetContent>
              </Sheet>
              {activeView === 'borrow' ? (
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground h-5 w-5" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">{selectedChannel?.name?.replace('#', '') || 'Inventory'}</h1>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    {activeView === 'overview' ? <Logo className="h-5 w-5" /> : <Inbox className="text-muted-foreground h-5 w-5" />}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">{activeView === 'overview' ? 'Orbit Home' : 'Activity Log'}</h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden md:flex bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">{userProfile?.role || 'Student'}</Badge>
              <UserNav role="Student" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {activeView === 'overview' ? renderOverview() : (activeView === 'borrow' ? (
                <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card/40 p-4 rounded-xl border border-border/50">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search name, description, or room..." className="pl-10 bg-black/20 border-border/40 focus:border-primary/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px] h-9 bg-black/20 border-border/40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2 bg-black/20 px-3 py-1.5 rounded-lg border border-border/40">
                                <Switch id="avail-filter" checked={showAvailableOnly} onCheckedChange={setShowAvailableOnly} />
                                <Label htmlFor="avail-filter" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">Available Only</Label>
                            </div>
                        </div>
                    </div>

                    <StudentInventoryGrid 
                        items={filteredItems} 
                        onItemSelect={handleItemSelect}
                        onItemDetail={(item) => setItemInDetail(item)}
                        selectedItems={selectedItems.map(ci => ci.item)}
                        pendingRequestedItemNames={Array.from(pendingRequestedItemNames)} 
                        approvedForBorrowItemNames={Array.from(approvedForBorrowItemNames)}
                        channels={channels}
                    />
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <StudentActivity borrowHistory={studentBorrowHistory} onReturn={handleInitiateReturn} view={activitySubView} onCancelReservation={handleCancelReservation} onClaimReservation={(id) => setClaimQrPayload(JSON.stringify({ t: 'res-claim', rId: id }))} />
                </div>
            ))}
          </div>
        </main>
        
        {activeView === 'borrow' && (
            <CheckoutFlow key={selectedChannelId} items={selectedItems} onItemQuantityChange={handleItemQuantityChange} onClear={() => setSelectedItems([])} onSuccess={() => setSelectedItems([])} />
        )}

        <RequestApprovalDialog item={itemToRequest} teachers={teachersForDialog} open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen} onConfirm={handleConfirmRequest} />
        <StudentItemDetailsDialog item={itemInDetail} open={!!itemInDetail} onOpenChange={(open) => !open && setItemInDetail(null)} onBorrow={handleItemSelect} isSelected={selectedItems.some(ci => ci.item.id === itemInDetail?.id)} isPending={pendingRequestedItemNames.has(itemInDetail?.name || '')} isApproved={approvedForBorrowItemNames.has(itemInDetail?.name || '')} locationName={channels.find(c => c.id === itemInDetail?.channelId)?.name.replace('#', '') || 'General Storage'} />
        
        <Dialog open={itemsToReturn.length > 0} onOpenChange={(open) => !open && setItemsToReturn([])}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><QrCode className="h-5 w-5"/> Return QR Code</DialogTitle>
                    <DialogDescription>Present this code to lab staff. This dialog closes after scanning.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    {itemsToReturn.length > 0 && <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(JSON.stringify({ t: 'r', ids: itemsToReturn.map(i => i.id) }))}`} alt="Return QR Code" width={256} height={256} className="rounded-lg bg-white p-2" data-ai-hint="qr code" />}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setItemsToReturn([])}>Cancel</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!claimQrPayload} onOpenChange={(open) => !open && setClaimQrPayload(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><QrCode className="h-5 w-5"/> Reservation Claim</DialogTitle>
                    <DialogDescription>Present this code to lab staff to claim your reserved items.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    {claimQrPayload && <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(claimQrPayload)}`} alt="Claim QR Code" width={256} height={256} className="rounded-lg bg-white p-2" data-ai-hint="qr code" />}
                </div>
                <DialogFooter><Button onClick={() => setClaimQrPayload(null)}>Done</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
