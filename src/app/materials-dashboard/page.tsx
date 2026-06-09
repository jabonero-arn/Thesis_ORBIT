
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { 
    User, Package, Warehouse, Menu, Loader2, LayoutGrid, Building, Cpu, FlaskConical, Cog, PackageOpen, Activity, Hourglass, PlusCircle, ListRestart, CheckCircle, ChevronDown, ChevronRight, ChevronLeft, MapPin, AlertCircle, Clock
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
import { AddMaterialsForm } from "@/components/materials-custodian/add-materials-form"
import { createActivityLog } from "@/lib/logging"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function PropertyCustodianDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { items, departments, channels, borrowHistory } = useAppContext();
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

    const [activeView, setActiveView] = React.useState<'dashboard' | 'add-materials' | 'outgoing-items' | 'returned-items'>('dashboard');
    const [dashboardSubView, setDashboardSubView] = React.useState<string>('overall'); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isLabsOpen, setIsLabsOpen] = React.useState(true);
    
    const dashboardItems = React.useMemo(() => {
        if (dashboardSubView === 'overall') return items;
        const deptId = departments?.find(d => d.prefix === dashboardSubView)?.id;
        if (!deptId) return [];
        const channelIds = channels.filter(c => c.departmentId === deptId).map(c => c.id);
        return items.filter(item => item.channelId && channelIds.includes(item.channelId));
    }, [items, dashboardSubView, departments, channels]);

    const dashboardHistory = React.useMemo(() => {
        if (dashboardSubView === 'overall') return borrowHistory;
        const itemNamesInDept = new Set(dashboardItems.map(i => i.name));
        return borrowHistory.filter(h => itemNamesInDept.has(h.itemName));
    }, [borrowHistory, dashboardItems]);

    const getDeptIcon = (prefix: string) => {
        if (prefix.startsWith('comp')) return <Cpu />;
        if (prefix.startsWith('chem')) return <FlaskConical />;
        if (prefix.startsWith('robo')) return <Cog />;
        return <Building />;
    }

    const renderLabCell = (item: InventoryItem) => {
        const channel = channels.find(c => c.id === item.channelId);
        if (!channel) return <span className="text-muted-foreground/60 italic text-sm">Unassigned</span>;
        
        const dept = departments.find(d => d.id === channel.departmentId);
        const icon = dept ? getDeptIcon(dept.prefix) : <MapPin className="h-3 w-3" />;
        
        return (
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1.5 py-0.5 px-2 bg-accent/30 hover:bg-accent/50 border-border/50 text-foreground font-medium">
                    {React.cloneElement(icon as React.ReactElement, { className: "h-3 w-3 text-primary" })}
                    {channel.name.replace('#', '')}
                </Badge>
            </div>
        );
    }
    
    const getStatusBadge = (item: InventoryItem) => {
        const tooltipContent = item.inaccuracyReason ? <TooltipContent><p>{item.inaccuracyReason}</p></TooltipContent> : null;
        let badge: JSX.Element;

        if (item.status === 'Pending Receipt') {
            badge = <Badge variant="outline" className="border-primary/30 text-primary/80">Pending Verification</Badge>;
        } else if (item.status === 'Inaccurate') {
            badge = <Badge variant="destructive">Inaccurate</Badge>;
        } else if (item.status === 'Returning') {
            badge = <Badge variant="outline" className="border-amber-500 text-amber-500">Returning</Badge>;
        } else {
            badge = <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Received</Badge>;
        }

        if (tooltipContent) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        {badge}
                    </TooltipTrigger>
                    {tooltipContent}
                </Tooltip>
            );
        }
        return badge;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
        { id: 'add-materials', label: 'Add Materials', icon: <PlusCircle /> },
        { id: 'outgoing-items', label: 'Outgoing Items', icon: <Warehouse /> },
        { id: 'returned-items', label: 'Head Supervisor Returns', icon: <ListRestart /> },
    ];
    
    const renderContent = () => {
        switch(activeView) {
            case 'dashboard':
                const totalItemTypes = dashboardItems.length;
                const totalStock = dashboardItems.reduce((sum, item) => sum + item.quantity, 0);
                const borrowedItemsCount = dashboardHistory.filter(h => h.status === 'Active').length;
                const reservedItemsCount = dashboardHistory.filter(h => h.status === 'Reserved').length;
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Item Types</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalItemTypes}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle><PackageOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalStock}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Items Borrowed</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{borrowedItemsCount}</div></CardContent></Card>
                            <Card className="bg-card/80"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Items Reserved</CardTitle><Hourglass className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reservedItemsCount}</div></CardContent></Card>
                        </div>
                    </div>
                );
            case 'add-materials':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <AddMaterialsForm onSubmissionSuccess={() => setActiveView('outgoing-items')} />
                    </div>
                );
            case 'outgoing-items':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Warehouse className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle className="text-xl font-bold">Outgoing Provisioned Materials</CardTitle>
                                        <CardDescription>Track items sent to laboratories and their verification status.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-border/50">
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Name</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Requesting Lab</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Quantity</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Date Added</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Date Verified</TableHead>
                                            <TableHead className="whitespace-nowrap font-bold text-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length > 0 ? items.map(item => (
                                            <TableRow key={item.id} className="border-border/40 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-semibold whitespace-nowrap text-foreground">{item.name}</TableCell>
                                                <TableCell className="whitespace-nowrap">{renderLabCell(item)}</TableCell>
                                                <TableCell className="font-mono text-primary font-medium">{item.quantity}</TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                <TableCell className="whitespace-nowrap">{getStatusBadge(item)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Package className="h-8 w-8 opacity-20" />
                                                        <p>No provisioned materials currently in transit.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'returned-items':
                const sampleReturns = [
                    { id: '1', supervisor: 'John Doe', lab: 'Computer Lab 1', item: 'Arduino Uno Kit', quantity: 2, status: 'Reviewed', date: '2024-03-20', issue: 'Burnt microcontroller chip' },
                    { id: '2', supervisor: 'Jane Smith', lab: 'Electronics Lab', item: 'Digital Oscilloscope', quantity: 1, status: 'Pending', date: '2024-03-21', issue: 'Display flickering intermittently' },
                    { id: '3', supervisor: 'Mark Wilson', lab: 'Robotics Lab', item: 'Servo Motor (SG90)', quantity: 5, status: 'Confirmed', date: '2024-03-19', issue: 'Stripped internal gears' }
                ];

                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <ListRestart className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle className="text-xl font-bold">Returned Damage Item</CardTitle>
                                        <CardDescription>Review and track damaged materials returned by laboratory supervisors.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[60vh] overflow-auto p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/50 hover:bg-transparent">
                                            <TableHead className="font-bold text-foreground py-4">Lab Supervisor Name</TableHead>
                                            <TableHead className="font-bold text-foreground">Laboratory</TableHead>
                                            <TableHead className="font-bold text-foreground">Item Name</TableHead>
                                            <TableHead className="font-bold text-foreground">Quantity</TableHead>
                                            <TableHead className="font-bold text-foreground">Status</TableHead>
                                            <TableHead className="font-bold text-foreground">Date</TableHead>
                                            <TableHead className="font-bold text-foreground">Issue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sampleReturns.map(row => (
                                            <TableRow key={row.id} className="border-border/40 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{row.supervisor.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        {row.supervisor}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-accent/30 border-border/50">
                                                        {row.lab}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-foreground">{row.item}</TableCell>
                                                <TableCell className="font-mono text-primary">{row.quantity}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        row.status === 'Pending' ? 'outline' : 
                                                        row.status === 'Reviewed' ? 'secondary' : 'default'
                                                    } className={cn(
                                                        row.status === 'Pending' && "border-amber-500/50 text-amber-500",
                                                        row.status === 'Reviewed' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                                        row.status === 'Confirmed' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    )}>
                                                        {row.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3" />
                                                        {row.date}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                                        <span className="text-sm italic text-muted-foreground truncate" title={row.issue}>
                                                            {row.issue}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const getHeaderContent = () => {
        const currentNavItem = navItems.find(item => item.id === activeView);
        return (
            <div className="flex items-center gap-2">
                {currentNavItem?.icon && <div className="text-muted-foreground">{currentNavItem.icon}</div>}
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{currentNavItem?.label}</h1>
            </div>
        );
    };

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Menu</div>
            <div className="p-2 space-y-1">
                {navItems.map(item => (
                  <Button key={item.id} variant={activeView === item.id ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => { setActiveView(item.id as any); setIsMobileMenuOpen(false); }}>{item.icon} {item.label}</Button>
                ))}
            </div>
            <div className="p-2">
                <button onClick={() => setIsLabsOpen(!isLabsOpen)} className="flex w-full items-center justify-between px-2 mb-2 group">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LABORATORIES</h2>
                    {isLabsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                </button>
                {isLabsOpen && (
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setDashboardSubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                        {departments?.map(dept => (
                            <li key={dept.id}><button onClick={() => {setDashboardSubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Property Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Property Custodian"}</p><p className="text-xs text-muted-foreground">Property Custodian</p></div></div></UserProfileModal><UserNav role="Property Custodian" /></div></div>
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
                    "hidden md:flex flex-col bg-[#141821] border-r border-border/50 relative transition-all duration-300 ease-in-out shrink-0",
                    isSidebarCollapsed ? "w-[72px]" : "w-[320px]"
                )}>
                    <div className="flex flex-1 overflow-hidden h-full">
                        {/* RAIL - ALWAYS VISIBLE */}
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3 shrink-0 z-20 w-[72px] border-r border-border/50">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex-1 flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant={activeView === item.id ? 'secondary' : 'ghost'} 
                                                size="icon" 
                                                className="h-12 w-12 rounded-lg" 
                                                onClick={() => setActiveView(item.id as any)}
                                            >
                                                {item.icon}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                            {/* Avatar at bottom of rail when collapsed */}
                            {isSidebarCollapsed && (
                                <div className="pb-4 mt-auto">
                                    <UserProfileModal role="Property Custodian">
                                         <Avatar className="h-10 w-10 cursor-pointer border border-border/50 hover:border-primary transition-all">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback>
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
                                <div className="p-4 font-headline text-lg font-bold border-b border-border/50 uppercase tracking-tighter whitespace-nowrap">System Console</div>
                                <div className="flex-1 py-4 space-y-4 overflow-y-auto scrollbar-none">
                                    <button onClick={() => setIsLabsOpen(!isLabsOpen)} className="flex w-full items-center justify-between px-4 mb-2 group">
                                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LABORATORIES</h2>
                                        {isLabsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
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
                                                    <p className="text-[10px] text-muted-foreground truncate">Property Custodian</p>
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
