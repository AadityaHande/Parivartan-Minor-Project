'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, HardHat, Loader2, Phone } from 'lucide-react';

import { useAuth, useFirestore, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const workerOrganizationOptions = ['Road Worker', 'Waste Worker', 'Engineer', 'Drainage Worker', 'Electricity Worker'];

export default function WorkerLoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerOrganization, setRegisterOrganization] = useState('Road Worker');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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
    if (!auth) return;

    setIsLoggingIn(true);
    try {
      await initiateEmailSignIn(auth, loginEmail, loginPassword);
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

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (!auth || !firestore) return;

    if (registerPassword !== registerConfirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password mismatch',
        description: 'Passwords do not match. Please try again.',
      });
      return;
    }

    if (registerPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak password',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setIsRegistering(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const newUser = userCredential.user;
      const userDocRef = doc(firestore, 'users', newUser.uid);

      await setDocumentNonBlocking(
        userDocRef,
        {
          id: newUser.uid,
          email: newUser.email,
          name: registerName,
          phoneNumber: registerPhone,
          organization: registerOrganization,
          employeeId,
          role: 'worker',
          points: 0,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Send SMS welcome message via API
      try {
        await fetch('/api/auth/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: registerPhone,
            message: `Welcome to Worker Mobile App, ${registerName}! Your account has been created successfully. Login to view tasks and complete field jobs.`,
          }),
        });
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        // Don't fail registration if SMS fails
      }

      toast({
        title: 'Registration successful',
        description: 'Welcome to the Worker Mobile App. An SMS has been sent to your phone.',
      });

      router.push('/worker/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Could not create account. Please try again.',
      });
    } finally {
      setIsRegistering(false);
    }
  }

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(
        userDocRef,
        {
          id: user.uid,
          email: user.email,
          name: user.displayName || 'Field Worker',
          role: 'worker',
          points: 0,
        },
        { merge: true }
      );
      if (!hasCreatedSession) {
        createServerSession()
          .catch((error) => console.error('Failed to create worker session', error))
          .finally(() => router.push('/worker/dashboard'));
        return;
      }
      router.push('/worker/dashboard');
    }
  }, [user, firestore, router, hasCreatedSession]);

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
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="worker@smc.gov.in"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
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
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input id="register-name" placeholder="John Doe" value={registerName} onChange={(event) => setRegisterName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-id">Employee ID</Label>
                  <Input id="employee-id" placeholder="SMC/FW/001" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your.name@smc.gov.in"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9"
                      value={registerPhone}
                      onChange={(event) => setRegisterPhone(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={registerOrganization} onValueChange={setRegisterOrganization}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {workerOrganizationOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
