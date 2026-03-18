import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
        return <Badge variant="secondary" className="w-full justify-center py-2 text-sm">Borrowed</Badge>
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
            disabled={item.status === 'Borrowed'}
        >
            {isSelected ? "Deselect" : "Select"}
        </Button>
    )
  }

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50 hover:shadow-lg",
        item.status === "Borrowed" && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="relative aspect-square">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover"
          data-ai-hint={item.imageHint}
        />
          {isSelected && (
          <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-primary-foreground" />
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <p className="flex-1 text-sm font-medium leading-snug">{item.name}</p>
        <div className="mt-4">
          {getButton()}
        </div>
      </CardContent>
    </Card>
  )
}
