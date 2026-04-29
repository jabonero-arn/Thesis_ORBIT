
'use client';

import { useUser, useAuth } from '@/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';
import React from 'react';
import { Logo } from '@/components/logo';

export default function VerifyEmailPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);
  const [justSent, setJustSent] = React.useState(false);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleResend = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox for the verification link.',
      });
      setJustSent(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send verification email. Please try again later.',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  }
  
  if (isUserLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // This is a special case if a verified user lands here, which shouldn't happen with the redirects.
  if (user.emailVerified) {
    return (
        <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430] p-4">
          <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="items-center text-center">
                <Logo />
                <CardTitle className="pt-2 font-headline text-2xl flex items-center gap-2">
                    <MailCheck className="text-green-500"/> Email Already Verified
                </CardTitle>
                <CardDescription>
                    You can now log in to access your dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                 <Button onClick={handleLogout}>Back to Login</Button>
            </CardContent>
          </Card>
        </div>
    )
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#1e2430] p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="pt-2 font-headline text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
                {justSent ? "Another verification link has been sent to:" : "A verification link was sent to:"}
            </CardDescription>
             <p className="font-semibold text-primary">{user.email}</p>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
                Please click the link in that email to continue. Once verified, you can log in.
            </p>
            <div className="flex flex-col gap-3">
                 <Button onClick={handleResend} disabled={isSending}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Resend Verification Email
                </Button>
                <Button variant="link" onClick={handleLogout} className="text-muted-foreground">
                    Back to Login
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
