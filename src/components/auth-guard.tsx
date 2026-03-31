'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if still loading or if on login page
    if (isUserLoading) return;
    if (pathname === '/citizen/login') return;
    
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/citizen/login');
    }
  }, [user, isUserLoading, router, pathname]);

  // Show loading while checking auth
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If on login page, show the page regardless of auth status
  if (pathname === '/citizen/login') {
    return <>{children}</>;
  }

  // If not authenticated, show loading (redirect will happen)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Authenticated, show children
  return <>{children}</>;
}
