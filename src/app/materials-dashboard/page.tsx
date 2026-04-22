
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { addDoc, collection, doc } from "firebase/firestore"
import { 
    User, Package, Warehouse, Menu, PlusCircle, Loader2
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
import type { InventoryItem, User as UserType, Department } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog"
import { AddChannelForm } from "@/components/primary-custodian/add-channel-form"
import { AddDepartmentForm } from "@/components/primary-custodian/add-department-form"
import { format } from "date-fns"

export default function PrimaryCustodianDashboardPage() {
    const router = useRouter()
    const { user, isUserLoading } = useUser()
    const { toast } = useToast()
    const { items, departments, channels } = useAppContext();
    const firestore = useFirestore();

    const [showPasswordChangeDialog, setShowPasswordChangeDialog] = React.useState(false);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userProfileRef);
    
    React.useEffect(() => {
      if (!isUserLoading && !user) {
        router.push("/login?role=primary-custodian")
      }
    }, [user, isUserLoading, router])

    React.useEffect(() => {
        if (isUserLoading || isProfileLoading || !user) return;
        if (userProfile?.passwordChangeRequired) {
            setShowPasswordChangeDialog(true);
        }
    }, [user, userProfile, isUserLoading, isProfileLoading]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);
    const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
    const [formDepartmentId, setFormDepartmentId] = React.useState<string | null>(null);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        
        const itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'verifiedAt'> = {
            name: name,
            description: formData.get("description") as string,
            channelId: formData.get("channelId") as string,
            quantity: parseInt(formData.get("quantity") as string, 10),
            status: 'Pending Receipt',
            imageUrl: formData.get("imageUrl") as string || `https://picsum.photos/seed/${name.replace(/\s/g, '-')}/600/400`,
            imageHint: name.toLowerCase().split(' ').slice(0, 2).join(' ')
        };
        
        try {
            const inventoryCollection = collection(firestore, "inventory_items");
            await addDoc(inventoryCollection, { ...itemData, createdAt: new Date().toISOString() });
            toast({ title: "Item Added", description: `${itemData.name} is now pending receipt by the facility supervisor.` });
            closeForm();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not save the item." });
        }
    }

    const openAddForm = () => {
        setIsFormOpen(true);
    }

    const closeForm = () => {
        setIsFormOpen(false);
        setFormDepartmentId(null);
    }
    
    const getItemChannelName = (channelId: string) => channels.find(c => c.id === channelId)?.name.replace('#', '') || "Unknown";
    const getStatusBadge = (item: InventoryItem) => {
        const variants = { "Available": "secondary", "Borrowed": "destructive", "Locked": "outline", "Pending Receipt": "outline", "Inaccurate": "destructive" } as const;
        const badge = <Badge variant={variants[item.status] || "default"}>{item.status}</Badge>;

        if (item.status === 'Inaccurate' && item.inaccuracyReason) {
            return (<Tooltip><TooltipTrigger>{badge}</TooltipTrigger><TooltipContent><p>{item.inaccuracyReason}</p></TooltipContent></Tooltip>);
        }
        return badge;
    }

    const navItems = [
        { id: 'materials', label: 'Material Provisioning', icon: <Warehouse /> },
    ];
    
    const renderContent = () => (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>Material Provisioning</CardTitle><CardDescription>Add new materials to the inventory and monitor their verification status.</CardDescription></div>
                    <Button onClick={openAddForm}><PlusCircle className="mr-2 h-4 w-4" /> Add New Material</Button>
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
    
    const getHeaderContent = () => (
        <div className="flex items-center gap-2">
            <Warehouse className="text-muted-foreground" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">Material Provisioning</h1>
        </div>
    );

    const mobileSidebarContent = (
      <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Menu</div>
            <div className="p-2 space-y-1">
                {navItems.map(item => (
                  <Button key={item.id} variant='secondary' className="w-full justify-start gap-2">{item.icon} {item.label}</Button>
                ))}
            </div>
          </div>
          <div className="mt-auto border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Primary Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Primary Custodian"}</p><p className="text-xs text-muted-foreground">Primary Custodian</p></div></div></UserProfileModal><UserNav role="Primary Custodian" /></div></div>
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
                            <div className="flex flex-col items-center gap-2 w-full">{navItems.map(item => (<Tooltip key={item.id}><TooltipTrigger asChild><Button variant='secondary' size="icon" className="h-12 w-12 rounded-lg">{item.icon}</Button></TooltipTrigger><TooltipContent side="right" align="center"><p>{item.label}</p></TooltipContent></Tooltip>))}</div>
                        </div>
                        <div className="w-64 flex-col bg-[#141821] p-2">
                            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">Materials</div>
                            <div className="py-4"><ul className="flex flex-col gap-1"><li><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium transition-colors bg-accent text-white"><Warehouse className="h-5 w-5" />Material Provisioning</button></li></ul></div>
                        </div>
                    </div>
                     <div className="border-t border-border/50 bg-[#0e1015]"><div className="flex items-center justify-between p-2"><UserProfileModal role="Primary Custodian"><div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer rounded-md p-1 transition-colors hover:bg-accent"><Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={user?.photoURL || undefined} alt={userProfile?.displayName || user?.displayName || ""} /><AvatarFallback>{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'P'}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="truncate text-sm font-semibold leading-none">{userProfile?.displayName || user?.displayName || "Primary Custodian"}</p><p className="text-xs text-muted-foreground">Primary Custodian</p></div></div></UserProfileModal><UserNav role="Primary Custodian" /></div></div>
                </div>

                <main className="flex-1 flex flex-col h-screen">
                    <header className="flex h-16 items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm sticky top-0 z-30"><div className="flex items-center gap-4"><Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r-0 flex flex-col">{mobileSidebarContent}</SheetContent></Sheet>{getHeaderContent()}</div></header>
                    {renderContent()}
                </main>

                 <Dialog open={isFormOpen} onOpenChange={closeForm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Material</DialogTitle>
                            <DialogDescription>Fill in the details for the new material. It will be added to the inventory pending verification by the relevant supervisor.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2"><Label htmlFor="name">Item Name</Label><Input id="name" name="name" required/></div>
                            <div className="grid gap-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" required/></div>
                            <div className="grid gap-2"><Label htmlFor="quantity">Initial Quantity</Label><Input id="quantity" name="quantity" type="number" defaultValue={1} required/></div>
                           
                            <div className="grid gap-2">
                               <Label htmlFor="departmentId-form">Department</Label>
                               <Select onValueChange={(value) => setFormDepartmentId(value)} required>
                                   <SelectTrigger id="departmentId-form"><SelectValue placeholder="Select a department..." /></SelectTrigger>
                                   <SelectContent>{departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
                               </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="channelId">Specific Room</Label>
                                <Select name="channelId" required disabled={!formDepartmentId}>
                                    <SelectTrigger id="channelId"><SelectValue placeholder="Select a room..." /></SelectTrigger>
                                    <SelectContent>{channels.filter(c => c.departmentId === formDepartmentId).map(c => (<SelectItem key={c.id} value={c.id}>{c.name.replace(/#/g, '')}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2"><Label htmlFor="imageUrl">Image URL (Optional)</Label><Input id="imageUrl" name="imageUrl" placeholder="https://..."/></div>
                            <DialogFooter><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit">Add Material</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
