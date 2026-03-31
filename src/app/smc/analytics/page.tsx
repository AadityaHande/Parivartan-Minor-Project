
'use client';

import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import type { Report } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Building, HardHat } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#DD84d8'];

export default function SmcAnalyticsPage() {
    const firestore = useFirestore();

    const reportsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'reports'));
    }, [firestore]);

    const { data: reports, isLoading } = useCollection<Report>(reportsQuery);

    const analyticsData = useMemo(() => {
        if (!reports) return null;

        // Hotspot Analysis
        const locationCounts: { [key: string]: number } = {};
        reports.forEach(report => {
            const locationKey = report.roadName || (report.location ? report.location.split(',')[0].trim() : 'Unknown');
            locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1;
        });

        const hotspotData = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Category Breakdown
        const categoryCounts: { [key: string]: number } = {};
        reports.forEach(report => {
            const category = report.category || 'Uncategorized';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        // Avg Resolution Time
        const resolvedReports = reports.filter(r => r.status === 'Resolved' && r.timestamp && r.actionLog);
        let totalResolutionTime = 0;
        let resolvedCount = 0;
        resolvedReports.forEach(r => {
            const submitTime = new Date(r.timestamp).getTime();
            const resolvedAction = r.actionLog?.find(log => log.status === 'Resolved');
            if (resolvedAction) {
                const resolveTime = new Date(resolvedAction.timestamp).getTime();
                totalResolutionTime += (resolveTime - submitTime);
                resolvedCount++;
            }
        });
        const avgResolutionHours = resolvedCount > 0 ? (totalResolutionTime / resolvedCount / (1000 * 60 * 60)).toFixed(1) : 'N/A';
        
        // Department Load
        const openReports = reports.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected');
        const departmentLoad: { [key: string]: number } = {};
        openReports.forEach(report => {
            const dept = report.department || 'Unassigned';
            departmentLoad[dept] = (departmentLoad[dept] || 0) + 1;
        });
        const topDepartment = Object.entries(departmentLoad).sort((a,b) => b[1] - a[1])[0];

        // Contractor Performance
        const contractorPerformance: { [key: string]: { totalTime: number, resolvedCount: number } } = {};
        resolvedReports.forEach(report => {
            if (report.assignedContractor) {
                if (!contractorPerformance[report.assignedContractor]) {
                    contractorPerformance[report.assignedContractor] = { totalTime: 0, resolvedCount: 0 };
                }
                const submitTime = new Date(report.timestamp).getTime();
                const resolvedAction = report.actionLog?.find(log => log.status === 'Resolved');
                if (resolvedAction) {
                    const resolveTime = new Date(resolvedAction.timestamp).getTime();
                    contractorPerformance[report.assignedContractor].totalTime += (resolveTime - submitTime);
                    contractorPerformance[report.assignedContractor].resolvedCount++;
                }
            }
        });
        const contractorPerformanceData = Object.entries(contractorPerformance)
            .map(([name, data]) => ({
                name,
                resolvedCount: data.resolvedCount,
                avgResolutionTime: (data.totalTime / data.resolvedCount / (1000 * 60 * 60)).toFixed(1),
            }))
            .sort((a, b) => b.resolvedCount - a.resolvedCount);


        return { hotspotData, categoryData, avgResolutionHours, topDepartment, contractorPerformanceData };
    }, [reports]);

    if (isLoading || !analyticsData) {
        return (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-12 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-12 w-1/2" /></CardContent></Card>
                <div className="md:col-span-2 lg:col-span-4"><Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card></div>
                <div className="md:col-span-2 lg:col-span-4"><Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card></div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-lg shadow-lg mb-8">
                <h1 className="text-4xl font-bold mb-2">Analytics & Insights</h1>
                <p className="text-lg">Data-driven overview of civic issues in Solapur.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.avgResolutionHours} hours</div>
                        <p className="text-xs text-muted-foreground">Average time from report to resolution.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Busiest Department</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.topDepartment ? analyticsData.topDepartment[0] : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">{analyticsData.topDepartment ? `${analyticsData.topDepartment[1]} open cases` : 'No open cases'}</p>
                    </CardContent>
                </Card>
            </div>


            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Report Hotspots (Heatmap)</CardTitle>
                        <CardDescription>Top 10 most reported locations, indicating problem areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={analyticsData.hotspotData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} interval={0} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend />
                                <Bar dataKey="count" name="Number of Reports" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Reports by Category</CardTitle>
                        <CardDescription>Breakdown of all submitted reports by damage type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                            <Pie
                                data={analyticsData.categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    if (percent < 0.05) return null; // Hide label for small slices
                                    return (
                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                        {`(${(percent * 100).toFixed(0)}%)`}
                                    </text>
                                    );
                                }}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {analyticsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><HardHat /> Contractor Performance</CardTitle>
                        <CardDescription>Performance metrics for assigned contractors and workers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto -mx-6 px-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contractor / Worker</TableHead>
                                    <TableHead className="text-center">Resolved</TableHead>
                                    <TableHead className="text-right hidden sm:table-cell">Avg. Resolution (Hours)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyticsData.contractorPerformanceData.map(c => (
                                    <TableRow key={c.name}>
                                        <TableCell className="font-medium">
                                            <div>{c.name}</div>
                                            <div className="text-xs text-muted-foreground sm:hidden">{c.avgResolutionTime}h avg</div>
                                        </TableCell>
                                        <TableCell className="text-center">{c.resolvedCount}</TableCell>
                                        <TableCell className="text-right hidden sm:table-cell">{c.avgResolutionTime}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                         {analyticsData.contractorPerformanceData.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No contractor performance data available yet.</p>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
