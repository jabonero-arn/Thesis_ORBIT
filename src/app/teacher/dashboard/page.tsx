"use client"

import * as React from "react"
import { User, Cpu, FlaskConical, Cog, Hash, Menu, Check, History as HistoryIcon, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { channels, currentUser, items as allItems, borrowHistory as initialBorrowHistory } from "@/lib/data"
import type { InventoryItem, Channel, BorrowHistory } from "@/lib/types"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const departments = [
  { id: "comp", name: "Computer Lab", prefix: "computer-lab", icon: <Cpu /> },
  { id: "chem", name: "Chemistry Lab", prefix: "chemistry-lab", icon: <FlaskConical /> },
  { id: "robo", name: "Robotics Lab", prefix: "robotics-lab", icon: <Cog /> },
];

export default function TeacherDashboardPage() {
  const { toast } = useToast()
  
  // State for borrowing
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState(departments[0].id)
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels.find(c => c.id.startsWith(departments[0].prefix))?.id ?? ""
  );
  const [selectedItems, setSelectedItems] = React.useState<InventoryItem[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // State for request approvals
  const [history, setHistory] = React.useState<BorrowHistory[]>(initialBorrowHistory)

  const pendingRequests = history.filter((r) => r.status === 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const processedRequests = history.filter((r) => r.status !== 'Pending').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRequest = (id: string, newStatus: 'Approved' | 'Denied') => {
    setHistory(currentHistory => 
      currentHistory.map(record => 
        record.id === id ? { ...record, status: newStatus } : record
      )
    )
    const updatedRecord = history.find(r => r.id === id);
    if (updatedRecord) {
        toast({
            title: `Request ${newStatus}`,
            description: `Request for "${updatedRecord.itemName}" from ${updatedRecord.studentName} has been ${newStatus.toLowerCase()}.`,
        })
    }
  }

  const getBadgeVariant = (status: 'Approved' | 'Denied') => {
    switch (status) {
      case 'Approved':
        return 'secondary'
      case 'Denied':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Handlers for borrowing
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
        setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))
    } else if (item.status === "Locked") {
        toast({
            title: "Approval Request Sent",
            description: `Your request to borrow "${item.name}" has been sent for approval.`,
        });
    } else {
        setSelectedItems((prev) => [...prev, item])
    }
  }

  const handleChannelSelect = (id: string) => {
    setSelectedChannelId(id)
    setSelectedItems([])
    setIsMobileMenuOpen(false) // Close mobile menu on selection
  }

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
                    <Badge variant={getBadgeVariant(record.status as 'Approved' | 'Denied')}>
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

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#1e2430]">
        {/* Department Rail */}
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
            <UserNav>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              </Button>
            </UserNav>
          </div>
        </div>

        {/* Channel List */}
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
            <UserNav>
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
                    <UserNav>
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
                <HistoryIcon className="text-muted-foreground" />
                <h1 className="font-headline text-xl font-bold uppercase tracking-wider truncate">Teacher Dashboard</h1>
            </div>
            <div className="md:hidden w-8" />
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Tabs defaultValue="borrow">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="borrow">Borrow Equipment</TabsTrigger>
                <TabsTrigger value="requests">Approve Requests</TabsTrigger>
              </TabsList>
              <TabsContent value="borrow" className="mt-6">
                <InventoryGrid
                  items={items}
                  onItemSelect={handleItemSelect}
                  selectedItems={selectedItems}
                />
              </TabsContent>
              <TabsContent value="requests" className="mt-6">
                <ApprovalRequests />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Cart */}
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
