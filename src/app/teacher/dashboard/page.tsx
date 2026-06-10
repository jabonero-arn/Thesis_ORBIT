
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase"
import { doc, updateDoc, writeBatch } from "firebase/firestore"
import { 
    User as UserIcon, Cpu, FlaskConical, Cog, Hash, Menu, Check, X, 
    LayoutGrid, ClipboardCheck, History, Hourglass, Loader2, Building, 
    Inbox, PackageCheck, CalendarDays, XCircle, ChevronDown, ChevronRight,
    Search, Filter, PackageSearch, AlertCircle, ShoppingCart, Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, isToday } from "date-fns"
import Image from "next/image"

import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, CartItem, User } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TeacherInventoryGrid } from "@/components/teacher/teacher-inventory-grid"
import { TeacherItemDetailsDialog } from "@/components/teacher/teacher-item-details-dialog"
import { cn } from "@/lib/utils"

type TeacherView = 'overview' | 'borrow' | 'requests' | 'my-activity';

export default function TeacherDashboardPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, departments, channels, channelAccessRequests } = useAppContext();
  
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
  const [showLabSelectionDialog, setShowLabSelectionDialog] = React.useState(false);
  const [isLabsOpen, setIsLabsOpen] = React.useState(true);
  const [activeView, setActiveView] = React.useState<TeacherView>('overview');
  const [requestSubView, setRequestSubView] = React.useState<'pending' | 'history'>('pending');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'reservations' | 'history' | 'issues'>('borrowed');

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

  const approvedChannelsInfo = React.useMemo(() => {
    if (!user || !channelAccessRequests || !channels || !departments) return { approvedChannelIds: new Set<string>(), approvedDepartmentIds: new Set<string>() };
    const approvedReqs = channelAccessRequests.filter(req => req.teacherId === user.uid && req.status === 'approved');
    const approvedChannelIds = new Set(approvedReqs.map(req => req.channelId));
    const engineeringOffice = channels.find(c => c.name.toLowerCase().includes('engineering office'));
    if (engineeringOffice) approvedChannelIds.add(engineeringOffice.id);
    const approvedDepartmentIds = new Set<string>();
    channels.forEach(channel => {
        if (approvedChannelIds.has(channel.id)) approvedDepartmentIds.add(channel.departmentId);
    });
    return { approvedChannelIds, approvedDepartmentIds };
  }, [user, channelAccessRequests, channels, departments]);

  const teacherDepartments = React.useMemo(() => 
      departments.filter(dept => approvedChannelsInfo.approvedDepartmentIds.has(dept.id))
  , [departments, approvedChannelsInfo.approvedDepartmentIds]);

  const teacherChannels = React.useMemo(() => 
      channels.filter(chan => approvedChannelsInfo.approvedChannelIds.has(chan.id))
  , [channels, approvedChannelsInfo.approvedChannelIds]);

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

  const teacherIdForApproval = teacherData?.id;
  const pendingRequestsCount = borrowHistory.filter((r) => {
    const raw = r as any;
    return r.status === 'Pending' && (
      r.teacherId === teacherIdForApproval || 
      raw.assignedTeacherId === teacherIdForApproval ||
      raw.requestedTeacherId === teacherIdForApproval ||
      raw.approvingTeacherId === teacherIdForApproval ||
      raw.teacherUid === teacherIdForApproval
    );
  }).length;

  const personalActiveBorrows = borrowHistory.filter(h => h.borrowerUserId === user?.uid && h.status === 'Active');

  const filteredItems = React.useMemo(() => {
    let list = allItems.filter(item => 
        (activeView === 'borrow' ? item.channelId === selectedChannelId : true)
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

  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    allItems.forEach(item => {
        if (Array.isArray(item.categories)) item.categories.forEach(c => categories.add(c));
        else if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  }, [allItems]);

  const handleRequest = (id: string, newStatus: 'Approved' | 'Denied') => {
    if (!firestore || !user) return;
    const record = borrowHistory.find(r => r.id === id);
    
    // TRUE TRACE DIAGNOSTICS - VERSION 1.3.0
    console.group(`Teacher Action v1.3.0: ${newStatus}`);
    console.log('Document ID:', id);
    console.log('Target Status:', newStatus);
    console.log('Authenticated User UID:', user.uid);
    console.log('Record Teacher ID:', record?.teacherId);
    console.log('Full Record Data:', record);
    console.groupEnd();

    if (record) {
      const docRef = doc(firestore, 'borrowing_transactions', id);
      const now = new Date().toISOString();
      
      const updatePayload: any = { 
        status: newStatus,
        updatedAt: now
      };

      if (newStatus === 'Approved') {
          updatePayload.approvedBy = user.uid;
          updatePayload.approvedAt = now;
      } else {
          updatePayload.deniedBy = user.uid;
          updatePayload.deniedAt = now;
      }
      
      console.log('Attempting update with v1.3.0 rules at:', docRef.path);
      console.log('Update payload:', updatePayload);

      updateDoc(docRef, updatePayload)
        .then(() => {
          console.log('v1.3.0 Update successful at path:', docRef.path);
          toast({ 
            title: `Request ${newStatus}`, 
            description: `Request for "${record.itemName}" from ${record.studentName} has been ${newStatus.toLowerCase()}.` 
          });
        })
        .catch(async (serverError: any) => {
          console.error(`DEBUG: Permission Denied or Update Failed v1.3.0 at: ${docRef.path}`);
          console.error('DEBUG: Server Error Code:', serverError.code);
          console.error('DEBUG: Server Error Message:', serverError.message);
          
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updatePayload,
          });
          errorEmitter.emit('permission-error', permissionError);

          toast({ 
            variant: "destructive", 
            title: "Update Failed", 
            description: "Unable to update request. Please check teacher permissions." 
          });
        });
    }
  }

  const handleDepartmentSelect = (deptId: string) => {
    setActiveView('borrow')
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = teacherChannels.find(c => c.departmentId === deptId);
    setSelectedChannelId(firstChannelInDept?.id ?? null);
    setSelectedItems([]);
    setIsMobileMenuOpen(false);
  }

  const handleItemSelect = (item: InventoryItem) => {
    if (item.quantity === 0) return;
    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        setSelectedItems(prev => prev.filter(ci => ci.item.id !== item.id));
    } else {
        setSelectedItems((prev) => [...prev, {item, quantity: 1}])
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

  const [itemsToReturn, setItemsToReturn] = React.useState<BorrowHistory[]>([]);
  const [claimQrPayload, setClaimQrPayload] = React.useState<string | null>(null);

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
  };

  const getDeptIcon = (prefix: string) => {
    const p = prefix.toLowerCase();
    if (p.includes('comp')) return <Cpu />;
    if (p.includes('chem')) return <FlaskConical />;
    if (p.includes('robo')) return <Cog />;
    if (p.includes('eng')) return <Building />;
    return <UserIcon />;
  }

  const renderOverview = () => {
    const currentlyBorrowedCount = personalActiveBorrows.length;
    const personalResCount = borrowHistory.filter(h => h.borrowerUserId === user?.uid && h.status === 'Reserved').length;
    const recentEvents = borrowHistory.filter(h => h.teacherId === user?.uid || h.borrowerUserId === user?.uid).slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold font-headline tracking-tight text-white">Welcome, {userProfile?.displayName?.split(' ')[0] || 'Teacher'}</h2>
                <p className="text-muted-foreground text-sm">Here's your laboratory management overview.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Student Approvals</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{pendingRequestsCount}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Active Borrows</CardTitle>
                        <PackageCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{currentlyBorrowedCount}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">My Reservations</CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{personalResCount}</div></CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur-md border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Available Inventory</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{allItems.filter(i => i.status === 'Available').length}</div></CardContent>
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
                                            <p className="text-sm text-white mt-0.5">{event.studentName === userProfile?.displayName ? 'You' : event.studentName} - {event.itemName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm italic">No recent activity detected.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/50">
                    <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Quick Start</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select a department to browse and borrow equipment.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {teacherDepartments.map(dept => (
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

  const ApprovalRequests = () => {
    const teacherId = teacherData?.id;
    
    // BACKWARD COMPATIBILITY: Filter by multiple possible teacher UID field names
    const isAssignedToMe = (r: BorrowHistory) => {
        const raw = r as any;
        return (
            r.teacherId === teacherId || 
            raw.assignedTeacherId === teacherId ||
            raw.requestedTeacherId === teacherId ||
            raw.approvingTeacherId === teacherId ||
            raw.teacherUid === teacherId
        );
    };

    const pendingRequests = borrowHistory
        .filter((r) => r.status === 'Pending' && isAssignedToMe(r))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const processedRequests = borrowHistory
        .filter((r) => r.status !== 'Pending' && isAssignedToMe(r))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (requestSubView === 'pending') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold font-headline">Pending Approvals</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{pendingRequests.length} Waiting</Badge>
          </div>
          <div className="border rounded-xl bg-card/40 border-border/50 overflow-hidden">
            {pendingRequests.length > 0 ? (
              <Table>
                <TableHeader className="bg-black/20">
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
                    <TableRow key={record.id} className="border-border/40">
                      <TableCell className="font-medium text-white">{record.studentName}</TableCell>
                      <TableCell>{record.itemName}</TableCell>
                      <TableCell>{record.itemQuantity || 1}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(record.date), 'MMM d, p')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => handleRequest(record.id, 'Approved')}>
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
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 opacity-20 mb-4" />
                <p>No pending approval requests.</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold font-headline">Approval History</h3>
        <div className="border rounded-xl bg-card/40 border-border/50 overflow-hidden">
          {processedRequests.length > 0 ? (
            <Table>
              <TableHeader className="bg-black/20">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((record) => (
                  <TableRow key={record.id} className="border-border/40">
                    <TableCell className="font-medium text-white">{record.studentName}</TableCell>
                    <TableCell>{record.itemName}</TableCell>
                    <TableCell>{record.itemQuantity || 1}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(record.date), 'MMM d, p')}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={record.status === 'Approved' ? 'secondary' : 'destructive'} className={cn(
                          record.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>{record.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <History className="h-12 w-12 opacity-20 mb-4" />
              <p>No approval history yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isUserLoading || isProfileLoading || !teacherData) {
    return <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const selectedChannel = teacherChannels.find(c => c.id === selectedChannelId);
  const selectedDepartment = teacherDepartments.find(d => d.id === selectedDepartmentId);
  const channelsForSidebar = teacherChannels.filter(c => c.departmentId === selectedDepartmentId);

  return (
    <TooltipProvider delayDuration={500}>
      <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
      <LabSelectionDialog open={showLabSelectionDialog} onFinished={() => setShowLabSelectionDialog(false)} />
      
      <div className="flex h-dvh bg-[#1e2430]">
        <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full w-[320px]">
            <div className="flex flex-1 overflow-hidden h-full">
                <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                  <div className="p-2 mb-2"><Logo /></div>
                  <div className="flex-1 flex flex-col items-center gap-2 w-full">
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant={activeView === 'overview' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => setActiveView('overview')}><Logo className="h-5 w-5"/></Button>
                    </TooltipTrigger><TooltipContent side="right">Home Hub</TooltipContent></Tooltip>
                    
                    {teacherDepartments.map(dept => (
                      <Tooltip key={dept.id}><TooltipTrigger asChild>
                          <Button variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleDepartmentSelect(dept.id)}>{getDeptIcon(dept.prefix)}</Button>
                      </TooltipTrigger><TooltipContent side="right">{dept.name}</TooltipContent></Tooltip>
                    ))}
                    
                    <Separator className="my-2 bg-border/50 w-8" />
                    
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant={activeView === 'requests' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => { setActiveView('requests'); setRequestSubView('pending'); }}><ClipboardCheck /></Button>
                    </TooltipTrigger><TooltipContent side="right">Approvals</TooltipContent></Tooltip>
                    
                    <Tooltip><TooltipTrigger asChild>
                        <Button variant={activeView === 'my-activity' ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => { setActiveView('my-activity'); setActivitySubView('borrowed'); }}><Inbox /></Button>
                    </TooltipTrigger><TooltipContent side="right">My Activity</TooltipContent></Tooltip>
                  </div>
                </div>

                <div className="flex flex-col bg-[#141821] transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full w-64">
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
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white uppercase tracking-widest">{activeView === 'overview' ? 'Command' : activeView === 'requests' ? 'Approvals' : 'Activity'}</div>
                                 <div className="flex-1 py-4 overflow-y-auto px-2">
                                    {activeView === 'requests' ? (
                                        <ul className="flex flex-col gap-1">
                                            {[{ id: 'pending', label: 'Pending Student Requests', icon: <Hourglass /> }, { id: 'history', label: 'Approval History', icon: <History /> }].map(nav => (
                                                <li key={nav.id}>
                                                    <button onClick={() => setRequestSubView(nav.id as any)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors", requestSubView === nav.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white')}>
                                                        {React.cloneElement(nav.icon as any, { className: 'h-4 w-4' })} <span className="truncate">{nav.label}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : activeView === 'my-activity' ? (
                                        <ul className="flex flex-col gap-1">
                                            {[{ id: 'borrowed', label: 'Borrowed Items', icon: <PackageCheck /> }, { id: 'reservations', label: 'Reservations', icon: <CalendarDays /> }, { id: 'history', label: 'History Log', icon: <History /> }, { id: 'issues', label: 'Damaged/Lost', icon: <XCircle /> }].map(nav => (
                                                <li key={nav.id}>
                                                    <button onClick={() => setActivitySubView(nav.id as any)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors", activitySubView === nav.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white')}>
                                                        {React.cloneElement(nav.icon as any, { className: 'h-4 w-4' })} <span className="truncate">{nav.label}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground px-2 italic">Select an operation rail icon to manage inventory.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                            <div className="flex items-center justify-between p-2">
                                <UserProfileModal role="Teacher">
                                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                        <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback>{userProfile?.displayName?.charAt(0) || 'T'}</AvatarFallback></Avatar>
                                        <div className="overflow-hidden">
                                        <p className="truncate text-sm font-semibold leading-none text-white">{userProfile?.displayName || "Teacher"}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Teacher</p>
                                        </div>
                                    </div>
                                </UserProfileModal>
                                <UserNav role="Teacher" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <main className="flex-1 flex flex-col h-dvh overflow-hidden">
          <header className="flex h-16 items-center justify-between gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger>
                  <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">
                      <div className="p-4 font-headline text-lg font-bold border-b border-border/50 text-white">Menu</div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          <Button variant={activeView === 'overview' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('overview'); setIsMobileMenuOpen(false); }}><Logo className="h-4 w-4"/> Command Hub</Button>
                          {teacherDepartments.map(dept => (
                              <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>{getDeptIcon(dept.prefix)} {dept.name}</Button>
                          ))}
                          <Separator className="my-2" />
                          <Button variant={activeView === 'requests' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('requests'); setIsMobileMenuOpen(false); }}><ClipboardCheck className="h-4 w-4"/> Approvals</Button>
                          <Button variant={activeView === 'my-activity' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('my-activity'); setIsMobileMenuOpen(false); }}><Inbox className="h-4 w-4"/> My Activity</Button>
                      </div>
                  </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2">
                  {activeView === 'borrow' ? <Hash className="text-muted-foreground h-5 w-5" /> : activeView === 'overview' ? <Logo className="h-5 w-5" /> : <ClipboardCheck className="text-muted-foreground h-5 w-5" />}
                  <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate text-white">
                      {activeView === 'overview' ? 'Command Hub' : activeView === 'borrow' ? (selectedChannel?.name?.replace('#', '') || 'Inventory') : activeView === 'requests' ? 'Approvals' : 'Activity Log'}
                  </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden md:flex bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">{userProfile?.role || 'Teacher'}</Badge>
              <UserNav role="Teacher" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {activeView === 'overview' ? renderOverview() : activeView === 'borrow' ? (
                <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card/40 p-4 rounded-xl border border-border/50">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search items or descriptions..." className="pl-10 bg-black/20 border-border/40 focus:border-primary/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px] h-9 bg-black/20 border-border/40"><SelectValue placeholder="Categories" /></SelectTrigger>
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

                    <TeacherInventoryGrid 
                        items={filteredItems} 
                        onItemSelect={handleItemSelect}
                        onItemDetail={(item) => setItemInDetail(item)}
                        selectedItems={selectedItems.map(ci => ci.item)}
                        channels={channels}
                    />
                </div>
            ) : activeView === 'requests' ? (
                <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
                    <ApprovalRequests />
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <StudentActivity borrowHistory={borrowHistory.filter(h => h.borrowerUserId === user?.uid)} onReturn={(recs) => setItemsToReturn(recs)} view={activitySubView} onCancelReservation={handleCancelReservation} onClaimReservation={(id) => setClaimQrPayload(JSON.stringify({ t: 'res-claim', rId: id }))} />
                </div>
            )}
          </div>
        </main>
        
        {activeView === 'borrow' && (
            <CheckoutFlow key={selectedChannelId} items={selectedItems} onItemQuantityChange={handleItemQuantityChange} onClear={() => setSelectedItems([])} onSuccess={() => setSelectedItems([])} isTeacherView={true} />
        )}

        <TeacherItemDetailsDialog item={itemInDetail} open={!!itemInDetail} onOpenChange={(open) => !open && setItemInDetail(null)} onBorrow={handleItemSelect} isSelected={selectedItems.some(ci => ci.item.id === itemInDetail?.id)} locationName={channels.find(c => c.id === itemInDetail?.channelId)?.name.replace('#', '') || 'General Storage'} />
        
        <Dialog open={itemsToReturn.length > 0} onOpenChange={(open) => !open && setItemsToReturn([])}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><Clock className="h-5 w-5"/> Generate Return Ticket</DialogTitle>
                    <DialogDescription>Present this code to lab staff to return {itemsToReturn.length} item(s).</DialogDescription>
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
                    <DialogTitle className="font-headline flex items-center gap-2 text-white"><PackageCheck className="h-5 w-5"/> Reservation Claim</DialogTitle>
                    <DialogDescription>Present this code to lab staff to claim your materials.</DialogDescription>
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
