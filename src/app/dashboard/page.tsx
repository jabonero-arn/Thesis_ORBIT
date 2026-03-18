"use client"

import * as React from "react"
import Link from "next/link"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { channels, currentUser, items as allItems } from "@/lib/data"
import type { InventoryItem, Channel } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

export default function Home() {
  const { toast } = useToast()
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  
  const [selectedItems, setSelectedItems] = React.useState<InventoryItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  
  const handleDepartmentSelect = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    const firstChannelInDept = channels.find(c => c.id.startsWith(departments.find(d=>d.id === deptId)?.prefix ?? ''));
    if (firstChannelInDept) {
      setSelectedChannelId(firstChannelInDept.id);
    }
    setSelectedItems([]);
  }

  const items = React.useMemo(
    () => allItems.filter((item) => item.channelId === selectedChannelId),
    [selectedChannelId]
  )
  
  const selectedChannel = React.useMemo(() => channels.find(c => c.id === selectedChannelId), [selectedChannelId])
  const selectedDepartment = React.useMemo(() => departments.find(d => d.id === selectedDepartmentId), [selectedDepartmentId]);

  const handleItemSelect = (item: InventoryItem) => {
    if (item.status === "Borrowed") return;

    const isSelected = selectedItems.some((i) => i.id === item.id)
    if (isSelected) {
        // Always allow deselecting
        setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))
    } else if (item.status === "Locked") {
        // If locked and not selected, inform user request has been sent
        toast({
            title: "Approval Request Sent",
            description: `Your request to borrow "${item.name}" has been sent for approval.`,
        });
    } else {
        // If available, just add it
        setSelectedItems((prev) => [...prev, item])
    }
  }

  const handleChannelSelect = (id: string) => {
    setSelectedChannelId(id)
    setSelectedItems([])
    setIsMobileMenuOpen(false) // Close mobile menu on selection
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#1e2430]">
        {/* Department Rail - Hidden on mobile */}
        <div className="hidden md:flex flex-col items-center gap-2 bg-[#0e1015] p-2">
          <div className="p-2 mb-2">
            <Logo />
          </div>
          <div className="flex flex-col gap-2">
            {departments.map(dept => (
              <Tooltip key={dept.id}>
                <TooltipTrigger asChild>
                    <Button 
                      variant={selectedDepartmentId === dept.id ? 'secondary' : 'ghost'} 
                      size="icon" 
                      className={`h-12 w-12 rounded-full transition-all duration-200 ${selectedDepartmentId === dept.id ? 'bg-primary rounded-2xl' : 'hover:bg-accent'}`}
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
          <div className="mt-auto p-2">
             <UserNav role="Student">
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>
                            <User />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </UserNav>
          </div>
        </div>

        {/* Channel List - Hidden on mobile, part of sheet */}
        <div className="hidden md:flex w-64 flex-col bg-[#141821] p-2">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
              {selectedDepartment?.name}
            </div>
            <AppSidebar
              departmentPrefix={selectedDepartment?.prefix ?? ''}
              selectedChannelId={selectedChannelId}
              onChannelSelect={handleChannelSelect}
            />
             <div className="mt-auto">
                <UserNav role="Student">
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm truncate">{currentUser.name}</span>
                    </div>
                </UserNav>
             </div>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen">
          <header className="flex items-center justify-between md:justify-start gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu />
                        <span className="sr-only">Open Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80vw] bg-[#141821] p-0 border-r border-border/50 flex flex-col">
                    <div className="flex flex-col h-full">
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
                         <div className="mt-auto">
                            <UserNav role="Student">
                                <div className="flex items-center gap-2 p-4 bg-black/20 cursor-pointer">
                                    <Avatar className="h-8 w-8">
                                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                    <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-sm truncate">{currentUser.name}</span>
                                </div>
                            </UserNav>
                         </div>
                    </div>
                </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
                <Hash className="text-muted-foreground" />
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">{selectedChannel?.name.replace('#', '')}</h1>
            </div>
            {/* Spacer for mobile view to center title */}
            <div className="md:hidden w-8" />
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <InventoryGrid 
              items={items} 
              onItemSelect={handleItemSelect}
              selectedItems={selectedItems} 
            />
          </div>
        </main>
        
        {/* Cart - now responsive */}
        <CheckoutFlow
          key={selectedChannelId}
          items={selectedItems}
          onClear={() => setSelectedItems([])}
          onSuccess={() => {
              setSelectedItems([]);
          }}
        />
      </div>
    </TooltipProvider>
  )
}
