import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ItemCardProps = {
  item: InventoryItem
  onBorrow: (item: InventoryItem) => void
}

export function ItemCard({ item, onBorrow }: ItemCardProps) {
  const statusVariant = {
    Available: "secondary",
    Locked: "default",
    Borrowed: "destructive",
  } as const

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            data-ai-hint={item.imageHint}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-headline text-lg">{item.name}</CardTitle>
            <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
        </div>
        <CardDescription className="mt-2">{item.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() => onBorrow(item)}
          disabled={item.status === "Borrowed"}
        >
          Borrow Item
        </Button>
      </CardFooter>
    </Card>
  )
}
