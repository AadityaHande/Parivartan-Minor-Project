'use client';

import { useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Report } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, Activity, CheckCircle, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ContractorStats {
  total: number;
  inProgress: number;
  resolved: number;
}

export default function SmcContractsPage() {
  const firestore = useFirestore();

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reports'));
  }, [firestore]);

  const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

  const contractorData = useMemo(() => {
    if (!reports) return null;

    const stats: Record<string, ContractorStats> = {};

    reports.forEach(report => {
      if (report.assignedContractor) {
        const contractor = report.assignedContractor;
        if (!stats[contractor]) {
          stats[contractor] = { total: 0, inProgress: 0, resolved: 0 };
        }
        stats[contractor].total++;
        if (report.status === 'In Progress' || report.status === 'Assigned') {
          stats[contractor].inProgress++;
        } else if (report.status === 'Resolved') {
          stats[contractor].resolved++;
        }
      }
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.total > 0 ? (data.resolved / data.total) * 100 : 0,
    })).sort((a,b) => b.total - a.total);
  }, [reports]);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 md:p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Contractor Performance</h1>
        <p className="text-base md:text-lg">An overview of work distribution and completion rates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCheck /> Contractor & Worker Overview</CardTitle>
          <CardDescription>
            Performance metrics for all assigned contractors and field workers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor / Worker</TableHead>
                <TableHead className="text-center"><FileText className="inline-block mr-1 h-4 w-4" /> <span className="hidden sm:inline">Total</span></TableHead>
                <TableHead className="text-center hidden sm:table-cell"><Activity className="inline-block mr-1 h-4 w-4" /> In Progress</TableHead>
                <TableHead className="text-center hidden md:table-cell"><CheckCircle className="inline-block mr-1 h-4 w-4" /> Resolved</TableHead>
                <TableHead className="hidden sm:table-cell">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && contractorData?.map(c => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">
                    <div>{c.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      {c.resolved}/{c.total} completed ({c.completionRate.toFixed(0)}%)
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{c.total}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{c.inProgress}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{c.resolved}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={c.completionRate} className="h-2 w-24" />
                      <span className="text-xs text-muted-foreground">{c.completionRate.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          {!isLoading && (!contractorData || contractorData.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No contractors have been assigned to tasks yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
