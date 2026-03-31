'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Flag, List, Clock, Camera, Bell, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Report, Notification } from '@/lib/types';
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

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(3));
  }, [firestore]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);
  const { data: myReports, isLoading: myReportsLoading } = useCollection<Report>(myReportsQuery);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);

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
      <div className="grid grid-cols-2 gap-3">
        <Link href="/citizen/report">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:shadow-lg transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Report Issue</p>
                <p className="text-xs opacity-80">Snap & Submit</p>
              </div>
            </CardContent>
          </Card>
        </Link>
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

      {/* My Recent Reports */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">My Recent Reports</CardTitle>
          <Link href="/citizen/my-complaints" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {myReportsLoading && Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1">
                <Skeleton className="h-3 w-3/4 mb-1" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))}
          {!myReportsLoading && myReports && myReports.length > 0 ? (
            myReports.map((report) => (
              <Link key={report.id} href={`/citizen/complaint/${report.id}`}>
                <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img src={report.imageUrl} alt="" className="object-cover h-full w-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.description?.slice(0, 40)}...</p>
                    <p className="text-xs text-muted-foreground">{new Date(report.timestamp).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`${statusColors[report.status]} text-white text-xs`}>
                    {report.status}
                  </Badge>
                </div>
              </Link>
            ))
          ) : !myReportsLoading && (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports yet</p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/citizen/report">Report an Issue</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            SMC Updates
          </CardTitle>
          <Link href="/citizen/notifications" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-2 p-2 border rounded-lg">
                  <div className="bg-primary/10 p-1.5 rounded">
                    <Bell className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{notification.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">No updates yet</p>
          )}
        </CardContent>
      </Card>

      {/* Chatbot CTA */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8" />
            <div>
              <p className="font-semibold text-sm">Need Help?</p>
              <p className="text-xs opacity-80">Chat with our AI assistant</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/citizen/chatbot">Chat Now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
