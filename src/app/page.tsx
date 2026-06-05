
"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { CheckCircle, ArrowRight, UserPlus, LogIn } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  const features = [
      "Real-time laboratory stock tracking",
      "Automated role-based dashboards",
      "Item reservation and scheduling",
      "QR-enabled checkouts and returns",
  ]

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430] p-4 lg:p-8">
      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch">

        {/* Info Card */}
        <Card className="hidden w-full max-w-lg flex-col border-border/50 bg-card/80 backdrop-blur-sm lg:flex">
          <CardHeader>
            <CardTitle className="font-headline text-2xl uppercase tracking-tighter">
              Orbit Laboratory OS
            </CardTitle>
             <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Efficient</Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Secure</Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Real-time</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-4 rounded-lg border border-border/50 bg-black/20 p-6">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground/90">{feature}</span>
                    </div>
                ))}
            </div>
            <div>
                 <h3 className="font-semibold mb-2 text-white">About Orbit</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                    Orbit simplifies laboratory equipment management with a
                    high-performance interface, making borrowing easy for students and
                    inventory control efficient for staff and teachers.
                </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm flex flex-col justify-center">
          <CardHeader className="items-center text-center">
            <div className="mb-4 scale-125">
               <Logo />
            </div>
            <CardTitle className="pt-2 font-headline text-3xl uppercase tracking-tighter">
              Welcome to Orbit
            </CardTitle>
            <CardDescription className="max-w-[280px] mx-auto">
              The central hub for laboratory material management and borrowing.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-8">
            <Button
              asChild
              size="lg"
              className="w-full text-base font-semibold group"
            >
              <Link href="/login">
                <LogIn className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                <span>Sign In to Dashboard</span>
                <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
              </Link>
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">New Student?</span>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full text-base border-border/50 hover:bg-white/5"
            >
              <Link href="/signup">
                <UserPlus className="mr-2 h-5 w-5" />
                <span>Create Student Account</span>
              </Link>
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
             <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
               © 2024 Orbit Laboratory Management
             </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
