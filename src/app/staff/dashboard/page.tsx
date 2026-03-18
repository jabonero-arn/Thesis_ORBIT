import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

export default function StaffDashboardPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="items-center text-center">
          <ClipboardList className="h-12 w-12 text-primary" />
          <CardTitle className="font-headline text-2xl pt-2">Staff Dashboard</CardTitle>
          <CardDescription>
            Welcome, Staff. Manage inventory and process checkouts.
          </CardDescription>
        </Header>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Tools for managing equipment and viewing transaction logs will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
