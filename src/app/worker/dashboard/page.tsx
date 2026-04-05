'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Umbrella } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type WorkerHomeSummary = {
  completedTasks: number;
  presentDays: number;
  holidaysTaken: number;
};

export default function WorkerDashboardPage() {
  const [summary, setSummary] = useState<WorkerHomeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const response = await fetch('/api/worker/dashboard-summary', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load worker dashboard summary.');
        }

        const data = await response.json();
        if (!isMounted) return;

        setSummary({
          completedTasks: data.completedTasks ?? 0,
          presentDays: data.presentDays ?? 0,
          holidaysTaken: data.holidaysTaken ?? 0,
        });
      } catch {
        if (!isMounted) return;
        setSummary({ completedTasks: 0, presentDays: 0, holidaysTaken: 0 });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold">Worker Home</h1>
        <p className="mt-2 text-sm text-white/90">
          Your activity snapshot for completed tasks, attendance days, and holidays.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.completedTasks ?? 0}</div>}
            <CardDescription className="mt-1">Resolved tasks in your account.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.presentDays ?? 0}</div>}
            <CardDescription className="mt-1">Last 30 days with worker activity logs.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holidays</CardTitle>
            <Umbrella className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{summary?.holidaysTaken ?? 0}</div>}
            <CardDescription className="mt-1">Estimated as days without activity in last 30 days.</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
