'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, Shield, ChevronRight } from 'lucide-react';
import { smcNavItems } from '@/lib/nav-items';
import { cn } from '@/lib/utils';
import UserNav from './user-nav';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function SmcSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
  };

  const navContent = (
    <nav className="flex flex-col gap-1 px-3">
      {smcNavItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
              isActive 
                ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              isActive ? 'bg-white/20' : 'bg-muted group-hover:bg-background'
            )}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden w-72 border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-3 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">PMC Admin</span>
              <span className="text-xs text-muted-foreground">Control Panel</span>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            {navContent}
          </div>
          
          {/* Footer */}
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <UserNav />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Administrator</p>
                <p className="text-xs text-muted-foreground">Manage system</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-11"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between gap-4 border-b bg-card px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col w-72 p-0">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold">PMC Admin</span>
                  <span className="text-xs text-muted-foreground font-normal">Control Panel</span>
                </div>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {navContent}
            </div>
            <div className="border-t p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-11"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">PMC Admin</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <UserNav />
        </div>
      </header>
    </>
  );
}
