"use client"

import * as React from "react"
import Image from "next/image"
import type { InventoryItem } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Tags, Box, ShoppingCart, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

type TeacherItemDetailsDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBorrow: (item: InventoryItem) => void
  isSelected: boolean
  locationName: string
}

export function TeacherItemDetailsDialog({
  item,
  open,
  onOpenChange,
  onBorrow,
  isSelected,
  locationName
}: TeacherItemDetailsDialogProps) {
  if (!item) return null

  const categories = React.useMemo(() => {
    if (Array.isArray(item.categories)) return item.categories;
    if (item.category) return [item.category];
    return [];
  }, [item]);

  const canAction = item.quantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#141821] border-border/50 p-0 overflow-hidden shadow-2xl">
        <div className="relative h-64 w-full bg-black/40">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover opacity-80"
              data-ai-hint={item.imageHint}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10">
                <Box className="h-32 w-32" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141821] via-[#141821]/20 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex flex-col gap-2">
               <div className="flex flex-wrap gap-2">
                    {categories.length > 0 ? categories.map(cat => (
                        <Badge key={cat} variant="secondary" className="bg-primary/20 text-primary border-primary/30 uppercase tracking-widest text-[10px] font-bold">
                            {cat}
                        </Badge>
                    )) : (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 uppercase tracking-widest text-[10px] font-bold">
                            General Equipment
                        </Badge>
                    )}
                     {item.status === 'Locked' && (
                         <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-500 uppercase tracking-widest text-[10px] font-bold">
                            <Lock className="h-3 w-3 mr-1" /> restricted
                        </Badge>
                    )}
               </div>
               <DialogTitle className="text-3xl font-black font-headline text-white drop-shadow-sm uppercase tracking-tighter">
                {item.name}
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <LabelText className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</LabelText>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.description || "No detailed description provided for this item."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="h-8 w-8 rounded-lg bg-black/40 border border-border/50 flex items-center justify-center text-primary">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Location</span>
                                <span className="font-semibold">{locationName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                            <div className="h-8 w-8 rounded-lg bg-black/40 border border-border/50 flex items-center justify-center text-emerald-500">
                                <Tags className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Primary Classification</span>
                                <span className="font-semibold">{categories[0] || "Unassigned"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="p-4 rounded-xl bg-black/30 border border-border/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">In Stock</span>
                                <span className={cn("text-3xl font-black font-mono", item.quantity > 0 ? "text-primary" : "text-muted-foreground/30")}>
                                    {item.quantity.toString().padStart(2, '0')}
                                </span>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Box className="h-6 w-6" />
                            </div>
                        </div>

                        <Separator className="bg-border/30" />

                        <div className="space-y-2">
                            <LabelText className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Availability</LabelText>
                            <div className="flex items-center gap-2">
                                {item.quantity === 0 ? (
                                    <Badge variant="outline" className="w-full justify-center py-1.5 bg-destructive/10 border-destructive/30 text-destructive uppercase font-bold tracking-widest text-[10px]">
                                        Out of Stock
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="w-full justify-center py-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-500 uppercase font-bold tracking-widest text-[10px]">
                                        Ready for Checkout
                                    </Badge>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            <DialogFooter className="pt-6 border-t border-border/30">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-white">Close Details</Button>
                <Button 
                    disabled={!canAction}
                    onClick={() => { onBorrow(item); if(!isSelected && canAction) onOpenChange(false); }}
                    className={cn(
                        "font-bold uppercase tracking-widest px-8",
                        isSelected ? "bg-emerald-600 hover:bg-emerald-700" : ""
                    )}
                >
                    {isSelected ? (
                        <><ShoppingCart className="h-4 w-4 mr-2" /> In Cart</>
                    ) : (
                        "Add to Cart"
                    )}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LabelText({ children, className }: { children: React.ReactNode, className?: string }) {
    return <span className={cn("block text-sm font-medium text-white/90", className)}>{children}</span>
}
