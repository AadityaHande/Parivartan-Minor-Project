'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, FileText, Plus } from 'lucide-react';

const bottomNavItems = [
  { href: '/citizen/dashboard', label: 'Home', icon: Home },
  { href: '/citizen/report', label: 'Report', icon: Plus },
  { href: '/citizen/my-complaints', label: 'My Complaints', icon: FileText },
];

export default function CitizenBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:hidden">
      {/* Navigation Bar */}
      <div className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 shadow-2xl rounded-t-3xl">
        <div className="flex h-18 items-center justify-between gap-1 px-3 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1.5 group min-w-0 px-1"
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200",
                  isActive 
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
                    : "text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                )}>
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <span className={cn(
                  "text-[9px] font-medium transition-colors text-center leading-none w-full truncate",
                  isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
