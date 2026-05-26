
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
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, signOut, AuthError, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const auth = useAuth()
  const firestore = useFirestore()

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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      })
      return
    }
    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a link to reset your password. This may take a few minutes.",
      })
    } catch (e) {
      const error = e as AuthError
      let description = "Could not send password reset email. Please try again."
      if (error.code === 'auth/user-not-found') {
        description = "No account found with this email address."
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: description,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user;

      if (!user.emailVerified) {
        router.push("/verify-email");
        setIsLoading(false);
        return;
      }

      // After successful sign-in, fetch user profile from Firestore
      if (!firestore) {
        throw new Error("Firestore is not initialized");
      }
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userRoleInDb: string | undefined;
      if (userDocSnap.exists()) {
          userRoleInDb = userDocSnap.data().role;
      } else {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: "User profile not found. Please contact support or sign up.",
          });
          setIsLoading(false);
          return;
      }

      const targetRole = role ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "";

      if (userRoleInDb !== targetRole) {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: `This account is for a '${userRoleInDb}' and cannot log in as a '${targetRole}'.`,
          });
          setIsLoading(false);
          return;
      }

      toast({
        title: "Logged In!",
        description: `Welcome back. Redirecting...`,
      })
      
      let redirectPath = "/dashboard"; // default to student
      if (role === "teacher") {
          redirectPath = "/teacher/dashboard";
      } else if (role === "supervisor") {
          redirectPath = "/supervisor/dashboard";
      } else if (role === "property-custodian") {
          redirectPath = "/materials-dashboard";
      }

      router.push(redirectPath)
    } catch (e) {
      const error = e as AuthError;
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
    return null 
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="pt-2 font-headline text-2xl">
            Sign In as {capitalizedRole}
          </CardTitle>
          <CardDescription>
            Enter your credentials to continue to Orbit.
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
            <div className="text-right">
                <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                >
                    Forgot password?
                </Button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
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
