'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, DocumentData, Query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Report } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, FileX, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500 hover:bg-blue-500',
    'Under Verification': 'bg-yellow-500 hover:bg-yellow-500',
    Assigned: 'bg-orange-500 hover:bg-orange-500',
    'In Progress': 'bg-amber-600 hover:bg-amber-600',
    Resolved: 'bg-green-600 hover:bg-green-600',
    Rejected: 'bg-red-600 hover:bg-red-600',
};

const progressValues: { [key: string]: number } = {
    Submitted: 10,
    'Under Verification': 30,
    Assigned: 50,
    'In Progress': 70,
    Resolved: 100,
    Rejected: 100,
}

export default function MyComplaintsPage() {
  const [filter, setFilter] = useState('All');
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    
    const baseQuery = query(collection(firestore, 'reports'), where('userId', '==', user.uid));

    if (filter !== 'All') {
        return query(baseQuery, where('status', '==', filter), orderBy('timestamp', 'desc'));
    }
    
    return query(baseQuery, orderBy('timestamp', 'desc'));
  }, [firestore, user?.uid, filter]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<Report>(reportsQuery);
  const isLoading = isUserLoading || areReportsLoading;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="bg-gradient-to-r from-primary to-green-400 text-primary-foreground p-6 md:p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Track Your Reports</h1>
        <p className="text-base md:text-lg opacity-90">Real-Time Monitoring of Your Civic Contributions</p>
      </div>

      <Card>
        <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>A complete history of all your submitted reports.</CardDescription>
            </div>
            <Select onValueChange={setFilter} defaultValue={filter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Verification">Under Verification</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
        </CardHeader>
        <CardContent className="grid gap-6">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <Skeleton className="w-full md:w-1/3 h-40 rounded-md" />
                        <div className="w-full md:w-2/3 space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </Card>
            ))}
            {!isLoading && reports && reports.map((report) => {
                const progress = progressValues[report.status] || 0;
                return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <Link href={`/citizen/complaint/${report.id}`} className="block">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 relative">
                            <Image
                                src={report.imageUrl}
                                alt={`Evidence for ${report.id}`}
                                width={400}
                                height={300}
                                className="object-cover w-full h-48 md:h-full"
                                data-ai-hint={report.imageHint}
                            />
                             <Badge className={`absolute top-2 right-2 text-primary-foreground ${statusColors[report.status]}`}>
                                {report.status}
                            </Badge>
                        </div>
                        <div className="p-4 md:p-6 md:w-2/3 flex flex-col">
                            <h3 className="text-lg font-semibold mb-1 leading-tight">{report.description}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{report.location}</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Reported on: {new Date(report.timestamp).toLocaleDateString()}
                            </p>
                            
                            {report.aiAnalysis && (
                              <div className="mt-auto mb-4 pt-4 border-t">
                                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Bot /> AI Analysis</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  <p>Category: <span className="font-medium text-foreground">{report.aiAnalysis.damageCategory}</span></p>
                                  <p>Severity: <span className="font-medium text-foreground">{report.aiAnalysis.severity}</span></p>
                                </div>
                              </div>
                            )}

                            <div className="mt-auto w-full">
                                <Progress value={progress} className="h-2" />
                                <p className="text-center text-xs mt-1 text-muted-foreground">{progress}% Complete</p>
                            </div>
                        </div>
                    </div>
                </Link>
              </Card>
            )})}
             {!isLoading && (!reports || reports.length === 0) && (
                <div className="border-2 border-dashed rounded-lg">
                    <div className="flex flex-col items-center justify-center text-center p-12">
                        <FileX className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Reports Found</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            {filter === 'All'
                                ? "You haven't submitted any reports yet. Be the first to make a difference!"
                                : `You don't have any reports with the status "${filter}".`
                            }
                        </p>
                        <Button asChild>
                            <Link href="/citizen/report">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Report a New Problem
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
