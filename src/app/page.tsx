
"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { User, Shield, ClipboardList, BookUser, CheckCircle, Crown, Warehouse } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function RoleSelectionPage() {
  const roles = [
     {
      name: "Property Custodian",
      href: "/login?role=property-custodian",
      icon: <Warehouse className="mr-2 h-5 w-5" />,
    },
    {
      name: "Head Supervisor",
      href: "/login?role=head-supervisor",
      icon: <Crown className="mr-2 h-5 w-5" />,
    },
    {
      name: "Supervisor",
      href: "/login?role=supervisor",
      icon: <Shield className="mr-2 h-5 w-5" />,
    },
    {
      name: "Staff",
      href: "/login?role=staff",
      icon: <ClipboardList className="mr-2 h-5 w-5" />,
    },
    {
      name: "Teacher",
      href: "/login?role=teacher",
      icon: <BookUser className="mr-2 h-5 w-5" />,
    },
    {
      name: "Student",
      href: "/login?role=student",
      icon: <User className="mr-2 h-5 w-5" />,
    },
  ]

  const features = [
      "Real-time stock tracking",
      "Role-based dashboards",
      "Item reservation system",
      "QR code for quick checkout",
  ]

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4 lg:p-8">
      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch">

        {/* Info Card */}
        <Card className="hidden w-full max-w-lg flex-col border-border/50 bg-card/80 backdrop-blur-sm lg:flex">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Laboratory Materials Borrowing and Management
            </CardTitle>
             <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">Property Custodian</Badge>
                <Badge variant="secondary">Head Supervisor</Badge>
                <Badge variant="secondary">Supervisor</Badge>
                <Badge variant="secondary">Staff</Badge>
                <Badge variant="secondary">Teacher</Badge>
                <Badge variant="secondary">Student</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-3 rounded-lg border border-border/50 bg-black/20 p-4">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                ))}
            </div>
            <div>
                 <h3 className="font-semibold mb-2">About Orbit</h3>
                 <p className="text-sm text-muted-foreground">
                    Orbit simplifies laboratory equipment management with a
                    Discord-inspired interface, making borrowing easy for students and
                    inventory control efficient for staff.
                </p>
            </div>
          </CardContent>
        </Card>

        {/* Role Selection Card */}
        <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="pt-2 font-headline text-2xl">
              Welcome to Orbit
            </CardTitle>
            <CardDescription>
              Please select your role to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {roles.map((role) => (
              <Button
                key={role.name}
                asChild
                variant="secondary"
                size="lg"
                className="justify-start text-base"
              >
                <Link href={role.href}>
                  {role.icon}
                  <span>{role.name}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
