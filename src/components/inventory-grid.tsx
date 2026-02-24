import type { InventoryItem } from "@/lib/types"
import { ItemCard } from "@/components/item-card"

type InventoryGridProps = {
  items: InventoryItem[]
  onBorrow: (item: InventoryItem) => void
}

export function InventoryGrid({ items, onBorrow }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-card p-8 text-center text-muted-foreground">
        <p>No items found in this laboratory.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onBorrow={onBorrow} />
      ))}
    </div>
  )
}
