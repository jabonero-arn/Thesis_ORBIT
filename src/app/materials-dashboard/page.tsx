
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { 
    Package, Warehouse, Menu, Loader2, LayoutGrid, Building, Cpu, FlaskConical, Cog, PackageOpen, Activity, Hourglass, ChevronDown, ChevronRight, MapPin, AlertTriangle, Clock, ListFilter, ArrowRight
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Logo } from "@/components/logo"
import type { InventoryItem, User as UserType } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const LOW_STOCK_THRESHOLD = 5;

export default function PropertyCustodianDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { items, departments, channels, borrowHistory, activityLogs } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    React.useEffect(() => {
      if (isUserLoading) return;
      if (!user) {
        router.push("/login?role=property-custodian");
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

    const [dashboardSubView, setDashboardSubView] = React.useState<string>('overall'); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isLabsOpen, setIsLabsOpen] = React.useState(true);
    
    const labItems = React.useMemo(() => {
        if (dashboardSubView === 'overall') return items;
        const deptId = departments?.find(d => d.prefix === dashboardSubView)?.id;
        if (!deptId) return [];
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return items.filter(item => item.channelId && channelIds.includes(item.channelId));
    }, [items, dashboardSubView, departments, channels]);

    const labHistory = React.useMemo(() => {
        if (dashboardSubView === 'overall') return borrowHistory;
        const itemNamesInDept = new Set(labItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, labItems, dashboardSubView]);

    const lowStockItems = React.useMemo(() => {
        return labItems.filter(i => i.quantity > 0 && i.quantity < LOW_STOCK_THRESHOLD);
    }, [labItems]);

    const relevantActivity = React.useMemo(() => {
        const itemNames = new Set(labItems.map(i => i.name));
        
        const filteredLogs = activityLogs.filter(log => 
            itemNames.has(log.details) || 
            Array.from(itemNames).some(name => log.details.includes(name))
        ).map(log => ({
            id: log.id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
            userName: log.userName,
            category: log.category
        }));

        const historyActivity = labHistory.slice(0, 10).map(h => ({
            id: h.id,
            action: h.status === 'Active' ? 'Item Borrowed' : h.status === 'Returned' ? 'Item Returned' : 'Status Update',
            details: `${h.itemName} - ${h.studentName}`,
            timestamp: h.date,
            userName: h.studentName,
            category: 'Transaction'
        }));

        return [...filteredLogs, ...historyActivity]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
    }, [activityLogs, labHistory, labItems]);

    const getDeptIcon = (prefix: string) => {
        if (prefix.startsWith('comp')) return <Cpu />;
        if (prefix.startsWith('chem')) return <FlaskConical />;
        if (prefix.startsWith('robo')) return <Cog />;
        return <Building />;
    }

    const getItemChannelName = (channelId?: string) => {
        if (!channelId) return "Unassigned";
        return channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown"
    };

    const getStatusBadge = (item: InventoryItem) => {
        const variants = { 
            "Available": "secondary", 
            "Borrowed": "destructive", 
            "Locked": "outline", 
            "Pending Receipt": "outline", 
            "Inaccurate": "destructive", 
            "Returning": "outline" 
        } as const;
        return <Badge variant={variants[item.status] || "default"}>{item.status}</Badge>;
    }

    const renderContent = () => {
        const totalItemTypes = labItems.length;
        const totalStock = labItems.reduce((sum, item) => sum + item.quantity, 0);
        const borrowedItemsCount = labHistory.filter(h => h.status === 'Active').length;
        const reservedItemsCount = labHistory.filter(h => h.status === 'Reserved').length;

        return (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-card/80 border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Item Types</CardTitle>
                            <Package className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalItemTypes}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Stock</CardTitle>
                            <PackageOpen className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalStock}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Items Borrowed</CardTitle>
                            <Activity className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{borrowedItemsCount}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Items Reserved</CardTitle>
                            <Hourglass className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{reservedItemsCount}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-card/80 border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-border/50 bg-white/[0.02]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ListFilter className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg font-headline">Inventory Overview</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="font-mono">{labItems.length} items</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[500px] overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-white/[0.01]">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Item Name</TableHead>
                                                <TableHead>Laboratory</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {labItems.length > 0 ? labItems.map((item) => (
                                                <TableRow key={item.id} className="border-border/40 hover:bg-white/[0.02] transition-colors">
                                                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">{getItemChannelName(item.channelId)}</TableCell>
                                                    <TableCell className="font-mono font-bold text-primary">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{getStatusBadge(item)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No items found for this selection.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-card/80 border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <CardTitle className="text-lg font-headline">Low Stock Alerts</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {lowStockItems.length > 0 ? (
                                    <div className="space-y-3">
                                        {lowStockItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                                                <span className="text-sm font-medium truncate pr-2">{item.name}</span>
                                                <Badge variant="destructive" className="font-mono text-[10px] shrink-0">
                                                    {item.quantity} left
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60">
                                        <Clock className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs">All stock levels healthy.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-card/80 border-border/50 shadow-sm">
                            <CardHeader className="pb-3 border-b border-border/50 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    <CardTitle className="text-lg font-headline">Recent Activity</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <div className="max-h-[300px] overflow-auto px-4">
                                    {relevantActivity.length > 0 ? (
                                        <div className="space-y-4 pb-4">
                                            {relevantActivity.map((act) => (
                                                <div key={act.id} className="flex items-start gap-3 border-l-2 border-primary/20 pl-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">{act.action}</p>
                                                            <span className="text-[9px] text-muted-foreground shrink-0">{format(new Date(act.timestamp), 'MMM d, p')}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{act.details}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-muted-foreground/60">
                                            <p className="text-xs italic">No recent activity detected.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    };
    
    const getHeaderContent = () => {
        return (
            <div className="flex items-center gap-2">
                <LayoutGrid className="text-muted-foreground" />
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">Custodian Dashboard</h1>
            </div>
        );
    };

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Laboratories</div>
            <div className="p-2">
                <ul className="flex flex-col gap-1">
                    <li><button onClick={() => {setDashboardSubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                    {departments?.map(dept => (
                        <li key={dept.id}><button onClick={() => {setDashboardSubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>
                    ))}
                </ul>
            </div>
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Property Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Custodian"}</p><p className="text-xs text-muted-foreground">Custodian</p></div></div></UserProfileModal><UserNav role="Property Custodian" /></div></div>
      </div>
    );
    
    if (isUserLoading || !user) {
      return (<div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
    }

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-dvh bg-[#1e2430]">
                {/* PERSISTENT SIDEBAR WRAPPER */}
                <div className={cn(
                    "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0 h-full",
                    isSidebarCollapsed ? "w-[72px]" : "w-[320px]"
                )}>
                    <div className="flex flex-1 overflow-hidden h-full">
                        {/* RAIL - ALWAYS VISIBLE */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex-1 flex flex-col items-center gap-2 w-full">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-lg"><LayoutGrid /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center"><p>Inventory Hub</p></TooltipContent>
                                </Tooltip>
                            </div>
                            {isSidebarCollapsed && (
                                <div className="pb-4 mt-auto">
                                    <UserProfileModal role="Property Custodian">
                                         <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback>{userProfile?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                                         </Avatar>
                                    </UserProfileModal>
                                </div>
                            )}
                        </div>
                        
                        {/* SIDEBAR - COLLAPSIBLE SECTION */}
                        <div 
                            className={cn(
                                "flex flex-col bg-[#141821] transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full",
                                isSidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
                            )}
                        >
                            <div className="w-64 flex flex-col h-full">
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 uppercase tracking-tighter whitespace-nowrap">Asset Manager</div>
                                <div className="flex-1 py-4 space-y-4 overflow-y-auto scrollbar-none">
                                    <button onClick={() => setIsLabsOpen(!isLabsOpen)} className="flex w-full items-center justify-between px-4 mb-2 group text-muted-foreground hover:text-foreground transition-colors">
                                        <h2 className="text-xs font-bold uppercase tracking-wider">LABORATORIES</h2>
                                        {isLabsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    {isLabsOpen && (
                                        <ul className="flex flex-col gap-1 px-2">
                                            <li>
                                                <button onClick={() => setDashboardSubView('overall')} className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                                                    dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                                )}>
                                                    <LayoutGrid className="h-4 w-4" />Overall
                                                </button>
                                            </li>
                                            {departments?.map(dept => (
                                                <li key={dept.id}>
                                                    <button onClick={() => setDashboardSubView(dept.prefix)} className={cn(
                                                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                                                        dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'
                                                    )}>
                                                        {React.cloneElement(getDeptIcon(dept.prefix) as React.ReactElement, { className: "h-4 w-4" })}
                                                        {dept.name}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="p-2 border-t border-border/50 bg-[#0e1015]">
                                    <div className="flex items-center justify-between">
                                        <UserProfileModal role="Property Custodian">
                                            <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent">
                                                <Avatar className="h-8 w-8 flex-shrink-0">
                                                    <AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} />
                                                    <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                                                </Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="truncate text-xs font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Custodian"}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">Custodian</p>
                                                </div>
                                            </div>
                                        </UserProfileModal>
                                        <UserNav role="Property Custodian" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TOGGLE BUTTON */}
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={cn(
                            "absolute -right-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full bg-[#141821] border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-md group",
                            isSidebarCollapsed && "bg-[#0e1015]"
                        )}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </button>
                </div>

                <main className="flex-1 flex flex-col h-dvh overflow-hidden">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">{mobileSidebarContent}</SheetContent>
                            </Sheet>
                            {getHeaderContent()}
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-headline uppercase tracking-widest text-[10px]">
                                {userProfile?.role || 'Property Custodian'}
                            </Badge>
                            <UserNav role="Property Custodian" />
                        </div>
                    </header>
                    {renderContent()}
                </main>
            </div>
        </TooltipProvider>
    )
}

