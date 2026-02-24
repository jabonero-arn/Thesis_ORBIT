import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock } from "lucide-react"

type ItemCardProps = {
  item: InventoryItem
  onSelect: (item: InventoryItem) => void
  isSelected: boolean
}

export function ItemCard({ item, onSelect, isSelected }: ItemCardProps) {
  const statusVariant = {
    Available: "secondary",
    Locked: "destructive",
    Borrowed: "outline",
  } as const

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-card/50 backdrop-blur-sm",
        isSelected && "ring-2 ring-primary shadow-2xl",
        item.status === "Borrowed" && "opacity-40 cursor-not-allowed hover:transform-none"
      )}
      onClick={() => item.status !== "Borrowed" && onSelect(item)}
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
           <div className="absolute top-2 right-2">
            <Badge variant={statusVariant[item.status]} className={cn(item.status === "Borrowed" && "text-muted-foreground")}>
              {item.status === 'Locked' ? <Lock className="h-3 w-3" /> : item.status}
            </Badge>
           </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <CardTitle className="font-headline text-lg">{item.name}</CardTitle>
        <CardDescription className="mt-1 text-sm">{item.description}</CardDescription>
      </CardContent>
    </Card>
  )
}
