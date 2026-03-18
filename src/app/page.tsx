"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const { toast } = useToast()
  const [username, setUsername] = React.useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    let redirectPath = "/dashboard"; // Default to student dashboard
    let userRole = "Student";

    if (username.includes("teacher")) {
        redirectPath = "/teacher/dashboard";
        userRole = "Teacher";
    } else if (username.includes("admin")) {
        redirectPath = "/admin/dashboard";
        userRole = "Admin";
    } else if (username.includes("staff")) {
        redirectPath = "/staff/dashboard";
        userRole = "Staff";
    }

    toast({
      title: "Logged In!",
      description: `Welcome back, ${userRole}. Redirecting...`,
    })

    setTimeout(() => {
        router.push(redirectPath)
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="font-headline text-2xl pt-2">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to LabFlow.</CardDescription>
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
               <p className="text-xs text-muted-foreground pt-1">
                Use 'teacher', 'admin', or 'staff' in your username to access other dashboards.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required defaultValue="password" />
            </div>
            <Button type="submit" className="w-full mt-2">Sign In</Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-center text-sm">
            <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Sign Up
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  )
}
