'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin, User, Calendar, Bot, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentData, DocumentReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Report } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500',
    'Under Verification': 'bg-yellow-500',
    Assigned: 'bg-orange-500',
    'In Progress': 'bg-amber-500',
    Resolved: 'bg-green-500',
    Rejected: 'bg-red-500',
};

const progressValues: { [key: string]: number } = {
    Submitted: 10,
    'Under Verification': 30,
    Assigned: 50,
    'In Progress': 70,
    Resolved: 100,
    Rejected: 100,
}

const allStages = ['Submitted', 'Under Verification', 'Assigned', 'In Progress', 'Resolved'];

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();

  const reportRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'reports', params.id) as DocumentReference<DocumentData>;
  }, [firestore, params.id]);

  const { data: report, isLoading } = useDoc<Report>(reportRef);
  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                </div>
            </div>
        </div>
    )
  }

  if (!report) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Complaint Not Found</CardTitle>
                    <CardDescription>The requested report could not be found.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  const progress = progressValues[report.status] || 0;
  const mapsUrl = report.latitude && report.longitude 
    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` 
    : `https://www.google.com/maps?q=${encodeURIComponent(report.location)}`;
    
  const sortedActionLog = report.actionLog?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || [];


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-lg dark:border-slate-800 dark:bg-slate-900 md:p-8">
                <h1 className="mb-2 text-3xl font-bold md:text-4xl">Complaint Details</h1>
                <p className="font-mono text-base text-slate-200 md:text-lg">{params.id}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">{report.description}</CardTitle>
                        <Badge className={`${statusColors[report.status]}`}>{report.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold mb-2">Evidence Photo</h3>
                        <Image src={report.imageUrl} alt={report.id} width={800} height={600} className="rounded-lg w-full object-cover" />
                    </div>
                    {report.afterImageUrl && (
                        <div>
                             <h3 className="font-semibold mb-2">Resolution Photo</h3>
                             <Image src={report.afterImageUrl} alt="Resolution photo" width={800} height={600} className="rounded-lg" data-ai-hint="road fixed" />
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Action Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {sortedActionLog.map((log, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex-shrink-0 pt-1">
                                    {log.actor === 'Citizen' && <User className="h-5 w-5 text-muted-foreground" />}
                                    {log.actor === 'Official' && <Shield className="h-5 w-5 text-muted-foreground" />}
                                    {log.actor === 'System' && <Bot className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">
                                        {log.actorName} 
                                        {log.notes?.toLowerCase().includes('status') 
                                            ? <><span className="text-muted-foreground font-normal"> changed status to </span>{log.status}</>
                                            : <span className="text-muted-foreground font-normal"> performed an action</span>
                                        }
                                    </p>
                                    {log.notes && <p className="text-sm text-muted-foreground italic">"{log.notes}"</p>}
                                    <p className="text-xs text-muted-foreground mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                         {sortedActionLog.length === 0 && (
                            <p className="text-sm text-muted-foreground">No actions logged yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot /> AI Damage Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    {report.aiAnalysis ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Damage Detected:</span>
                                <span className={`font-semibold ${report.aiAnalysis.damageDetected ? 'text-destructive' : 'text-green-600'}`}>{report.aiAnalysis.damageDetected ? 'Yes' : 'No'}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Detected Category:</span>
                                <span className="font-semibold">{report.aiAnalysis.damageCategory}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimated Severity:</span>
                                <span className="font-semibold">{report.aiAnalysis.severity}</span>
                            </div>
                            <Separator />
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Verification Suggestion:</span>
                                <span className="font-semibold">{report.aiAnalysis.verificationSuggestion}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">AI analysis is pending or was not performed on this report.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader><CardTitle>Report Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center gap-3">
                        <MapPin className="text-muted-foreground" />
                        <div>
                            <p className="font-semibold">{report.location}</p>
                             <Button variant="link" asChild className="p-0 h-auto text-primary">
                                <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Maps</Link>
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                        <User className="text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Reported By</p>
                            <p className="text-sm text-muted-foreground">{report.userName}</p>
                        </div>
                    </div>
                     <Separator />
                    <div className="flex items-center gap-3">
                        <Calendar className="text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Submitted On</p>
                            <p className="text-sm text-muted-foreground">{new Date(report.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>SLA & Progress</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-between font-semibold">
                        <span>Progress</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground text-center">{progress}% Complete</p>
                </CardContent>
            </Card>

                         <Card>
                                <CardHeader><CardTitle>Prize Claim</CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                        <p className="text-muted-foreground">
                                            When your report is resolved and qualifies as genuine, you will receive a notification and SMS with the prize claim link.
                                        </p>
                                        <p className="text-muted-foreground">
                                            Rewards can include coupons, cashback, bus or railway passes, or cash via Razorpay after more than 2 verified reports.
                                        </p>
                                        <Button asChild variant="outline">
                                            <Link href="/citizen/dashboard">Check reward progress</Link>
                                        </Button>
                                </CardContent>
                        </Card>
        </div>
      </div>
    </div>
  );
}
