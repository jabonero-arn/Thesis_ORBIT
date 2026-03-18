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
import { User, Shield, ClipboardList, BookUser, Check } from "lucide-react"

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

  const features = [
    "Track stock in real-time",
    "Role-based dashboard after login",
    "Easy borrowing and reservation system",
    "Comprehensive management for staff and admins",
  ]

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#1e2430] p-4 lg:p-8">
      <Button variant="outline" className="absolute top-4 right-4 lg:top-8 lg:right-8">About Us</Button>
      
      <div className="grid lg:grid-cols-2 gap-16 max-w-6xl w-full items-center">
        {/* Left Side Info */}
        <div className="hidden lg:flex flex-col gap-8 text-foreground">
            <h1 className="font-headline text-5xl font-bold leading-tight">
                Laboratory Materials Borrowing and Management
            </h1>
            <div>
                <h2 className="font-semibold text-lg text-primary">Primary Custodians</h2>
                <p className="text-muted-foreground">Admin, Staff, & Teacher</p>
            </div>
            <div className="space-y-3">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                    </div>
                ))}
            </div>
            <p className="text-muted-foreground/80 leading-relaxed">
                LabFlow streamlines laboratory equipment management with a Discord-inspired interface. It simplifies borrowing for students, approvals for teachers, and inventory control for staff, ensuring a smooth and efficient workflow for everyone.
            </p>
        </div>

        {/* Right Side Card (Role Selection) */}
        <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm mx-auto lg:mx-0 lg:justify-self-end">
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
