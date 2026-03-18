import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock, Minus, Plus } from "lucide-react"
import { Button } from "./ui/button"

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
  
  const getButton = () => {
    if (isManagementView && onQuantityChange) {
        return (
            <div className="flex items-center justify-between">
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onQuantityChange(item.id, item.quantity - 1)} disabled={item.quantity <= 0}>
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold text-lg w-10 text-center select-none">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onQuantityChange(item.id, item.quantity + 1)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    if (!isSelectionEnabled) {
      return null;
    }

    if (item.status === 'Borrowed') {
        return <Button variant="secondary" disabled className="w-full justify-center">Borrowed</Button>
    }
    
    if (item.status === 'Locked' && !isSelected && !isTeacherView) {
        return (
            <Button onClick={onSelect} variant="destructive" className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Unlock
            </Button>
        )
    }

    return (
        <Button 
            onClick={onSelect} 
            variant={isSelected ? "secondary" : "default"} 
            className="w-full"
        >
            {isSelected ? "Deselect" : "Select"}
        </Button>
    )
  }

  const button = getButton();

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm group h-full",
        isSelected && isSelectionEnabled ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50 hover:shadow-md",
        item.status === "Borrowed" && isSelectionEnabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          data-ai-hint={item.imageHint}
        />
        {isSelected && isSelectionEnabled && (
          <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary-foreground" />
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-base leading-tight truncate" title={item.name}>
            {item.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>
        </div>
        {button && (
            <div className="mt-4">
                {button}
            </div>
        )}
      </CardContent>
    </Card>
  )
}
