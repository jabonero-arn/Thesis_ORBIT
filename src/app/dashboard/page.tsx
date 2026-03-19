"use client"

import * as React from "react"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, CornerDownLeft, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
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
import { cn } from "@/lib/utils"
import { useAppContext } from "@/context/app-context"
import { UserProfileModal } from "@/components/user-profile-modal"

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

export default function Home() {
  const { toast } = useToast()
  const { items: allItems, borrowHistory, setBorrowHistory } = useAppContext();
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  
  const [selectedItems, setSelectedItems] = React.useState<CartItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const pendingRequestedItemNames = React.useMemo(() =>
    borrowHistory
      .filter(h => h.studentName === currentUser.name && h.status === 'Pending')
      .map(h => h.itemName),
    [borrowHistory]
  );
  
  const handleDepartmentSelect = (deptId: string) => {
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
    
    if (pendingRequestedItemNames.includes(item.name)) {
        toast({
            title: "Request Already Pending",
            description: `You already have a pending request for "${item.name}".`,
        });
        return;
    }

    const isSelected = selectedItems.some((cartItem) => cartItem.item.id === item.id)
    if (isSelected) {
        // Quantity is managed in the cart
    } else if (item.status === "Locked") {
        const newRequest: BorrowHistory = {
            id: `bh-${Date.now()}`,
            studentName: currentUser.name,
            itemName: item.name,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
        };
        setBorrowHistory(prev => [newRequest, ...prev]);
        toast({
            title: "Approval Request Sent",
            description: `Your request for "${item.name}" has been sent for approval.`,
        });
    } else {
        // If available, just add it with quantity 1
        setSelectedItems((prev) => [...prev, { item, quantity: 1 }])
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
                                variant={selectedDepartmentId === dept.id ? 'secondary' : 'ghost'}
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
                  </div>
                </div>

                {/* Channel List */}
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
            </div>
            <div className="border-t border-border/50 bg-[#0e1015]">
              <div className="flex items-center justify-between p-2">
                  <UserProfileModal role="Student">
                    <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer group">
                        <Avatar className="h-8 w-8 group-hover:ring-2 group-hover:ring-primary transition-all flex-shrink-0">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
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
                        </div>
                        <div className="mt-auto border-t border-border/50 bg-[#0e1015]">
                          <div className="flex items-center justify-between p-2">
                              <UserProfileModal role="Student">
                                <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer group">
                                    <Avatar className="h-8 w-8 group-hover:ring-2 group-hover:ring-primary transition-all flex-shrink-0">
                                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                      <p className="truncate text-sm font-semibold leading-none">{currentUser.name}</p>
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
              pendingRequestedItemNames={pendingRequestedItemNames} 
            />
          </div>
        </main>
        
        {/* Cart - now responsive */}
        <CheckoutFlow
          key={selectedChannelId}
          items={selectedItems}
          onItemQuantityChange={handleItemQuantityChange}
          onClear={() => setSelectedItems([])}
          onSuccess={() => {
              setSelectedItems([]);
          }}
        />

      </div>
    </TooltipProvider>
  )
}
