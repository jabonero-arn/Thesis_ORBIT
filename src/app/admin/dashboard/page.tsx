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
import { ShieldAlert, User } from "lucide-react"
import { currentUser } from "@/lib/data"

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#1e2430]">
        <header className="flex items-center justify-between p-4 border-b border-border/50 shadow-sm bg-[#1e2430]/80 backdrop-blur-sm">
            <Link href="/login?role=admin">
              <Button variant="outline">Back</Button>
            </Link>
            <UserNav>
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
                <ShieldAlert className="h-12 w-12 text-primary" />
                <CardTitle className="font-headline text-2xl pt-2">Admin Dashboard</CardTitle>
                <CardDescription>
                    Welcome, Admin. You have full access to all system features.
                </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                <p className="text-muted-foreground">
                    User management, inventory control, and system-wide analytics will be available here.
                </p>
                </CardContent>
            </Card>
        </main>
    </div>
  )
}
