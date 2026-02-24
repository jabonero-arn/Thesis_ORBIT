"use client"

import * as React from "react"
import { Bot, User } from "lucide-react"

import { channels, currentUser, items as allItems } from "@/lib/data"
import type { InventoryItem } from "@/lib/types"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { InventoryGrid } from "@/components/inventory-grid"
import { Logo } from "@/components/logo"
import { BorrowFlow } from "@/components/borrow-flow"
import AiSuggestionForm from "@/components/ai-suggestion-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Home() {
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels[0]?.id ?? ""
  )
  const [isAiToolOpen, setIsAiToolOpen] = React.useState(false);
  const [borrowingItem, setBorrowingItem] = React.useState<InventoryItem | null>(null)

  const items = React.useMemo(
    () => allItems.filter((item) => item.channelId === selectedChannelId),
    [selectedChannelId]
  )

  const handleBorrow = (item: InventoryItem) => {
    setBorrowingItem(item)
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <Logo />
            <h1 className="font-headline text-lg font-semibold">LabFlow</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <AppSidebar
            selectedChannelId={selectedChannelId}
            onChannelSelect={setSelectedChannelId}
          />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-2 p-2">
            <Dialog open={isAiToolOpen} onOpenChange={setIsAiToolOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Bot />
                  <span className="group-data-[collapsible=icon]:hidden">
                    AI Suggestions
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle className="font-headline">AI Equipment Suggestion Tool</DialogTitle>
                </DialogHeader>
                <AiSuggestionForm />
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-accent">
               <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                <span className="font-medium">{currentUser.name}</span>
                <span className="text-muted-foreground">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 p-4 md:p-6">
          <InventoryGrid items={items} onBorrow={handleBorrow} />
        </main>
      </SidebarInset>

      <BorrowFlow 
        item={borrowingItem}
        open={!!borrowingItem}
        onOpenChange={(open) => {
          if (!open) {
            setBorrowingItem(null)
          }
        }}
      />
    </SidebarProvider>
  )
}
