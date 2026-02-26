import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock } from "lucide-react"
import { Button } from "./ui/button"

type ItemCardProps = {
  item: InventoryItem
  onSelect: () => void
  isSelected: boolean
}

export function ItemCard({ item, onSelect, isSelected }: ItemCardProps) {
  
  const getButton = () => {
    if (item.status === 'Borrowed') {
        return <Badge variant="secondary" className="w-full justify-center py-2 text-sm">Borrowed</Badge>
    }
    
    if (item.status === 'Locked' && !isSelected) {
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
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm border border-transparent rounded-lg",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50",
        item.status === "Borrowed" && "opacity-50 cursor-not-allowed"
      )}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-video">
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
      </CardHeader>
      <CardContent className="flex-1 p-4 pb-0">
        <CardTitle className="font-headline text-lg leading-tight">{item.name}</CardTitle>
      </CardContent>
      <CardFooter className="p-4 mt-auto">
        {getButton()}
      </CardFooter>
    </Card>
  )
}
