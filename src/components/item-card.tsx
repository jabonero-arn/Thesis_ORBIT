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
import { CheckCircle } from "lucide-react"

type ItemCardProps = {
  item: InventoryItem
  onSelect: (item: InventoryItem) => void
  isSelected: boolean
}

export function ItemCard({ item, onSelect, isSelected }: ItemCardProps) {
  const statusVariant = {
    Available: "secondary",
    Locked: "default",
    Borrowed: "destructive",
  } as const

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer",
        isSelected && "ring-2 ring-primary",
        item.status === "Borrowed" && "opacity-50 cursor-not-allowed"
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
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-headline text-lg">{item.name}</CardTitle>
            <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
        </div>
        <CardDescription className="mt-2">{item.description}</CardDescription>
      </CardContent>
    </Card>
  )
}
