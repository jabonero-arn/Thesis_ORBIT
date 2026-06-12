
"use client"

import * as React from "react"
import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, Lock, Hourglass, Info, MapPin, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type StudentItemCardProps = {
  item: InventoryItem
  onSelect: () => void
  onDetail: () => void
  isSelected: boolean
  isPending?: boolean
  isApproved?: boolean
  locationName?: string
}

export function StudentItemCard({ 
    item, 
    onSelect, 
    onDetail,
    isSelected, 
    isPending,
    isApproved, 
    locationName 
}: StudentItemCardProps) {
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetail();
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.quantity > 0) {
        onSelect();
    }
  };

  const categories = React.useMemo(() => {
    if (Array.isArray(item.categories)) return item.categories;
    if (item.category) return [item.category];
    return [];
  }, [item]);

  const showPending = isPending && !isApproved;

  return (
    <Card 
      onClick={handleCardClick}
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-300 bg-card/40 backdrop-blur-sm group border-border/50 hover:border-primary/50 relative cursor-pointer",
        isSelected && "ring-2 ring-primary border-primary",
        (item.quantity === 0 || (isPending && !isApproved && !isSelected)) && "opacity-80"
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-black/20">
        {item.imageUrl ? (
            <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                data-ai-hint={item.imageHint}
            />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                <Tags className="h-12 w-12" />
            </div>
        )}
        
        {/* Status Overlays */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center backdrop-blur-[1px]">
            <CheckCircle className="h-10 w-10 text-white drop-shadow-lg" />
          </div>
        )}
        
        {showPending && (
          <div className="absolute inset-0 bg-amber-900/40 flex items-center justify-center backdrop-blur-[1px]">
             <Hourglass className="h-10 w-10 text-amber-400 animate-spin" />
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {item.quantity === 0 ? (
                <Badge variant="outline" className="bg-red-950/80 text-red-400 border-red-500/50 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm">
                  Out of Stock
                </Badge>
            ) : showPending ? (
                <Badge variant="outline" className="bg-amber-950/80 border-amber-500/50 text-amber-400 flex items-center text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    <Hourglass className="mr-1 h-3 w-3 animate-spin"/>Pending
                </Badge>
            ) : isApproved ? (
                <Badge variant="outline" className="bg-blue-950/80 border-blue-500/50 text-blue-400 flex items-center text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    <CheckCircle className="mr-1 h-3 w-3"/>Approved
                </Badge>
            ) : item.status === 'Locked' ? (
                <Badge variant="outline" className="bg-amber-950/80 border-amber-500/50 text-amber-400 flex items-center text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    <Lock className="mr-1 h-3 w-3"/>Restricted
                </Badge>
            ) : (
                <Badge variant="outline" className="bg-emerald-950/80 border-emerald-500/50 text-emerald-400 flex items-center text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    Available
                </Badge>
            )}
        </div>

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10">
                <Info className="h-4 w-4" />
            </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1 space-y-1">
            <h3 className="font-bold text-base leading-tight text-white group-hover:text-primary transition-colors line-clamp-1" title={item.name}>
                {item.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider line-clamp-1">
                <Tags className="h-3 w-3 shrink-0" /> {categories.length > 0 ? categories.join(', ') : "Uncategorized"}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                <MapPin className="h-3 w-3" /> {locationName || "General Storage"}
            </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Stock</span>
                <span className={cn("text-lg font-black font-mono", item.quantity > 0 ? "text-primary" : "text-muted-foreground/30")}>
                    {item.quantity.toString().padStart(2, '0')}
                </span>
            </div>
            <Button 
                size="sm" 
                variant={isSelected ? "secondary" : "default"}
                disabled={item.quantity === 0 || (isPending && !isApproved && !isSelected)}
                onClick={handleActionClick}
                className={cn(
                    "h-8 px-4 font-bold uppercase text-[10px] tracking-widest transition-all group/cartbtn shrink-0",
                    isSelected && "bg-primary/20 text-primary border-primary/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                )}
            >
                {isSelected ? (
                    <>
                        <span className="group-hover/cartbtn:hidden">In Cart</span>
                        <span className="hidden group-hover/cartbtn:inline">Cancel</span>
                    </>
                ) : (
                    item.quantity === 0 ? "Unavailable" : (isApproved || item.status !== 'Locked' ? "Select" : "Request")
                )}
            </Button>
        </div>
      </div>
    </Card>
  )
}
