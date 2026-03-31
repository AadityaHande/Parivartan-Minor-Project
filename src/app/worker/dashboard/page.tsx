'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Activity, ArrowRight, BarChart3, ClipboardList, Clock3, HardHat, History, UserCircle2 } from 'lucide-react';

import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { useWorkerProfile } from '@/hooks/use-worker-profile';
import { isAssignedToWorker, isOpenLowPriorityTask } from '@/lib/worker';
import type { Report } from '@/lib/types';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const quickActions = [
  {
    href: '/worker/task',
    title: 'Assigned Tasks',
    description: 'View and act on tasks assigned to you.',
    icon: ClipboardList,
  },
  {
    href: '/worker/open-tasks',
    title: 'Open Low Priority Tasks',
    description: 'Pick up self-assignment work from the shared queue.',
    icon: Activity,
  },
  {
    href: '/worker/history',
    title: 'Task History',
    description: 'See completed and rejected task records.',
    icon: History,
  },
  {
    href: '/worker/performance',
    title: 'Performance',
    description: 'Track completion rate and turnaround time.',
    icon: BarChart3,
  },
  {
    href: '/worker/profile',
    title: 'Profile',
    description: 'Review your identity, stats, and worker info.',
    icon: UserCircle2,
  },
];

export default function WorkerDashboardPage() {
  const firestore = useFirestore();
  const { workerId, workerName, isLoading: isWorkerLoading } = useWorkerProfile();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'reports');
  }, [firestore]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);

  const stats = useMemo(() => {
    const allReports = reports || [];
    const assigned = allReports.filter((report) => isAssignedToWorker(report, workerId, workerName));

    return {
      assignedActive: assigned.filter((report) => report.status === 'Assigned' || report.status === 'In Progress').length,
      selfAssignPool: allReports.filter(isOpenLowPriorityTask).length,
      completed: assigned.filter((report) => report.status === 'Resolved').length,
      pendingProof: assigned.filter((report) => report.status === 'Assigned' && !report.beforeWorkMediaUrl).length,
    };
  }, [reports, workerId, workerName]);

  const isLoading = isWorkerLoading || areReportsLoading;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-teal-500 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit bg-white/15 text-white hover:bg-white/15">Worker Mobile App</Badge>
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">Field work, tracked from arrival to completion.</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/90 md:text-base">
                Check assigned work, self-assign low-priority tasks, upload before and after proof, and keep your daily performance summary in one place.
              </p>
            </div>
          </div>
          <Button asChild size="lg" variant="secondary" className="w-full md:w-auto">
            <Link href="/worker/task">
              Open my tasks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Assigned Active', value: stats.assignedActive, hint: 'Tasks you still need to work on.', icon: ClipboardList },
          { label: 'Open Low Priority', value: stats.selfAssignPool, hint: 'Tasks available for self-assignment.', icon: Activity },
          { label: 'Completed', value: stats.completed, hint: 'Resolved tasks already recorded.', icon: HardHat },
          { label: 'Pending Before Upload', value: stats.pendingProof, hint: 'Assigned tasks still waiting for first proof.', icon: Clock3 },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-14" /> : <div className="text-3xl font-bold">{item.value}</div>}
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>These pages cover your daily worker flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-2xl border bg-background p-4 transition hover:border-primary hover:bg-muted/40"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
