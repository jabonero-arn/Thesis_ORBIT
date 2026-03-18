import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock } from "lucide-react"
import { Button } from "./ui/button"

type ItemCardProps = {
  item: InventoryItem
  onSelect: () => void
  isSelected: boolean
  isTeacherView?: boolean
}

export function ItemCard({ item, onSelect, isSelected, isTeacherView = false }: ItemCardProps) {
  
  const getButton = () => {
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

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm group h-full",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50 hover:shadow-md",
        item.status === "Borrowed" && "opacity-60 cursor-not-allowed"
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
        {isSelected && (
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
        <div className="mt-4">
          {getButton()}
        </div>
      </CardContent>
    </Card>
  )
}
