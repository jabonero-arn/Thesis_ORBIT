
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { 
    User, Package, Warehouse, Menu, Loader2, LayoutGrid, Building, Cpu, FlaskConical, Cog, PackageOpen, Activity, Hourglass, PlusCircle
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

export default function PropertyCustodianDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { items, departments, channels, borrowHistory } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    React.useEffect(() => {
      if (!isUserLoading && !user) {
        router.push("/login?role=property-custodian")
      }
    }, [user, isUserLoading, router])

    React.useEffect(() => {
        if (isUserLoading || isProfileLoading || !user) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    const [activeView, setActiveView] = React.useState<'dashboard' | 'add-materials' | 'outgoing-items'>('dashboard');
    const [dashboardSubView, setDashboardSubView] = React.useState<string>('overall'); // 'overall' or dept prefix
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
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

    const getItemChannelName = (channelId?: string) => {
        if (!channelId) return "Unassigned";
        return channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown";
    }
    
    const getStatusBadge = (item: InventoryItem) => {
        const tooltipContent = item.inaccuracyReason ? <TooltipContent><p>{item.inaccuracyReason}</p></TooltipContent> : null;
        let badge: JSX.Element;

        if (item.status === 'Pending Receipt') {
            badge = <Badge variant="outline">Pending Verification</Badge>;
        } else if (item.status === 'Inaccurate') {
            badge = <Badge variant="destructive">Inaccurate</Badge>;
        } else {
            badge = <Badge variant="secondary">Received</Badge>;
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
    ];
    
    const getDeptIcon = (prefix: string) => {
        if (prefix.startsWith('comp')) return <Cpu />;
        if (prefix.startsWith('chem')) return <FlaskConical />;
        if (prefix.startsWith('robo')) return <Cog />;
        return <Building />;
    }
    
    const renderContent = () => {
        switch(activeView) {
            case 'dashboard':
                const totalItemTypes = dashboardItems.length;
                const totalStock = dashboardItems.reduce((sum, item) => sum + item.quantity, 0);
                const borrowedItemsCount = dashboardHistory.filter(h => h.status === 'Active').length;
                const reservedItemsCount = dashboardHistory.filter(h => h.status === 'Reserved').length;
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
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
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <AddMaterialsForm onSubmissionSuccess={() => setActiveView('outgoing-items')} />
                    </div>
                );
            case 'outgoing-items':
                return (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <div><CardTitle>Outgoing Items</CardTitle><CardDescription>Monitor the verification status of materials you have provisioned.</CardDescription></div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Lab</TableHead><TableHead>Quantity</TableHead><TableHead>Date Added</TableHead><TableHead>Date Verified</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {items.length > 0 ? items.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{getItemChannelName(item.channelId)}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                <TableCell>{item.verifiedAt ? format(new Date(item.verifiedAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                <TableCell>{getStatusBadge(item)}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No items in inventory.</TableCell></TableRow>}
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
            {activeView === 'dashboard' && (
                <div className="p-2">
                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                    <ul className="flex flex-col gap-1">
                        <li><button onClick={() => {setDashboardSubView('overall'); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                        {departments?.map(dept => (
                            <li key={dept.id}><button onClick={() => {setDashboardSubView(dept.prefix); setIsMobileMenuOpen(false);}} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Property Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Property Custodian"}</p><p className="text-xs text-muted-foreground">Property Custodian</p></div></div></UserProfileModal><UserNav role="Property Custodian" /></div></div>
      </div>
    );
    
    if (isUserLoading || !user) {
      return (<div className="flex h-screen w-full items-center justify-center bg-[#1e2430]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
    }

    return (
        <TooltipProvider>
            <ForcePasswordChangeDialog open={showPasswordChangeDialog} onSuccess={() => setShowPasswordChangeDialog(false)} />
            <div className="flex h-screen bg-[#1e2430]">
                <div className="hidden md:flex flex-col bg-[#141821] border-r border-border/50">
                    <div className="flex flex-1">
                        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-3">
                            <div className="p-2 mb-2"><Logo /></div>
                            <div className="flex flex-col items-center gap-2 w-full">
                                {navItems.map(item => (
                                    <Tooltip key={item.id}><TooltipTrigger asChild>
                                        <Button variant={activeView === item.id ? 'secondary' : 'ghost'} size="icon" className="h-12 w-12 rounded-lg" onClick={() => setActiveView(item.id as any)}>{item.icon}</Button>
                                    </TooltipTrigger><TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent></Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="w-64 flex-col bg-[#141821] p-2">
                             <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
                                {activeView === 'dashboard' ? 'Dashboard View' : activeView === 'add-materials' ? 'Add Materials' : 'Outgoing Items'}
                            </div>
                            {activeView === 'dashboard' && (
                                <div className="py-4">
                                    <h2 className="mb-2 px-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">LABORATORIES</h2>
                                    <ul className="flex flex-col gap-1">
                                        <li><button onClick={() => setDashboardSubView('overall')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === 'overall' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}><LayoutGrid className="h-5 w-5" />Overall</button></li>
                                        {departments?.map(dept => (
                                            <li key={dept.id}><button onClick={() => setDashboardSubView(dept.prefix)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${dashboardSubView === dept.prefix ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>{getDeptIcon(dept.prefix)}{dept.name}</button></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                             {(activeView === 'add-materials' || activeView === 'outgoing-items') && (
                                <div className="py-4">
                                    <ul className="flex flex-col gap-1">
                                        <li>
                                            <button onClick={() => setActiveView('add-materials')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${activeView === 'add-materials' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <PlusCircle className="h-5 w-5" />Add Materials
                                            </button>
                                        </li>
                                         <li>
                                            <button onClick={() => setActiveView('outgoing-items')} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors ${activeView === 'outgoing-items' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-accent/50 hover:text-white'}`}>
                                                <Warehouse className="h-5 w-5" />Outgoing Items
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                             )}
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Property Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Property Custodian"}</p><p className="text-xs text-muted-foreground">Property Custodian</p></div></div></UserProfileModal><UserNav role="Property Custodian" /></div></div>
                </div>

                <main className="flex-1 flex flex-col h-screen">
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
                    </header>
                    {renderContent()}
                </main>
            </div>
        </TooltipProvider>
    )
}
