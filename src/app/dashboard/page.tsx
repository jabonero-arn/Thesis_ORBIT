"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, CornerDownLeft, Settings, QrCode, Inbox, PackageCheck, Hourglass, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { channels, currentUser } from "@/lib/data"
import type { InventoryItem, BorrowHistory, CartItem } from "@/lib/types"
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

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const { items: allItems, borrowHistory, setBorrowHistory } = useAppContext();

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'Teacher'));
  }, [firestore]);

  const { data: teacherUsers } = useCollection<{ id: string, displayName: string }>(teachersQuery);

  const teachersForDialog = React.useMemo(() => {
      if (!teacherUsers) return [];
      return teacherUsers.map(t => ({ id: t.id, name: t.displayName }));
  }, [teacherUsers]);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login?role=student")
    }
  }, [user, isUserLoading, router])

  const [activeView, setActiveView] = React.useState<'borrow' | 'activity'>('borrow');
  const [activitySubView, setActivitySubView] = React.useState<'borrowed' | 'requests'>('borrowed');

  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  
  const [selectedItems, setSelectedItems] = React.useState<CartItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = React.useState(false);
  const [itemToRequest, setItemToRequest] = React.useState<InventoryItem | null>(null);
  const [itemToReturn, setItemToReturn] = React.useState<BorrowHistory | null>(null);

  const studentBorrowHistory = React.useMemo(() => {
    if (!user?.displayName) return [];
    return borrowHistory.filter(h => h.studentName === user.displayName);
  }, [borrowHistory, user]);


  const pendingRequestedItemNames = React.useMemo(() =>
    new Set(studentBorrowHistory
      .filter(h => h.status === 'Pending')
      .map(h => h.itemName)),
    [studentBorrowHistory]
  );
  
  const approvedForBorrowItemNames = React.useMemo(() =>
    new Set(studentBorrowHistory
        .filter(h => h.status === 'Approved')
        .map(h => h.itemName)),
    [studentBorrowHistory]
  );
  
  const handleDepartmentSelect = (deptId: string) => {
    setActiveView('borrow');
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = channels.find(c => c.id.startsWith(departments.find(d=>d.id === deptId)?.prefix ?? ''));
    if (firstChannelInDept) {
      setSelectedChannelId(firstChannelInDept.id);
    }
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
  
  const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId])
  const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId]);

  const handleItemSelect = (item: InventoryItem) => {
    if (item.status === "Borrowed") return;
    
    if (pendingRequestedItemNames.has(item.name)) {
        toast({
            title: "Request Already Pending",
            description: `You already have a pending request for "${item.name}".`,
        });
        return;
    }

    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        // Quantity is managed in the cart
        return;
    }
    
    const isApproved = approvedForBorrowItemNames.has(item.name);
    
    if (item.status === "Available" || isApproved) {
        setSelectedItems((prev) => [...prev, { item, quantity: 1 }])
        if(isApproved){
             toast({
                title: "Approved Item Added",
                description: `"${item.name}" has been added to your cart.`,
            });
        }
    } else if (item.status === "Locked") {
        setItemToRequest(item);
        setIsApprovalDialogOpen(true);
    }
  }

  const handleConfirmRequest = (teacherId: string) => {
    if (!itemToRequest || !user?.displayName) return;
    
    const newRequest: BorrowHistory = {
        id: `bh-${Date.now()}`,
        studentName: user.displayName,
        itemName: itemToRequest.name,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        teacherId: teacherId,
    };
    setBorrowHistory(prev => [newRequest, ...prev]);
    setIsApprovalDialogOpen(false);
    setItemToRequest(null);
    toast({
        title: "Approval Request Sent",
        description: `Your request for "${itemToRequest.name}" has been sent for approval.`,
    });
  }
  
  const handleInitiateReturn = (historyId: string) => {
    const record = borrowHistory.find(h => h.id === historyId);
    if (!record) return;

    setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Pending Return' } : h));
    setItemToReturn(record);
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

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
                                  {dept.icon}
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
                          departmentPrefix={selectedDepartment?.prefix ?? ''}
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
                                <li>
                                    <button
                                        onClick={() => setActivitySubView('borrowed')}
                                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${
                                            activitySubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                        }`}
                                    >
                                        <PackageCheck className="h-5 w-5" />
                                        <span className="truncate">My Borrowed Items</span>
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => setActivitySubView('requests')}
                                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${
                                            activitySubView === 'requests' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                        }`}
                                    >
                                        <Hourglass className="h-5 w-5" />
                                        <span className="truncate">My Requests</span>
                                    </button>
                                </li>
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
                            <AvatarImage src={user?.photoURL || currentUser.avatarUrl} alt={user?.displayName || ""} />
                            <AvatarFallback>{user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold leading-none">{user?.displayName || "Student"}</p>
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
                                        {dept.icon}
                                        {dept.name}
                                    </Button>
                                ))}
                            </div>
                            {activeView === 'borrow' && (
                                <AppSidebar
                                    departmentPrefix={selectedDepartment?.prefix ?? ''}
                                    selectedChannelId={selectedChannelId}
                                    onChannelSelect={handleChannelSelect}
                                />
                            )}
                            <Separator className="my-2" />
                            <div className="p-2 space-y-1">
                                <Button variant={activeView === 'activity' && activitySubView === 'borrowed' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('activity'); setActivitySubView('borrowed'); setIsMobileMenuOpen(false); }}>
                                    <PackageCheck />
                                    My Borrowed Items
                                </Button>
                                <Button variant={activeView === 'activity' && activitySubView === 'requests' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView('activity'); setActivitySubView('requests'); setIsMobileMenuOpen(false); }}>
                                    <Hourglass />
                                    My Requests
                                </Button>
                            </div>
                        </div>
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                          <div className="flex items-center justify-between p-2">
                              <UserProfileModal role="Student">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={user?.photoURL || currentUser.avatarUrl} alt={user?.displayName || ""} />
                                        <AvatarFallback>{user?.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                      <p className="truncate text-sm font-semibold leading-none">{user?.displayName || "Student"}</p>
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
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    {activitySubView === 'borrowed' ? <PackageCheck className="text-muted-foreground" /> : <Hourglass className="text-muted-foreground" />}
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">
                       {activitySubView === 'borrowed' ? 'My Borrowed Items' : 'My Requests'}
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
                <StudentActivity borrowHistory={studentBorrowHistory} onReturn={handleInitiateReturn} view={activitySubView} />
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
        
        <Dialog open={!!itemToReturn} onOpenChange={(open) => !open && setItemToReturn(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><QrCode/> Return QR Code for "{itemToReturn?.itemName}"</DialogTitle>
                    <DialogDescription>Present this QR code to lab staff to process your return.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    {itemToReturn && <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${JSON.stringify({ returnId: itemToReturn.id })}`}
                        alt="Return QR Code"
                        width={256}
                        height={256}
                        className="rounded-lg bg-white p-2"
                        data-ai-hint="qr code"
                    />}
                </div>
                <DialogFooter>
                    <Button onClick={() => setItemToReturn(null)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
