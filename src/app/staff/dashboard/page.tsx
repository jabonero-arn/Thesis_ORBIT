"use client"

import * as React from "react"
import { 
    Package, PackageOpen, History as HistoryIcon, CheckCircle, PackageCheck, Cpu, FlaskConical, Cog, Menu, Hash, Hourglass
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { currentUser, channels } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import type { BorrowHistory, BorrowHistoryStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"


const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

type StaffView = 'borrow' | 'transactions' | 'history';
type TransactionSubView = 'pickup' | 'borrowed';

export default function StaffDashboardPage() {
    const { toast } = useToast()
    const { items, setItems, borrowHistory, setBorrowHistory } = useAppContext();
    
    // View state
    const [activeView, setActiveView] = React.useState<StaffView>('transactions');
    const [transactionSubView, setTransactionSubView] = React.useState<TransactionSubView>('pickup');
    
    // Borrowing view states
    const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
    const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
        channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
    );
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    // Handlers
    const handleDepartmentSelect = (deptId: string) => {
        setActiveView('borrow');
        setSelectedDepartmentId(deptId);
        const firstChannelInDept = channels.find(c => c.id.startsWith(departments.find(d=>d.id === deptId)?.prefix ?? ''));
        if (firstChannelInDept) {
            setSelectedChannelId(firstChannelInDept.id);
        }
        setIsMobileMenuOpen(false);
    }
    
    const handleChannelSelect = (id: string) => {
        setSelectedChannelId(id)
        setIsMobileMenuOpen(false) 
    }
    
    const handleViewChange = (view: StaffView) => {
        setActiveView(view);
        if (view === 'borrow' && activeView !== 'borrow') {
             const firstDept = departments[0];
             setSelectedDepartmentId(firstDept.id);
             const firstChannel = channels.find(c => c.id.startsWith(firstDept.prefix));
             if (firstChannel) {
                setSelectedChannelId(firstChannel.id);
             }
        }
        setIsMobileMenuOpen(false);
    }
    
    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        if (newQuantity < 0) return;
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    }

    const handleProcessPickup = (historyId: string) => {
        const historyRecord = borrowHistory.find(h => h.id === historyId);
        if (!historyRecord) return;
        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Active' } : h));
        setItems(prev => prev.map(i => i.name === historyRecord.itemName ? { ...i, status: 'Borrowed' } : i));
        toast({ title: "Pickup Confirmed", description: `${historyRecord.itemName} has been checked out.` });
    }
    
    const handleReturnItem = (historyId: string) => {
        const historyRecord = borrowHistory.find(h => h.id === historyId);
        if (!historyRecord) return;
        setBorrowHistory(prev => prev.map(h => h.id === historyId ? { ...h, status: 'Returned' } : h));
        setItems(prev => prev.map(i => i.name === historyRecord.itemName ? { ...i, status: 'Available' } : i));
        toast({ title: "Item Returned", description: `${historyRecord.itemName} has been returned.` });
    }
    
    // Data for views
    const filteredItems = React.useMemo(() => items.filter((item) => item.channelId === selectedChannelId), [items, selectedChannelId]);
    const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId]);
    const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId]);

    // Helper functions
    const getHistoryStatusBadge = (status: BorrowHistoryStatus) => {
        const variants = { 'Pending': 'outline', 'Approved': 'default', 'Active': 'destructive', 'Denied': 'destructive', 'Returned': 'secondary' } as const;
        return <Badge variant={variants[status]}>{status}</Badge>;
    }
    
    const navItems = [
        { id: 'borrow', label: 'Browse Inventory', icon: <Package /> },
        { id: 'transactions', label: 'Transactions', icon: <PackageOpen /> },
        { id: 'history', label: 'History', icon: <HistoryIcon /> },
    ];
    
    const AwaitingPickupView = () => {
        const approvedRequests = borrowHistory.filter(h => h.status === 'Approved');
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader><CardTitle>Awaiting Pickup</CardTitle><CardDescription>Teacher-approved requests ready for student pickup.</CardDescription></CardHeader>
                <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Approved</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {approvedRequests.length > 0 ? approvedRequests.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => handleProcessPickup(r.id)}><CheckCircle className="mr-2 h-4 w-4"/> Process Pickup</Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No requests awaiting pickup.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const CurrentlyBorrowedView = () => {
        const activeBorrows = borrowHistory.filter(h => h.status === 'Active');
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader><CardTitle>Currently Borrowed Items</CardTitle><CardDescription>Items that are currently checked out.</CardDescription></CardHeader>
                <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date Borrowed</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {activeBorrows.length > 0 ? activeBorrows.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right"><Button size="sm" variant="secondary" onClick={() => handleReturnItem(r.id)}><PackageCheck className="mr-2 h-4 w-4"/> Mark as Returned</Button></TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="text-center h-24">No items currently borrowed.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    };

    const renderContent = () => {
        switch (activeView) {
            case 'borrow':
                return (
                    <InventoryGrid 
                        items={filteredItems} 
                        onItemSelect={() => {}} 
                        selectedItems={[]} 
                        isSelectionEnabled={false}
                        isManagementView={true}
                        onQuantityChange={handleQuantityChange}
                    />
                );
            case 'transactions':
                return (
                     <div className="space-y-6">
                         {transactionSubView === 'pickup' ? <AwaitingPickupView /> : <CurrentlyBorrowedView />}
                    </div>
                );
            case 'history':
                return (
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                        <CardHeader><CardTitle>Full Transaction History</CardTitle><CardDescription>A complete log of all borrow requests and their statuses.</CardDescription></CardHeader>
                        <CardContent><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Item</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{borrowHistory.map(r => (<TableRow key={r.id}><TableCell>{r.studentName}</TableCell><TableCell>{r.itemName}</TableCell><TableCell>{r.date}</TableCell><TableCell className="text-right">{getHistoryStatusBadge(r.status)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                    </Card>
                );
            default: return null;
        }
    };
    
    const getHeaderContent = () => {
        if (activeView === 'borrow') {
            return (
                <div className="flex items-center gap-2">
                    <Hash className="text-muted-foreground" />
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
                </div>
            );
        }
        if (activeView === 'transactions') {
            const label = transactionSubView === 'pickup' ? "Awaiting Pickup" : "Currently Borrowed";
            const icon = transactionSubView === 'pickup' ? <Hourglass /> : <PackageCheck />;
            return (
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">{icon}</div>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{label}</h1>
                </div>
            );
        }
        if (activeView === 'history') {
             return (
                <div className="flex items-center gap-2">
                    <HistoryIcon className="text-muted-foreground"/>
                    <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">Full History</h1>
                </div>
            );
        }
        return null;
    }

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Departments</div>
             <div className="p-2 space-y-1">
                {departments.map(dept => ( <Button key={dept.id} variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => handleDepartmentSelect(dept.id)}>{dept.icon} {dept.name}</Button>))}
            </div>

            {activeView === 'borrow' && (
                <AppSidebar departmentPrefix={selectedDepartment?.prefix ?? ''} selectedChannelId={selectedChannelId} onChannelSelect={handleChannelSelect} />
            )}

            <Separator />
            
            <div className="p-4 font-headline text-lg font-bold border-b border-t border-border/50">
                Management
            </div>
            <div className="p-2 space-y-1">
                <Button variant={activeView === 'transactions' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { handleViewChange('transactions'); }}>
                    <PackageOpen className="h-5 w-5" /> Transactions
                </Button>
                <Button variant={activeView === 'history' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { handleViewChange('history'); }}>
                    <HistoryIcon className="h-5 w-5" /> History
                </Button>
                 <Button variant={activeView === 'borrow' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { handleViewChange('borrow'); }}>
                    <Package className="h-5 w-5" /> Browse Inventory
                </Button>
            </div>
            {activeView === 'transactions' && (
                 <div className="pl-6">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        TRANSACTIONS
                    </h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => setTransactionSubView('pickup')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'pickup' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Awaiting Pickup</button></li>
                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                    </ul>
                </div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
            <div className="flex items-center justify-between p-2">
                 <UserProfileModal role="Staff">
                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                          <p className="text-xs text-muted-foreground">Staff</p>
                        </div>
                    </div>
                  </UserProfileModal>
                <UserNav role="Staff" />
              </div>
          </div>
      </div>
    );

    return (
        <TooltipProvider>
            <div className="flex h-screen bg-[#1e2430]">
                 {/* Combined Sidebar */}
                 <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        {/* Far Left Rail */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">
                                {departments.map(dept => (
                                    <Tooltip key={dept.id}>
                                        <TooltipTrigger asChild>
                                            <Button variant={activeView === 'borrow' && selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleDepartmentSelect(dept.id)}>
                                                {dept.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{dept.name}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                            <Separator className="my-2 bg-border/50 w-8" />
                            <div className="flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => handleViewChange(item.id as StaffView)}>
                                                {item.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        {/* Contextual Sidebar */}
                        {activeView === 'borrow' && (
                            <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">{selectedDepartment?.name}</div>
                                <AppSidebar departmentPrefix={selectedDepartment?.prefix ?? ''} selectedChannelId={selectedChannelId} onChannelSelect={handleChannelSelect} />
                            </div>
                        )}
                        {activeView === 'transactions' && (
                            <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Transactions</div>
                                 <div className="flex-1 py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        QUEUES
                                    </h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setTransactionSubView('pickup')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'pickup' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><Hourglass className="h-5 w-5" /> Awaiting Pickup</button></li>
                                        <li><button onClick={() => setTransactionSubView('borrowed')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${transactionSubView === 'borrowed' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><PackageCheck className="h-5 w-5" /> Currently Borrowed</button></li>
                                    </ul>
                                </div>
                            </div>
                        )}
                        {activeView === 'history' && (
                             <div className="w-64 flex-col bg-[#141821] p-2">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50">History</div>
                                <div className="flex-1 py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                        LOGS
                                    </h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white`}><HistoryIcon className="h-5 w-5" /> Full History</button></li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]">
                      <div className="flex items-center justify-between p-2">
                            <UserProfileModal role="Staff">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                      <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="overflow-hidden">
                                    <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
                                    <p className="text-xs text-muted-foreground">Staff</p>
                                  </div>
                                </div>
                              </UserProfileModal>
                          <UserNav role="Staff" />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-screen">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">{mobileSidebarContent}</SheetContent></Sheet>
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
