import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
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
    </div>
  )
}
