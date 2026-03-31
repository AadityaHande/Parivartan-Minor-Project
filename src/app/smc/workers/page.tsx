'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Report, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { HardHat, Activity, CheckCircle, Mail, ClipboardPlus, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface WorkerStats {
  active: number;
  completed: number;
}

export default function SmcWorkersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'active' | 'completed' | 'name'>('active');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState('2 hours');
  const [isAssigning, setIsAssigning] = useState(false);

  const workersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'worker'));
  }, [firestore]);

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const { data: workers, isLoading: areWorkersLoading } = useCollection<User>(workersQuery);
  const { data: reports, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);

  const workerData = useMemo(() => {
    if (!workers || !reports) return null;

    const stats: Record<string, WorkerStats> = {};

    workers.forEach(worker => {
      stats[worker.name] = { active: 0, completed: 0 };
    });

    reports.forEach(report => {
      if (report.assignedContractor && stats[report.assignedContractor]) {
        if (report.status === 'Resolved' || report.status === 'Rejected') {
          stats[report.assignedContractor].completed++;
        } else if (report.status === 'Assigned' || report.status === 'In Progress') {
          stats[report.assignedContractor].active++;
        }
      }
    });

    const mappedWorkers = workers.map(worker => ({
      ...worker,
      stats: stats[worker.name] || { active: 0, completed: 0 },
    }));

    const filteredWorkers = organizationFilter === 'all'
      ? mappedWorkers
      : mappedWorkers.filter((worker) => (worker.organization || 'Unspecified') === organizationFilter);

    return filteredWorkers.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'completed') return b.stats.completed - a.stats.completed;
      return b.stats.active - a.stats.active;
    });

  }, [workers, reports, organizationFilter, sortBy]);

  const availableOrganizations = useMemo(() => {
    const orgSet = new Set((workers || []).map((worker) => worker.organization || 'Unspecified'));
    return ['all', ...Array.from(orgSet).sort()];
  }, [workers]);

  const assignableReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter((report) => !['Resolved', 'Rejected'].includes(report.status));
  }, [reports]);

  const selectedWorker = useMemo(
    () => workers?.find((worker) => worker.id === selectedWorkerId),
    [workers, selectedWorkerId]
  );

  const selectedReport = useMemo(
    () => reports?.find((report) => report.id === selectedReportId),
    [reports, selectedReportId]
  );

  const handleAssignTask = async () => {
    if (!firestore || !selectedWorker || !selectedReport) {
      toast({ variant: 'destructive', title: 'Missing data', description: 'Please select a worker and a report.' });
      return;
    }

    setIsAssigning(true);
    try {
      await updateDoc(doc(firestore, 'reports', selectedReport.id), {
        status: 'Assigned',
        assignedWorkerId: selectedWorker.id,
        assignedContractor: selectedWorker.name,
        assignedBy: 'SMC Admin',
        estimatedResolutionTime: estimatedDuration,
        workerAssignmentStatus: 'Pending',
        actionLog: arrayUnion({
          status: 'Assigned',
          timestamp: new Date().toISOString(),
          actor: 'Official',
          actorName: 'SMC Admin',
          notes: `Assigned to ${selectedWorker.name}. ETA: ${estimatedDuration}.`,
        }),
      });

      if (selectedWorker.phoneNumber) {
        await fetch('/api/auth/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: selectedWorker.phoneNumber,
            message: `New task assigned: ${selectedReport.description}. Location: ${selectedReport.location}. Expected duration: ${estimatedDuration}.`,
          }),
        });
      }

      toast({
        title: 'Task assigned',
        description: `Assigned to ${selectedWorker.name}. SMS sent with location and duration.`,
      });

      setSelectedReportId('');
      setEstimatedDuration('2 hours');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Assignment failed', description: 'Could not assign task to worker.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const isLoading = areWorkersLoading || areReportsLoading;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Field Worker Management</h1>
        <p className="text-base md:text-lg">Monitor and manage all field personnel.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardHat /> Worker Roster</CardTitle>
          <CardDescription>
            A list of all registered field workers, their organizations, and current workload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by organization" />
              </SelectTrigger>
              <SelectContent>
                {availableOrganizations.map((org) => (
                  <SelectItem key={org} value={org}>
                    {org === 'all' ? 'All Organizations' : org}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'active' | 'completed' | 'name') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Sort: Active Tasks</SelectItem>
                <SelectItem value="completed">Sort: Completed Tasks</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6 rounded-xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ClipboardPlus className="h-4 w-4" /> Assign Work to Worker
            </h3>
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {(workers || []).map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.organization || 'Unspecified'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent>
                  {assignableReports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.description.substring(0, 45)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={estimatedDuration}
                onChange={(event) => setEstimatedDuration(event.target.value)}
                placeholder="Duration (e.g., 2 hours)"
              />

              <Button onClick={handleAssignTask} disabled={isAssigning || !selectedWorkerId || !selectedReportId}>
                {isAssigning ? 'Assigning...' : 'Assign Task'}
              </Button>
            </div>
            {selectedReport && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> SMS will include location: {selectedReport.location}
              </p>
            )}
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-center"><Activity className="inline-block mr-1 h-4 w-4" /> <span className="hidden sm:inline">Active Tasks</span><span className="sm:hidden">Active</span></TableHead>
                <TableHead className="text-center hidden sm:table-cell"><CheckCircle className="inline-block mr-1 h-4 w-4" /> Completed</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-6 w-32" /></div></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-40" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && workerData?.map(worker => (
                <TableRow key={worker.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback>{worker.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-sm sm:text-base">{worker.name}</span>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {worker.stats.completed} completed
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{worker.organization || 'Unspecified'}</TableCell>
                  <TableCell className="text-center font-semibold text-base sm:text-lg">{worker.stats.active}</TableCell>
                  <TableCell className="text-center font-semibold text-lg hidden sm:table-cell">{worker.stats.completed}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <a href={`mailto:${worker.email}`} className="text-muted-foreground hover:text-primary flex items-center gap-2">
                        <Mail className="h-4 w-4" /> <span className="truncate max-w-[150px]">{worker.email}</span>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          {!isLoading && (!workerData || workerData.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No users with the 'worker' role found in the database.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
