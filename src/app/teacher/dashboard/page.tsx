"use client"

import * as React from "react"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, Check, X, LayoutGrid, ClipboardCheck, CornerDownLeft, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { channels, currentUser } from "@/lib/data"
import type { InventoryItem, BorrowHistory, BorrowHistoryStatus, CartItem } from "@/lib/types"
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
import { cn } from "@/lib/utils"
import { useAppContext } from "@/context/app-context"

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

type TeacherView = 'borrow' | 'requests';

export default function TeacherDashboardPage() {
  const { toast } = useToast()
  const { items: allItems, borrowHistory, setBorrowHistory } = useAppContext();
  
  // View state
  const [activeView, setActiveView] = React.useState<TeacherView>('requests');

  // State for borrowing
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  const [selectedItems, setSelectedItems] = React.useState<CartItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // State for request approvals
  const pendingRequests = borrowHistory.filter((r) => r.status === 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const processedRequests = borrowHistory.filter((r) => r.status !== 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRequest = (id: string, newStatus: 'Approved' | 'Denied') => {
    const record = borrowHistory.find(r => r.id === id);
    if (record) {
      setBorrowHistory(prev => prev.map(r => r.id === id ? {...r, status: newStatus} : r))
      toast({
        title: `Request ${newStatus}`,
        description: `Request for "${record.itemName}" from ${record.studentName} has been ${newStatus.toLowerCase()}.`,
      });
    }
  }

  const getBadgeVariant = (status: BorrowHistoryStatus) => {
    const variants: { [key in BorrowHistoryStatus]: "secondary" | "destructive" | "outline" | "default"} = {
      'Pending': 'outline',
      'Approved': 'default',
      'Active': 'destructive',
      'Denied': 'destructive',
      'Returned': 'secondary'
    };
    return variants[status];
  }

  // Handlers for borrowing
  const handleDepartmentSelect = (deptId: string) => {
    setActiveView('borrow')
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = channels.find(c => c.id.startsWith(departments.find(d=>d.id === deptId)?.prefix ?? ''));
    if (firstChannelInDept) {
      setSelectedChannelId(firstChannelInDept.id);
    }
    setSelectedItems([]);
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


  const ApprovalRequests = () => (
    <div className="space-y-8 text-foreground">
      <div>
        <h3 className="text-lg font-semibold font-headline mb-4">Pending Requests</h3>
        <div className="border rounded-lg bg-card/50">
          {pendingRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell>{record.itemName}</TableCell>
                    <TableCell>{record.date}</TableCell>
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
              <p>No pending requests.</p>
            </div>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold font-headline mb-4">Request History</h3>
        <div className="border rounded-lg max-h-60 overflow-y-auto bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 bg-card z-10">
                <TableHead>Student</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRequests.length > 0 ? processedRequests.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.studentName}</TableCell>
                  <TableCell>{record.itemName}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBadgeVariant(record.status)}>
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No processed requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const mobileSidebarContent = (
    <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
            {activeView === 'borrow' ? (
                <>
                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                        Departments
                    </div>
                    <div className="p-2 space-y-1">
                        {departments.map(dept => (
                            <Button key={dept.id} variant={selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>
                                {dept.icon}
                                {dept.name}
                            </Button>
                        ))}
                    </div>
                    <AppSidebar
                        departmentPrefix={selectedDepartment?.prefix ?? ''}
                        selectedChannelId={selectedChannelId}
                        onChannelSelect={handleChannelSelect}
                    />
                </>
            ) : (
                <>
                    <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                        Menu
                    </div>
                    <div className="p-2 space-y-1">
                        <Button variant={activeView === 'borrow' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActiveView('borrow')}>
                            <LayoutGrid /> Borrow Equipment
                        </Button>
                        <Button variant={activeView === 'requests' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActiveView('requests')}>
                           <ClipboardCheck /> Approve Requests
                        </Button>
                    </div>
                </>
            )}
        </div>
        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
          <UserNav role="Teacher">
            <div className="flex cursor-pointer items-center justify-between p-2 transition-colors hover:bg-accent/50">
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">Teacher</p>
              </div>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
          </UserNav>
        </div>
    </div>
  );

  const BorrowView = () => (
    <>
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
                    {mobileSidebarContent}
                  </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
                </div>
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
  );

  const RequestsView = () => (
    <>
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
                     {mobileSidebarContent}
                  </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">Approve Requests</h1>
                </div>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <ApprovalRequests />
        </div>
    </>
  );


  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#1e2430]">
        {/* Department & View Rail */}
        <div className="hidden md:flex flex-col items-center gap-2 bg-[#0e1015] py-3">
          <div className="p-2 mb-2">
            <Logo />
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            {departments.map(dept => (
              <div key={dept.id} className="group relative w-full flex justify-center">
                  <div className={cn( "absolute left-0 top-1/2 -translate-y-1/2 h-2 w-1 -translate-x-1 rounded-r-full bg-white transition-all duration-200", activeView === 'borrow' && selectedDepartmentId === dept.id ? 'h-10' : 'group-hover:h-5' )} />
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant={'ghost'} size="icon" className={cn( 'h-12 w-12 rounded-full bg-card transition-all duration-200 hover:rounded-2xl hover:bg-primary', activeView === 'borrow' && selectedDepartmentId === dept.id && 'rounded-2xl bg-primary' )} onClick={() => handleDepartmentSelect(dept.id)}>
                              {dept.icon}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center"><p>{dept.name}</p></TooltipContent>
                  </Tooltip>
              </div>
            ))}
          </div>

          <Separator className="my-2 bg-border/50 w-8" />

          <div className="flex flex-col items-center gap-2 w-full">
            <div className="group relative w-full flex justify-center">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button 
                          variant={'ghost'}
                          size="icon" 
                          className={cn('h-12 w-12 rounded-full bg-card transition-all duration-200 hover:rounded-2xl hover:bg-primary', activeView === 'borrow' && 'rounded-2xl bg-primary')}
                          onClick={() => setActiveView('borrow')}>
                          <LayoutGrid />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                      <p>Borrow Equipment</p>
                  </TooltipContent>
              </Tooltip>
            </div>
             <div className="group relative w-full flex justify-center">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button 
                          variant={'ghost'} 
                          size="icon" 
                          className={cn('h-12 w-12 rounded-full bg-card transition-all duration-200 hover:rounded-2xl hover:bg-primary', activeView === 'requests' && 'rounded-2xl bg-primary')}
                          onClick={() => setActiveView('requests')}>
                          <ClipboardCheck />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                      <p>Approve Requests</p>
                  </TooltipContent>
              </Tooltip>
             </div>
          </div>

          <div className="mt-auto w-full border-t border-border/50">
            <UserNav role="Teacher">
              <div className="flex cursor-pointer items-center justify-between p-2 transition-colors hover:bg-accent/50">
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">Teacher</p>
                </div>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
            </UserNav>
          </div>
        </div>

        {/* Channel List */}
        {activeView === 'borrow' && (
            <div className="hidden md:flex w-64 flex-col bg-[#141821] p-2">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                {selectedDepartment?.name}
            </div>
            <AppSidebar
                departmentPrefix={selectedDepartment?.prefix ?? ''}
                selectedChannelId={selectedChannelId}
                onChannelSelect={handleChannelSelect}
            />
            </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen">
          {activeView === 'borrow' ? <BorrowView /> : <RequestsView />}
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
            />
        )}
        
      </div>
    </TooltipProvider>
  )
}
