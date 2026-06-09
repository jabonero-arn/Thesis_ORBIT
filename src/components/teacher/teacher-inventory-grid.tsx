"use client"

import * as React from "react"
import type { InventoryItem, Channel } from "@/lib/types"
import { TeacherItemCard } from "./teacher-item-card"
import { PackageSearch } from "lucide-react"

type TeacherInventoryGridProps = {
  items: InventoryItem[]
  onItemSelect: (item: InventoryItem) => void
  onItemDetail: (item: InventoryItem) => void
  selectedItems: InventoryItem[]
  channels: Channel[]
}

export function TeacherInventoryGrid({ 
    items, 
    onItemSelect, 
    onItemDetail,
    selectedItems, 
    channels
}: TeacherInventoryGridProps) {
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/30 bg-card/20 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <PackageSearch className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No matching items found</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">Try adjusting your search query or filters to find what you're looking for.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 animate-in fade-in duration-700">
      {items.map((item) => (
        <TeacherItemCard 
            key={item.id} 
            item={item} 
            onSelect={() => onItemSelect(item)}
            onDetail={() => onItemDetail(item)}
            isSelected={selectedItems.some(si => si.id === item.id)}
            locationName={channels.find(c => c.id === item.channelId)?.name.replace('#', '')}
        />
      ))}
    </div>
  )
}
