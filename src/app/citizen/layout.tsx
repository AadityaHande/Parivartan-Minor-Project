import CitizenHeader from '@/components/citizen-header';
import CitizenBottomNav from '@/components/citizen-bottom-nav';
import AuthGuard from '@/components/auth-guard';
import { PWAInstallBanner } from '@/components/pwa-install-button';
import CitizenChatbotWidget from '@/components/citizen-chatbot-widget';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-screen flex-col bg-gray-50 dark:bg-slate-950">
        <CitizenHeader />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        {/* PWA Install Banner */}
        <PWAInstallBanner variant="citizen" />

        <CitizenChatbotWidget />

        {/* Bottom Navigation for Mobile */}
        <CitizenBottomNav />
      </div>
    </AuthGuard>
  );
}
