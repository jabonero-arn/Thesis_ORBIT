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
  
  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 bg-card/80 backdrop-blur-sm border border-transparent rounded-lg",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "hover:border-primary/50",
        item.status === "Borrowed" && "opacity-40 cursor-not-allowed"
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
          {item.status === 'Borrowed' && (
             <div className="absolute top-2 right-2">
                <Badge variant="secondary">Borrowed</Badge>
             </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pb-0">
        <CardTitle className="font-headline text-lg leading-tight">{item.name}</CardTitle>
      </CardContent>
      <CardFooter className="p-4">
        {item.status === 'Locked' ? (
          <div className="flex items-center gap-2 text-destructive">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Requires Teacher OTP</span>
          </div>
        ) : item.status === 'Available' ? (
           <Button 
            onClick={onSelect} 
            variant={isSelected ? "secondary" : "default"}
            className="w-full"
            disabled={item.status === 'Borrowed'}
            >
            {isSelected ? "Deselect" : "Select"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
