'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { HardHat, CheckCircle, Clock } from 'lucide-react';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { differenceInHours } from 'date-fns';

export default function WorkerProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const historyQuery = useMemoFirebase(() => {
        if (!firestore || !user?.displayName) return null;
        return query(
            collection(firestore, 'reports'), 
            where('assignedContractor', '==', user.displayName),
            where('status', 'in', ['Resolved', 'Rejected']),
        );
    }, [firestore, user?.displayName]);

    const { data: tasks, isLoading: areTasksLoading } = useCollection<Report>(historyQuery);

    const stats = useMemo(() => {
        if (!tasks) return { totalCompleted: 0, avgTime: 'N/A' };

        const resolvedTasks = tasks.filter(t => {
            if (t.status !== 'Resolved' || !t.actionLog) return false;
            return t.actionLog.some(log => log.status === 'Resolved');
        });

        let avgResolutionHours: string | number = 'N/A';

        if (resolvedTasks.length > 0) {
            const totalResolutionTime = resolvedTasks.reduce((acc, r) => {
                const submitTime = new Date(r.timestamp);
                const resolvedAction = r.actionLog!.find(log => log.status === 'Resolved')!;
                const resolveTime = new Date(resolvedAction.timestamp);
                return acc + differenceInHours(resolveTime, submitTime);
            }, 0);

            avgResolutionHours = (totalResolutionTime / resolvedTasks.length).toFixed(1);
        }
        
        return {
            totalCompleted: tasks.length,
            avgTime: avgResolutionHours,
        }

    }, [tasks]);

  const isLoading = isUserLoading || areTasksLoading;

  if (isLoading) {
     return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full max-w-lg mx-auto" />
        </div>
    )
  }

  if (!user) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card className="text-center p-8">
                <CardTitle>Please log in</CardTitle>
                <CardDescription>You need to be logged in to view your profile.</CardDescription>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
       <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 md:p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Worker Profile</h1>
        <p className="text-base md:text-lg">Your identity and performance in the Parivartan system.</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Worker'} />
                    <AvatarFallback><HardHat /></AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center p-4 border-t">
                    <p className="font-semibold text-muted-foreground">Role</p>
                    <p className="text-lg font-bold text-primary">Field Worker</p>
                </div>
            </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                    <p className="text-xs text-muted-foreground">All-time resolved & rejected tasks.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.avgTime} <span className="text-base font-normal">hours</span></div>
                    <p className="text-xs text-muted-foreground">Average time per resolved task.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
