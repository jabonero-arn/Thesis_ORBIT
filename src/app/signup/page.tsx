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
import { useAuth } from "@/firebase"
import { createUserWithEmailAndPassword, AuthError } from "firebase/auth"
import { Loader2 } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
        toast({
            variant: "destructive",
            title: "Passwords do not match",
            description: "Please check your passwords and try again.",
        })
        return;
    }
    setIsLoading(true);

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
            title: "Account Created!",
            description: "You have successfully signed up. Redirecting...",
        });
        
        // Only students can sign up, so always redirect to the student dashboard.
        router.push("/dashboard");

    } catch(e) {
        const error = e as AuthError;
        if (error.code === 'auth/email-already-in-use') {
            toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: "User already exists. Please sign in.",
            })
        } else {
            toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: error.message,
            })
        }
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="font-headline text-2xl pt-2">Create a Student Account</CardTitle>
          <CardDescription>Join LabFlow to start borrowing equipment.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Arnie Jabonero" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="id-number">ID Number</Label>
                <Input id="id-number" placeholder="2021-01234" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="course">Course</Label>
                    <Input id="course" placeholder="BS in Computer Science" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="year-level">Year Level</Label>
                    <Input id="year-level" placeholder="3rd Year" required />
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-center text-sm">
            <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link href="/" className="font-semibold text-primary hover:underline">
                    Sign In
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  )
}
