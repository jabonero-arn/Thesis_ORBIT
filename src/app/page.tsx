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
import { User, Shield, ClipboardList, BookUser, Check, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

  const custodianRoles = ["Admin", "Staff", "Teacher", "Student"];
  const features = [
    "Track materials or stocks real-time",
    "Role-based dashboard after login",
    "Easy borrowing and reservation system",
  ];

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#1e2430] p-4 lg:p-8">
      
      <div className="flex flex-col lg:flex-row gap-16 max-w-6xl w-full items-center justify-center">
        {/* Left Side Info */}
        <div className="hidden lg:flex flex-col gap-8 text-foreground w-full max-w-sm">
            <div className="flex items-center gap-4">
                <Logo />
                <h1 className="font-headline text-3xl font-bold leading-tight">
                    Laboratory Materials Borrowing and Management
                </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-base border-primary text-primary">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Primary Custodian
                </Badge>
                {custodianRoles.map(role => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                ))}
            </div>
            
            <div className="space-y-3 rounded-lg border border-border/50 bg-card/30 p-6">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                    </div>
                ))}
            </div>
            
            <div className="border border-border/50 rounded-lg p-6 flex items-center justify-between bg-card/30">
                <div>
                    <h3 className="font-semibold text-lg">About Us</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-md">
                        LabFlow streamlines laboratory equipment management with a Discord-inspired interface, simplifying borrowing for students and inventory control for staff.
                    </p>
                </div>
                <Button variant="outline">View About Us</Button>
            </div>
        </div>

        {/* Right Side Card (Role Selection) */}
        <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm mx-auto">
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
