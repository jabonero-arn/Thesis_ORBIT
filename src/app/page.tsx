"use client"

import * as React from "react"
import { Bot, User, Cpu, FlaskConical, TestTube2, HardDrive, Cog, ChevronDown, Hash } from "lucide-react"

import { channels, currentUser, items as allItems } from "@/lib/data"
import type { InventoryItem, Channel } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import AiSuggestionForm from "@/components/ai-suggestion-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

export default function Home() {
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  
  const [isAiToolOpen, setIsAiToolOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<InventoryItem[]>([])
  
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

    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id)
      if (isSelected) {
        return prev.filter((i) => i.id !== item.id)
      } else {
        return [...prev, item]
      }
    })
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#1e2430]">
        {/* Department Rail */}
        <div className="flex flex-col items-center gap-2 bg-[#0e1015] p-2">
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
             <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Channel List */}
        <div className="w-64 flex flex-col bg-[#141821] p-2">
            <div className="p-4 font-headline text-lg font-bold border-b border-border/50">
              {selectedDepartment?.name}
            </div>
            <AppSidebar
              departmentPrefix={selectedDepartment?.prefix ?? ''}
              selectedChannelId={selectedChannelId}
              onChannelSelect={(id) => {
                setSelectedChannelId(id)
                setSelectedItems([])
              }}
            />
             <div className="mt-auto flex items-center gap-2 p-2 bg-black/20 rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{currentUser.name}</span>
             </div>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen">
          <header className="flex items-center gap-2 p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <Hash className="text-muted-foreground" />
            <h1 className="font-headline text-xl font-bold uppercase tracking-wider">{selectedChannel?.name.replace('#', '')} Equipment</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <InventoryGrid 
              items={items} 
              onItemSelect={handleItemSelect}
              selectedItems={selectedItems} 
            />
          </div>
        </main>
        
        {/* Cart/Order Menu */}
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
