"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const role = searchParams.get("role")

  React.useEffect(() => {
    if (!role) {
      router.push("/")
    }
  }, [role, router])

  const capitalizedRole = role
    ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : ""

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let redirectPath = "/dashboard" // Default to student dashboard

    if (role === "teacher") {
      redirectPath = "/teacher/dashboard"
    } else if (role === "admin") {
      redirectPath = "/admin/dashboard"
    } else if (role === "staff") {
      redirectPath = "/staff/dashboard"
    } else if (role === "primary-custodian") {
      redirectPath = "/primary-custodian/dashboard"
    }

    toast({
      title: "Logged In!",
      description: `Welcome back, ${capitalizedRole}. Redirecting...`,
    })

    setTimeout(() => {
      router.push(redirectPath)
    }, 1000)
  }

  if (!role) {
    return null // Prevent rendering the page if role is missing while redirecting
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="pt-2 font-headline text-2xl">
            Sign In as {capitalizedRole}
          </CardTitle>
          <CardDescription>
            Enter your credentials to continue to LabFlow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                defaultValue="password"
              />
            </div>
            <Button type="submit" className="mt-2 w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col space-y-2 text-center text-sm">
          <p className="text-muted-foreground">
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              Back to role selection
            </Link>
          </p>
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
