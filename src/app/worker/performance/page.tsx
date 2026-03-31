'use client';

import { useMemo } from 'react';
import { differenceInHours } from 'date-fns';
import { collection } from 'firebase/firestore';
import { Award, BarChart3, CheckCircle2, Clock3, Star } from 'lucide-react';

import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { useWorkerProfile } from '@/hooks/use-worker-profile';
import { getResolutionDate, isAssignedToWorker } from '@/lib/worker';
import type { Report } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function WorkerPerformancePage() {
  const firestore = useFirestore();
  const { workerId, workerName, isLoading: isWorkerLoading } = useWorkerProfile();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'reports');
  }, [firestore]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);

  const performance = useMemo(() => {
    const assignedReports = (reports || []).filter((report) => isAssignedToWorker(report, workerId, workerName));
    const resolvedReports = assignedReports.filter((report) => report.status === 'Resolved');
    const closedReports = assignedReports.filter((report) => report.status === 'Resolved' || report.status === 'Rejected');
    const selfAssignedReports = assignedReports.filter((report) => report.selfAssigned);

    const avgHours =
      resolvedReports.length > 0
        ? (
            resolvedReports.reduce((total, report) => {
              const completedAt = report.completedAt || report.actionLog?.find((log) => log.status === 'Resolved')?.timestamp;
              if (!completedAt) return total;
              return total + differenceInHours(new Date(completedAt), new Date(report.timestamp));
            }, 0) / resolvedReports.length
          ).toFixed(1)
        : '0.0';

    return {
      totalAssigned: assignedReports.length,
      resolved: resolvedReports.length,
      closed: closedReports.length,
      selfAssigned: selfAssignedReports.length,
      acceptanceRate: assignedReports.length ? Math.round((closedReports.length / assignedReports.length) * 100) : 0,
      avgHours,
      recent: closedReports
        .sort((a, b) => new Date(b.completedAt || b.timestamp).getTime() - new Date(a.completedAt || a.timestamp).getTime())
        .slice(0, 5),
    };
  }, [reports, workerId, workerName]);

  const isLoading = isWorkerLoading || areReportsLoading;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 p-6 text-white shadow-lg md:p-8">
        <h1 className="text-3xl font-bold md:text-4xl">Performance</h1>
        <p className="mt-2 text-sm text-white/90 md:text-base">A compact summary of workload, task closure, and worker turnaround.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Closed Tasks', value: performance.closed, icon: CheckCircle2, hint: 'Resolved or rejected tasks.' },
          { label: 'Self-Assigned', value: performance.selfAssigned, icon: Award, hint: 'Low-priority tasks you picked up.' },
          { label: 'Avg. Hours', value: performance.avgHours, icon: Clock3, hint: 'Average time to complete resolved work.' },
          { label: 'Completion Rate', value: `${performance.acceptanceRate}%`, icon: Star, hint: 'Closed tasks versus total assigned.' },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{item.value}</div>}
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent closed tasks
          </CardTitle>
          <CardDescription>Latest completed or rejected tasks recorded against your worker account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Closed on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    </TableRow>
                  ))}
                {!isLoading &&
                  performance.recent.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.description}</TableCell>
                      <TableCell>{task.status}</TableCell>
                      <TableCell>{task.priority || 'N/A'}</TableCell>
                      <TableCell className="text-right">{getResolutionDate(task)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
