'use client';

import SmcSidebar from '@/components/smc-sidebar';
import { usePathname } from 'next/navigation';

export default function SmcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The login page should not have the sidebar layout
  if (pathname === '/smc/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <SmcSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
