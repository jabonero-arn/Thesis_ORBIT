import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserNav } from "@/components/user-nav"
import { ClipboardList, User, ArrowLeft } from "lucide-react"
import { currentUser } from "@/lib/data"

export default function StaffDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#1e2430]">
        <header className="flex items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <div className="w-24"></div>
            <UserNav role="Staff">
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>
                            <User />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </UserNav>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="items-center text-center">
                    <ClipboardList className="h-12 w-12 text-primary" />
                    <CardTitle className="font-headline text-2xl pt-2">Staff Dashboard</CardTitle>
                    <CardDescription>
                        Welcome, Staff. Manage inventory and process checkouts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground">
                        Tools for managing equipment and viewing transaction logs will be available here.
                    </p>
                </CardContent>
            </Card>
        </main>
        <Link href="/" className="fixed bottom-6 right-6 z-50">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Homepage
          </Button>
        </Link>
    </div>
  )
}
