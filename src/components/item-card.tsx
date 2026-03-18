import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock, Minus, Plus } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

type ItemCardProps = {
  item: InventoryItem
  onSelect: () => void
  isSelected: boolean
  isTeacherView?: boolean
  isSelectionEnabled?: boolean
  isManagementView?: boolean
  onQuantityChange?: (itemId: string, newQuantity: number) => void
}

export function ItemCard({ item, onSelect, isSelected, isTeacherView = false, isSelectionEnabled = true, isManagementView = false, onQuantityChange }: ItemCardProps) {
  
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isManagementView) {
      // In management view, the card isn't for selection.
      return;
    }
    if (isSelectionEnabled && item.status !== 'Borrowed') {
      onSelect();
    }
  };

  return (
    <Card 
      onClick={handleCardClick}
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm group h-full",
        (isSelectionEnabled && item.status !== 'Borrowed' && !isManagementView) && "cursor-pointer",
        isSelected && isSelectionEnabled ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50 hover:shadow-md",
        item.status === "Borrowed" && isSelectionEnabled && !isManagementView && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint={item.imageHint}
        />
        {isSelected && isSelectionEnabled && !isManagementView && (
          <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary-foreground" />
          </div>
        )}
        {item.status === 'Borrowed' && <Badge variant="destructive" className="absolute top-2 left-2">Borrowed</Badge>}
        {item.status === 'Locked' && !isTeacherView && !isManagementView && <Badge variant="secondary" className="absolute top-2 left-2 flex items-center"><Lock className="mr-1 h-3 w-3"/>Locked</Badge>}

      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex-1">
          <h3 className="font-semibold text-base leading-tight truncate" title={item.name}>
            {item.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>
        {isManagementView && onQuantityChange && (
            <div className="flex items-center justify-between mt-4">
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onQuantityChange(item.id, item.quantity - 1); }} disabled={item.quantity <= 0}>
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold text-lg w-10 text-center select-none">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onQuantityChange(item.id, item.quantity + 1); }}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
    </Card>
  )
}
