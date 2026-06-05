
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
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, AuthError, sendPasswordResetEmail, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const firestore = useFirestore()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
        description: "Check your inbox for a link to reset your password.",
      })
    } catch (e) {
      const error = e as AuthError
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Authenticate user with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user;

      // 2. Check email verification
      if (!user.emailVerified) {
        router.push("/verify-email");
        setIsLoading(false);
        return;
      }

      // 3. Fetch user profile from Firestore to determine role
      if (!firestore) throw new Error("Database connection error.");
      
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.role;

        // 4. Role-based redirection logic
        // We map roles from the database to their respective dashboard paths
        const redirectMap: Record<string, string> = {
          "Student": "/dashboard",
          "Teacher": "/teacher/dashboard",
          "Supervisor": "/supervisor/dashboard",
          "Property Custodian": "/materials-dashboard"
        };

        const targetPath = redirectMap[role];

        if (targetPath) {
          toast({
            title: "Success",
            description: `Welcome back, ${userData.displayName || 'User'}!`,
          });
          router.push(targetPath);
        } else {
          // If for some reason the role is unassigned or invalid
          await signOut(auth);
          setError("Your account has an unassigned role. Please contact a Lab Supervisor.");
          setIsLoading(false);
        }
      } else {
        // Fallback if auth exists but no Firestore profile is found
        await signOut(auth);
        setError("Account profile not found. Please contact support.");
        setIsLoading(false);
      }
    } catch (e) {
      const error = e as AuthError;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else {
        setError(error.message);
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="pt-2 font-headline text-2xl uppercase tracking-tighter">
            Sign In to Orbit
          </CardTitle>
          <CardDescription>
            Enter your email and password to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                >
                    Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col space-y-4 text-center text-sm">
          <p className="text-muted-foreground">
            Don't have a student account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:underline"
            >
              Sign Up
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:underline"
          >
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
