
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [educationLevel, setEducationLevel] = React.useState<"college" | "shs" | "">("");

  const collegeCourses = [
    "BS in Information Technology",
    "BS in Electronics Engineering",
    "BS in Mechanical Engineering",
    "BS in Computer Engineering",
    "BS in Industrial Engineering",
  ];

  const shsStrands = [
    "STEM (Science, Technology, Engineering, and Mathematics)",
    "ABM (Accountancy, Business, and Management)",
    "HUMSS (Humanities and Social Sciences)",
    "GAS (General Academic Strand)",
    "TVL (Technical-Vocational-Livelihood)",
  ];

  const collegeYearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
  const shsYearLevels = ["Grade 11", "Grade 12"];


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
             <div className="grid gap-2">
                <Label htmlFor="education-level">Education Level</Label>
                <Select onValueChange={(value: "college" | "shs") => setEducationLevel(value)} required>
                    <SelectTrigger id="education-level">
                        <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="shs">Senior High School</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {educationLevel && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="course-strand">{educationLevel === 'college' ? 'Course' : 'Strand'}</Label>
                        <Select name="course-strand" required>
                            <SelectTrigger id="course-strand">
                                <SelectValue placeholder={`Select ${educationLevel === 'college' ? 'course' : 'strand'}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {(educationLevel === 'college' ? collegeCourses : shsStrands).map(option => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="year-level">Year Level</Label>
                        <Select name="year-level" required>
                            <SelectTrigger id="year-level">
                                <SelectValue placeholder="Select year level" />
                            </SelectTrigger>
                            <SelectContent>
                                {(educationLevel === 'college' ? collegeYearLevels : shsYearLevels).map(option => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
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
