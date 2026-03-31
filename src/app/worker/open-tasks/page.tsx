'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { arrayUnion, collection, doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';

import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { useWorkerProfile } from '@/hooks/use-worker-profile';
import { buildWorkerLogEntry, isOpenLowPriorityTask, workerStatusColors } from '@/lib/worker';
import type { Report } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkerOpenTasksPage() {
  const firestore = useFirestore();
  const { workerId, workerName, isLoading: isWorkerLoading } = useWorkerProfile();
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'reports');
  }, [firestore]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);

  const openTasks = useMemo(() => {
    return (reports || [])
      .filter(isOpenLowPriorityTask)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports]);

  const isLoading = isWorkerLoading || areReportsLoading;

  async function handleAcceptTask(taskId: string) {
    if (!firestore || !workerId) return;

    setActiveTaskId(taskId);
    try {
      await updateDoc(doc(firestore, 'reports', taskId), {
        assignedWorkerId: workerId,
        assignedContractor: workerName,
        workerAssignmentStatus: 'Accepted',
        acceptedAt: new Date().toISOString(),
        selfAssigned: true,
        status: 'Assigned',
        workflowStage: 'assigned_worker',
        actionLog: arrayUnion(buildWorkerLogEntry('Assigned', workerName, 'Task self-assigned from the low-priority queue.')),
      });

      toast({
        title: 'Task accepted',
        description: 'The low-priority task is now assigned to you.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Could not accept task',
        description: 'Please try again in a moment.',
      });
    } finally {
      setActiveTaskId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 p-6 text-white shadow-lg md:p-8">
        <h1 className="text-3xl font-bold md:text-4xl">Open Tasks</h1>
        <p className="mt-2 text-sm text-white/90 md:text-base">Low-priority tasks available for workers to self-assign and close out from the field.</p>
      </div>

      <div className="grid gap-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}

        {!isLoading &&
          openTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-xl">{task.description}</CardTitle>
                  <CardDescription className="mt-2">{task.location}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={workerStatusColors[task.status]}>{task.status}</Badge>
                  <Badge variant="secondary">{task.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Category: {task.category} {task.department ? `• ${task.department}` : ''} {task.estimatedResolutionTime ? `• ETA ${task.estimatedResolutionTime}` : ''}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => handleAcceptTask(task.id)} disabled={activeTaskId === task.id}>
                    {activeTaskId === task.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Accept Task
                      </>
                    )}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/worker/task/${task.id}`}>
                      View details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

        {!isLoading && openTasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No open low-priority tasks</CardTitle>
              <CardDescription>The self-assignment queue is empty right now.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
