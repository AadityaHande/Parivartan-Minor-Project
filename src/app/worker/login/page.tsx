'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, HardHat, Loader2 } from 'lucide-react';

import { useAuth, useFirestore, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signOut } from 'firebase/auth';

export default function WorkerLoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const [workerId, setWorkerId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [hasCreatedSession, setHasCreatedSession] = useState(false);

  async function createServerSession() {
    if (!auth.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/worker/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });
    setHasCreatedSession(true);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!auth || !firestore) return;

    setIsLoggingIn(true);
    try {
      const lookupResponse = await fetch('/api/worker/login-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });

      const lookupData = await lookupResponse.json();

      if (!lookupResponse.ok || !lookupData?.email) {
        throw new Error(lookupData?.error || 'Worker ID not found. Contact admin.');
      }

      await initiateEmailSignIn(auth, lookupData.email, loginPassword);

      if (!auth.currentUser) {
        throw new Error('Login failed. Please try again.');
      }

      const workerDoc = await getDoc(doc(firestore, 'users', auth.currentUser.uid));

      if (!workerDoc.exists() || workerDoc.data().role !== 'worker') {
        await signOut(auth);
        throw new Error('This account is not authorized for worker login.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  useEffect(() => {
    if (user && firestore) {
      (async () => {
        const workerDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!workerDoc.exists() || workerDoc.data().role !== 'worker') {
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Unauthorized account',
            description: 'Only workers added by admin can log in here.',
          });
          return;
        }

        if (!hasCreatedSession) {
          createServerSession()
            .catch((error) => console.error('Failed to create worker session', error))
            .finally(() => router.push('/worker/dashboard'));
          return;
        }
        router.push('/worker/dashboard');
      })().catch((error) => {
        console.error('Worker auth check failed', error);
      });
    }
  }, [user, firestore, router, hasCreatedSession, auth, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-900/80">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
            <HardHat className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-2xl font-bold text-transparent">
            Worker Mobile App
          </CardTitle>
          <CardDescription>Login, view tasks, upload proof, and complete field jobs from your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-id">Worker ID</Label>
              <Input
                id="worker-id"
                type="text"
                placeholder="WRK-1234"
                value={workerId}
                onChange={(event) => setWorkerId(event.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Accounts are created by admin. Self-registration is disabled.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              Back to Home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
