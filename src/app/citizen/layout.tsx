import CitizenHeader from '@/components/citizen-header';
import CitizenBottomNav from '@/components/citizen-bottom-nav';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth-guard';
import { PWAInstallBanner } from '@/components/pwa-install-button';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-screen flex-col bg-gray-50">
        <CitizenHeader />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        {/* PWA Install Banner */}
        <PWAInstallBanner variant="citizen" />

        {/* Floating Chatbot Button - Enhanced */}
        <div className="fixed bottom-28 right-4 z-50 md:bottom-8 md:right-8">
          <Link 
            href="/citizen/chatbot"
            className="group flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
          >
            <MessageCircle className="h-7 w-7" />
            <span className="sr-only">Open Chatbot</span>
            {/* Tooltip */}
            <div className="absolute right-16 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
              Chat with us
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </Link>
        </div>

        {/* Bottom Navigation for Mobile */}
        <CitizenBottomNav />
      </div>
    </AuthGuard>
  );
}
