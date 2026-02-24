"use client"

import * as React from "react"
import { Bot, User, ShoppingCart, QrCode } from "lucide-react"

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
import AiSuggestionForm from "@/components/ai-suggestion-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckoutFlow } from "@/components/checkout-flow"
import Image from "next/image"

export default function Home() {
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channels[0]?.id ?? ""
  )
  const [isAiToolOpen, setIsAiToolOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<InventoryItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false)
  const [isQrCodeOpen, setIsQrCodeOpen] = React.useState(false)

  const items = React.useMemo(
    () => allItems.filter((item) => item.channelId === selectedChannelId),
    [selectedChannelId]
  )

  const handleItemSelect = (item: InventoryItem) => {
    // Cannot select borrowed items
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
  
  const handleClearSelection = () => {
    setSelectedItems([])
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2">
            <Logo />
            <h1 className="font-headline text-xl font-bold">LabFlow</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <AppSidebar
            selectedChannelId={selectedChannelId}
            onChannelSelect={(id) => {
              setSelectedChannelId(id)
              setSelectedItems([]) // Clear selection when changing channel
            }}
          />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-2 p-2">
            <Dialog open={isAiToolOpen} onOpenChange={setIsAiToolOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
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

            <Dialog open={isQrCodeOpen} onOpenChange={setIsQrCodeOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <QrCode />
                  <span className="group-data-[collapsible=icon]:hidden">
                    My QR Code
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[325px]">
                <DialogHeader>
                  <DialogTitle className="font-headline">Your Personal QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Present this code to the lab staff for borrowing and returning items.
                  </p>
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=LabFlow-User-${currentUser.id}`}
                    alt="Your Personal QR Code"
                    width={256}
                    height={256}
                    className="rounded-lg bg-white p-2"
                    data-ai-hint="qr code"
                  />
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-3 rounded-md p-2">
               <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                <span className="font-semibold tracking-wide">{currentUser.name}</span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <InventoryGrid 
            items={items} 
            onItemSelect={handleItemSelect}
            selectedItems={selectedItems} 
          />
        </main>
        {selectedItems.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="flex items-center gap-4 rounded-lg bg-card/80 backdrop-blur-sm p-4 shadow-2xl border border-primary/20 ring-1 ring-black/5">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-primary h-5 w-5"/>
                    <span className="font-bold text-lg">{selectedItems.length}</span>
                    <span className="text-muted-foreground">item(s) selected</span>
                </div>
              <Button onClick={() => setIsCheckoutOpen(true)}>Review & Checkout</Button>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>Clear</Button>
            </div>
          </div>
        )}
      </SidebarInset>

      <CheckoutFlow
        items={selectedItems}
        open={isCheckoutOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCheckoutOpen(false)
          }
        }}
        onSuccess={() => {
            setIsCheckoutOpen(false);
            setSelectedItems([]);
        }}
      />
    </SidebarProvider>
  )
}
