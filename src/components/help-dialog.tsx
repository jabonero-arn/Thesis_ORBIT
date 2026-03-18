"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function HelpDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Beginner's Guide to LabFlow</DialogTitle>
          <DialogDescription>
            Welcome! Here’s a quick guide to get you started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid gap-1">
                <h4 className="font-semibold text-primary">1. Navigate Departments & Labs</h4>
                <p className="text-muted-foreground">Use the icons on the far left to switch between major departments (e.g., Computer, Chemistry). Then, select a specific lab channel from the list to see its available equipment.</p>
            </div>
            <div className="grid gap-1">
                <h4 className="font-semibold text-primary">2. Select Items for your Cart</h4>
                <p className="text-muted-foreground">Click the 'Select' button on any item card to add it to your cart on the right. Your cart will appear on mobile once you add your first item.</p>
            </div>
             <div className="grid gap-1">
                <h4 className="font-semibold text-primary">3. Unlock Restricted Items</h4>
                <p className="text-muted-foreground">Some items are marked with a red 'Unlock' button. To add these to your cart, you'll need a One-Time Password (OTP) from a teacher or lab staff.</p>
            </div>
             <div className="grid gap-1">
                <h4 className="font-semibold text-primary">4. Checkout or Reserve</h4>
                <p className="text-muted-foreground">In your cart, review your selected items. You have two options:</p>
                <ul className="list-disc list-inside text-muted-foreground pl-4 space-y-1">
                    <li><span className="font-semibold text-foreground">Immediate Borrow:</span> Click 'Generate QR Code'. A unique code for your transaction will be displayed. Show this to the lab staff to pick up your items.</li>
                    <li><span className="font-semibold text-foreground">Reserve for Later:</span> Toggle the switch, then pick a future date and time. Click 'Submit Reservation'. Your items will be held for you.</li>
                </ul>
            </div>
             <div className="grid gap-1">
                <h4 className="font-semibold text-primary">5. Manage Your Account</h4>
                <p className="text-muted-foreground">Click your avatar at the bottom of the sidebar to access your profile, view borrow history, get help, or log out.</p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
