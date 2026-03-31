'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, FileText, Plus } from 'lucide-react';

const bottomNavItems = [
    { href: '/citizen/dashboard', label: 'Home', icon: Home },
    { href: '/citizen/report', label: 'Report', icon: Plus, isCentral: true },
    { href: '/citizen/my-complaints', label: 'My Complaints', icon: FileText },
];

export default function CitizenBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:hidden">
      {/* Navigation Bar */}
      <div className="bg-white border-t border-gray-100 shadow-2xl rounded-t-3xl">
        <div className="flex h-20 items-end justify-around pb-4 px-6 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            if (item.isCentral) {
              return (
                <div key={item.href} className="flex flex-col items-center -mt-8">
                  <Link href={item.href} aria-label={item.label}>
                    <div className={cn(
                      "relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300",
                      "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600",
                      "hover:scale-110 hover:shadow-2xl active:scale-95",
                      isActive && "ring-4 ring-green-200 ring-offset-2 ring-offset-white"
                    )}>
                      <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                    </div>
                  </Link>
                  <span className="text-[11px] mt-2 font-semibold text-gray-600">{item.label}</span>
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                  isActive 
                    ? "bg-emerald-50 text-emerald-600" 
                    : "text-gray-400 group-hover:bg-gray-50 group-hover:text-gray-600"
                )}>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[11px] font-medium transition-colors",
                  isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"
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
