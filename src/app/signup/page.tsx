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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Logo } from "@/components/logo"

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
        toast({
            variant: "destructive",
            title: "Passwords do not match",
            description: "Please check your passwords and try again.",
        })
        return;
    }

    toast({
      title: "Account Created!",
      description: "You have successfully signed up. Redirecting...",
    })
    
    setTimeout(() => {
        router.push("/dashboard")
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="font-headline text-2xl pt-2">Create an Account</CardTitle>
          <CardDescription>Join LabFlow to start borrowing equipment.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Arnie Jabonero" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="student@example.com" required />
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
             <div className="grid gap-2">
                <Label>Role</Label>
                <RadioGroup defaultValue="student" className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="student" id="role-student" />
                        <Label htmlFor="role-student" className="font-normal">Student</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="role-teacher" />
                        <Label htmlFor="role-teacher" className="font-normal">Teacher</Label>
                    </div>
                </RadioGroup>
            </div>
            <Button type="submit" className="w-full mt-2">Create Account</Button>
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
