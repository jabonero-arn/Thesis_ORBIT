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
import { User, Shield, ClipboardList, BookUser } from "lucide-react"

export default function RoleSelectionPage() {
  const roles = [
    {
      name: "Student",
      href: "/login?role=student",
      icon: <User className="mr-2 h-5 w-5" />,
    },
    {
      name: "Teacher",
      href: "/login?role=teacher",
      icon: <BookUser className="mr-2 h-5 w-5" />,
    },
    {
      name: "Staff",
      href: "/login?role=staff",
      icon: <ClipboardList className="mr-2 h-5 w-5" />,
    },
    {
      name: "Admin",
      href: "/login?role=admin",
      icon: <Shield className="mr-2 h-5 w-5" />,
    },
  ]

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#1e2430] p-4 lg:p-8">
      <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch">
        {/* About Us Card - Hidden on mobile, shown on lg screens */}
        <Card className="hidden w-full max-w-sm flex-col border-border/50 bg-card/80 backdrop-blur-sm lg:flex">
          <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="pt-2 font-headline text-2xl">
              About LabFlow
            </CardTitle>
            <CardDescription>
              Streamlining Laboratory Management
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center text-center">
            <p className="text-muted-foreground">
              LabFlow simplifies laboratory equipment management with a
              Discord-inspired interface, making borrowing easy for students and
              inventory control efficient for staff.
            </p>
          </CardContent>
        </Card>

        {/* Role Selection Card */}
        <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="pt-2 font-headline text-2xl">
              Welcome to LabFlow
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
