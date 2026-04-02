'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Flag, List, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { differenceInHours } from 'date-fns';

export default function CitizenDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const myReportsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'reports'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(3)
    );
  }, [firestore, user?.uid]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);
  const { data: myReports, isLoading: myReportsLoading } = useCollection<Report>(myReportsQuery);

  const stats = useMemo(() => {
    if (!reports) return null;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const resolvedToday = reports.filter(r => {
      if (r.status !== 'Resolved') return false;
      const resolvedAction = r.actionLog?.find(log => log.status === 'Resolved');
      if (!resolvedAction) return false;
      return new Date(resolvedAction.timestamp) > twentyFourHoursAgo;
    }).length;
    
    const ongoingWork = reports.filter(r => r.status === 'In Progress' || r.status === 'Assigned').length;

    return {
      totalReports: reports.length,
      resolvedToday,
      ongoingWork,
    }
  }, [reports]);

  const rewardProgress = useMemo(() => {
    if (!reports || !user?.uid) {
      return { verifiedCount: 0, remaining: 3, qualified: false };
    }

    const verifiedCount = reports.filter((report) => {
      if (report.userId !== user.uid) return false;
      if (report.status !== 'Resolved') return false;

      const genuineCheck = report.aiAnalysis?.verificationSuggestion?.toLowerCase().includes('genuine');
      const hasVerificationTrail = Array.isArray(report.actionLog) && report.actionLog.length > 0;

      return genuineCheck || hasVerificationTrail;
    }).length;

    return {
      verifiedCount,
      remaining: Math.max(0, 3 - verifiedCount),
      qualified: verifiedCount >= 3,
    };
  }, [reports, user?.uid]);

  const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500',
    'Under Verification': 'bg-yellow-500',
    Assigned: 'bg-orange-500',
    'In Progress': 'bg-amber-600',
    Resolved: 'bg-green-600',
    Rejected: 'bg-red-600',
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-2">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3">
        <Link href="/citizen/my-complaints">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <List className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">My Reports</p>
                <p className="text-xs opacity-80">Track Status</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Flag className="h-4 w-4 mx-auto text-primary mb-1" />
            {isLoading ? <Skeleton className="h-5 w-8 mx-auto" /> : <p className="text-lg font-bold">{stats?.totalReports ?? 0}</p>}
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            {isLoading ? <Skeleton className="h-5 w-8 mx-auto" /> : <p className="text-lg font-bold">{stats?.ongoingWork ?? 0}</p>}
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
            {isLoading ? <Skeleton className="h-5 w-8 mx-auto" /> : <p className="text-lg font-bold">{stats?.resolvedToday ?? 0}</p>}
            <p className="text-xs text-muted-foreground">Resolved 24h</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Reward progress</p>
            </div>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
              {rewardProgress.qualified
                ? 'You have earned a prize opportunity for completing 3 genuine reports.'
                : `Complete ${rewardProgress.remaining} more verified reports to unlock a prize.`}
            </p>
          </div>
          <div className="min-w-[88px] rounded-2xl bg-white px-3 py-2 text-center shadow-sm dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{Math.min(rewardProgress.verifiedCount, 3)}/3</p>
            <p className="text-[11px] text-muted-foreground">Verified</p>
          </div>
        </CardContent>
      </Card>

      {/* My Reports */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <List className="h-4 w-4" />
            My Reports
          </CardTitle>
          <Link href="/citizen/my-complaints" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {myReports && myReports.length > 0 ? (
            <div className="space-y-2">
              {myReports.map((report) => (
                <Link key={report.id} href={`/citizen/complaint/${report.id}`} className="flex items-start gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="bg-slate-100 p-1.5 rounded dark:bg-slate-800">
                    <List className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{report.description?.slice(0, 36)}...</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{new Date(report.timestamp).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`${statusColors[report.status]} text-white text-[10px]`}>{report.status}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">No reports yet</p>
          )}
        </CardContent>
      </Card>

      {/* Chatbot CTA */}
      <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Need Help?</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chat with Roadie or track your reports</p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-full bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
            <Link href="/citizen/chatbot">Chat Now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
