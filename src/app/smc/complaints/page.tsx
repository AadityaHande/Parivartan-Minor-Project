'use client';
import {
  File,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where, DocumentData, Query, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import type { Report, ReportStatus } from '@/lib/types';
import { useFirestore } from '@/firebase/provider';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500',
    'Under Verification': 'bg-yellow-500',
    Assigned: 'bg-orange-500',
    'In Progress': 'bg-amber-500',
    Resolved: 'bg-green-500',
    Rejected: 'bg-red-500',
};


export default function SmcComplaintsPage() {
  const [filter, setFilter] = useState('all');
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q: Query<DocumentData> = collection(firestore, 'reports');

    if (filter !== 'all') {
      q = query(q, where('status', '==', filter));
    }
    
    q = query(q, orderBy('timestamp', 'desc'));
    
    return q;
  }, [firestore, filter]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

  const handleTabChange = (value: string) => {
    setFilter(value);
  }
  
  const handleUpdateStatus = async (report: Report, newStatus: ReportStatus, details?: { department?: string }) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    const isReassignment = newStatus === 'Assigned' && details?.department;
    if (report.status === newStatus && !isReassignment) return;

    const reportRef = doc(firestore, 'reports', report.id);
    try {
      const updatePayload: any = { status: newStatus };
      let notes = `Status updated to ${newStatus}.`;

      if (newStatus === 'Assigned' && details?.department) {
        updatePayload.department = details.department;
        notes = `Quick-assigned to ${details.department} department based on AI suggestion.`;
      }
      
      const newLogEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        actor: 'Official' as const,
        actorName: user.displayName || 'SMC Officer',
        notes,
      };
      updatePayload.actionLog = arrayUnion(newLogEntry);

      await updateDoc(reportRef, updatePayload);

      if (newStatus === 'Resolved' && report.status !== 'Resolved') {
        const userToRewardRef = doc(firestore, 'users', report.userId);
        await updateDoc(userToRewardRef, { points: increment(10) });
      }

      toast({
        title: 'Report Updated',
        description: `The report has been updated to ${newStatus}.`,
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the report status.',
      });
    }
  };


  return (
    <>
      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="Submitted">Submitted</TabsTrigger>
              <TabsTrigger value="Under Verification" className="whitespace-nowrap">Under Verification</TabsTrigger>
              <TabsTrigger value="Assigned">Assigned</TabsTrigger>
              <TabsTrigger value="In Progress" className="whitespace-nowrap">In Progress</TabsTrigger>
              <TabsTrigger value="Resolved">Resolved</TabsTrigger>
              <TabsTrigger value="Rejected">Rejected</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
          </div>
        </div>
        <TabsContent value={filter}>
          <Card>
            <CardHeader>
              <CardTitle>Complaints</CardTitle>
              <CardDescription>
                Manage and track all citizen-submitted reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Citizen
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Date
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading && Array.from({length: 10}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="w-16 h-16 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                   ))}
                  {reports?.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="hidden sm:table-cell">
                      <img
                        alt="Report image"
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={report.imageUrl}
                        width="64"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {report.description}
                      <p className="text-xs text-muted-foreground">{report.location.substring(0, 40)}...</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[report.status] ?? 'bg-gray-500'}>{report.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {report.userName}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {new Date(report.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild><Link href={`/smc/complaint/${report.id}`}>View Details</Link></DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => {
                              if (report.aiAnalysis?.suggestedDepartment && report.aiAnalysis.suggestedDepartment !== 'Unassigned') {
                                handleUpdateStatus(report, 'Assigned', { department: report.aiAnalysis.suggestedDepartment });
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "No AI Suggestion",
                                  description: "AI analysis did not provide a specific department suggestion for this report."
                                });
                              }
                            }}
                            disabled={!report.aiAnalysis?.suggestedDepartment || report.aiAnalysis.suggestedDepartment === 'Unassigned' || ['Assigned', 'In Progress', 'Resolved', 'Rejected'].includes(report.status)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Quick Assign (AI)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()} 
                            onClick={() => handleUpdateStatus(report, 'Resolved')}
                            disabled={report.status === 'Resolved'}
                          >
                            Mark as Resolved
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Showing <strong>{reports?.length ?? 0}</strong> of <strong>{reports?.length ?? 0}</strong>{' '}
                reports
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
