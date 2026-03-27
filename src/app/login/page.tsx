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
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword, AuthError } from "firebase/auth"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const auth = useAuth()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const role = searchParams.get("role")

  React.useEffect(() => {
    if (!role) {
      router.push("/")
    }
  }, [role, router])

  const capitalizedRole = role
    ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : ""

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Special check for the specific email and role
    if (email.toLowerCase() === "christianjayefernan@gmail.com" && role !== "staff") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This account can only log in as Staff.",
      })
      return;
    }

    if (email.toLowerCase() === "jaboneroarnie@gmail.com" && role !== "teacher") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This account can only log in as Teacher.",
      })
      return;
    }

    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Logged In!",
        description: `Welcome back. Redirecting...`,
      })
      // Redirect based on role after successful login
      let redirectPath = "/dashboard"; // default to student
      if (role === "teacher") {
          redirectPath = "/teacher/dashboard";
      } else if (role === "admin") {
          redirectPath = "/admin/dashboard";
      } else if (role === "staff") {
          redirectPath = "/staff/dashboard";
      } else if (role === "primary-custodian") {
          redirectPath = "/primary-custodian/dashboard";
      }

      router.push(redirectPath)
    } catch (e) {
      const error = e as AuthError;
      console.error(error.code, error.message);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Email or password is incorrect.",
        })
      } else {
         toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message,
        })
      }
      setIsLoading(false)
    }
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
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
          {role === 'student' && (
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-primary hover:underline"
              >
                Sign Up
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
