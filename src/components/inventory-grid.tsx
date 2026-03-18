import type { InventoryItem } from "@/lib/types"
import { ItemCard } from "@/components/item-card"

type InventoryGridProps = {
  items: InventoryItem[]
  onItemSelect: (item: InventoryItem) => void
  selectedItems: InventoryItem[]
  isTeacherView?: boolean
}

export function InventoryGrid({ items, onItemSelect, selectedItems, isTeacherView }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border/50 bg-card/50 p-8 text-center text-muted-foreground">
        <p>No items found in this laboratory.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
      {items.map((item) => (
        <ItemCard 
            key={item.id} 
            item={item} 
            onSelect={() => onItemSelect(item)}
            isSelected={selectedItems.some(si => si.id === item.id)}
            isTeacherView={isTeacherView}
        />
      ))}
    </div>
  )
}
