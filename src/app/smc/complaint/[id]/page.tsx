'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin, User, Calendar, Bot, Loader2, Shield, AlertTriangle, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, DocumentData, DocumentReference, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Report, ReportStatus, AIAnalysis } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useParams } from 'next/navigation';
import { summarizeReportFlow } from '@/ai/flows/summarize-report-flow';
import ReactMarkdown from 'react-markdown';


const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-500',
    'Under Verification': 'bg-yellow-500',
    Assigned: 'bg-orange-500',
    'In Progress': 'bg-amber-500',
    Resolved: 'bg-green-500',
    Rejected: 'bg-red-500',
};

const officerActionableStatuses: ReportStatus[] = ['Under Verification', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const severityLevels: (AIAnalysis['severity'])[] = ['Low', 'Medium', 'High'];
const priorityLevels: (Report['priority'])[] = ['Low', 'Medium', 'High', 'Critical'];
import { departments } from '@/lib/constants';

const causeTags = ['Rain / Flood', 'Construction', 'Utility Work', 'Heavy Load', 'Poor Quality', 'Other'];
const mockContractors = [
  { name: 'SK Construction', department: 'Engineering' },
  { name: 'Patil Infra Pvt. Ltd.', department: 'Engineering' },
  { name: 'Water Works Team', department: 'Water Supply' },
  { name: 'Drainage Maintenance Crew', department: 'Drainage' },
  { name: 'Electrical Services Team', department: 'Electricity' },
  { name: 'Traffic Management Unit', department: 'Traffic' },
  { name: 'Road Repair Squad', department: 'Engineering' },
];


const officerActionSchema = z.object({
  status: z.string().min(1, 'Please select a status.'),
  severity: z.string().optional(),
  remarks: z.string().optional(),
  department: z.string().optional(),
  causeTag: z.string().optional(),
  assignedContractor: z.string().optional(),
  priority: z.string().optional(),
  estimatedResolutionTime: z.string().optional(),
  afterImageUrl: z.string().url().optional().or(z.literal('')),
});
type OfficerActionForm = z.infer<typeof officerActionSchema>;


export default function SmcComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const reportRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'reports', params.id) as DocumentReference<DocumentData>;
  }, [firestore, params.id]);

  const { data: report, isLoading } = useDoc<Report>(reportRef);

  const form = useForm<OfficerActionForm>({
    resolver: zodResolver(officerActionSchema),
    defaultValues: {
      status: '',
      severity: '',
      remarks: '',
      department: '',
      causeTag: '',
      assignedContractor: '',
      priority: '',
      estimatedResolutionTime: '',
      afterImageUrl: '',
    },
  });

  // Effect to sync form with loaded report data
  useEffect(() => {
    if (report) {
      form.reset({
        status: report.status || '',
        severity: report.aiAnalysis?.severity || '',
        remarks: report.remarks || '',
        department: report.department && report.department !== 'Unassigned' 
                    ? report.department 
                    : report.aiAnalysis?.suggestedDepartment || 'Unassigned',
        causeTag: report.causeTag || '',
        assignedContractor: report.assignedContractor || '',
        priority: report.priority 
                  ? report.priority 
                  : report.aiAnalysis?.suggestedPriority || 'Medium',
        estimatedResolutionTime: report.estimatedResolutionTime || '',
        afterImageUrl: report.afterImageUrl || '',
      });
    }
  }, [report, form]);


  const watchedStatus = form.watch('status');

  const mapsUrl = report?.latitude && report?.longitude 
    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` 
    : `https://www.google.com/maps?q=${encodeURIComponent(report?.location || '')}`;

    const handleGetSummary = useCallback(async () => {
    if (!report) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
        const result = await summarizeReportFlow({
            id: report.id,
            description: report.description,
            status: report.status,
            category: report.category,
            timestamp: report.timestamp,
            actionLog: report.actionLog || [],
            citizenRating: report.citizenRating,
        });
        setSummary(result.summary);
    } catch (error) {
        console.error("Failed to generate summary", error);
        toast({
            variant: "destructive",
            title: "AI Summary Failed",
            description: "Could not generate the report summary. Please try again."
        });
    } finally {
        setIsSummarizing(false);
    }
  }, [report, toast]);


  async function onSubmit(values: OfficerActionForm) {
    if (!reportRef || !report || !firestore) return;

    setIsSubmitting(true);
    try {
        if (values.status === 'Resolved' && report.status !== 'Resolved') {
            const userToRewardRef = doc(firestore, 'users', report.userId);
            // This is fire-and-forget, but we can log errors
            updateDoc(userToRewardRef, {
                points: increment(10)
            }).catch(err => console.error("Failed to award points:", err));
        }

        const hasStatusChanged = report.status !== values.status;
        const updatePayload: any = {
            status: values.status,
            remarks: values.remarks,
            department: values.department,
            causeTag: values.causeTag,
            assignedContractor: values.assignedContractor,
            priority: values.priority,
            estimatedResolutionTime: values.estimatedResolutionTime,
            afterImageUrl: values.afterImageUrl || null,
        };

        if (values.severity && report?.aiAnalysis) {
            updatePayload['aiAnalysis.severity'] = values.severity;
        }

        if (hasStatusChanged) {
            const newLogEntry = {
                status: values.status as ReportStatus,
                timestamp: new Date().toISOString(),
                actor: 'Official' as const,
                actorName: user?.displayName || 'SMC Officer',
                notes: values.remarks || `Status updated to ${values.status}.`,
            };
            updatePayload.actionLog = arrayUnion(newLogEntry);
        }

        await updateDoc(reportRef, updatePayload);
        
        toast({
            title: 'Report Updated',
            description: `The report has been successfully updated.`,
        });

    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update the report. You may not have the required permissions.',
        });
        console.error("Update failed: ", error);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (isLoading) {
    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-[500px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
    )
  }

  if (!report) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Complaint Not Found</CardTitle>
                <CardDescription>The requested report could not be found.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  const sortedActionLog = report.actionLog?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || [];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">{report.category}: {report.description}</CardTitle>
                        <Badge className={`${statusColors[report.status]}`}>{report.status}</Badge>
                    </div>
                     <CardDescription>Report ID: {report.id}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image src={report.imageUrl} alt={report.id} width={800} height={600} className="rounded-lg w-full object-cover" />
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Damage Detected:</span>
                                        <span className={`font-semibold ${report.aiAnalysis.damageDetected ? 'text-destructive' : 'text-green-600'}`}>{report.aiAnalysis.damageDetected ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Detected Category:</span>
                                        <span className="font-semibold">{report.aiAnalysis.damageCategory}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Estimated Severity:</span>
                                        <span className="font-semibold">{report.aiAnalysis.severity}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Verification Suggestion:</span>
                                        <span className="font-semibold">{report.aiAnalysis.verificationSuggestion}</span>
                                    </div>
                                </div>
                            </div>
                             <Separator />
                             <h4 className="font-semibold text-sm pt-2">AI Triage Suggestions</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Suggested Department:</span>
                                    <Badge variant="outline">{report.aiAnalysis.suggestedDepartment}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Suggested Priority:</span>
                                     <Badge variant="outline">{report.aiAnalysis.suggestedPriority}</Badge>
                                </div>
                             </div>
                             {report.aiAnalysis.duplicateSuggestion && (
                                <>
                                <Separator/>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Duplicate Check</AlertTitle>
                                    <AlertDescription>
                                        {report.aiAnalysis.duplicateSuggestion}
                                    </AlertDescription>
                                </Alert>
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">AI analysis is pending or was not performed on this report.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>AI Assistant Tools</CardTitle>
                    <CardDescription>Use AI to quickly understand and process this report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleGetSummary} disabled={isSummarizing || isSubmitting} className="w-full">
                        {isSummarizing ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
                        Generate AI Summary
                    </Button>
                    {summary && (
                        <Alert>
                            <Bot className="h-4 w-4" />
                            <AlertTitle>Report Summary</AlertTitle>
                            <AlertDescription>
                                <ReactMarkdown
                                    className="text-sm"
                                    components={{
                                        p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-2 last:mb-0" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                    }}
                                >
                                    {summary}
                                </ReactMarkdown>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Officer Control Panel</CardTitle>
                    <CardDescription>First, assign a department. Then, assign a worker to the job.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Update Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Set a new status..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {officerActionableStatuses.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Assign Department {(report?.aiAnalysis?.suggestedDepartment && (!report.department || report.department === 'Unassigned')) && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        // Clear contractor when department changes
                                        form.setValue('assignedContractor', '');
                                    }} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a department..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                                        {departments.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Set Priority {(report?.aiAnalysis?.suggestedPriority && !report.priority) && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Set priority level..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {priorityLevels.map((level) => (<SelectItem key={level} value={level}>{level}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="assignedContractor"
                                render={({ field }) => {
                                const selectedDept = form.watch('department');
                                const filteredContractors = selectedDept && selectedDept !== 'Unassigned'
                                    ? mockContractors.filter(c => c.department === selectedDept)
                                    : mockContractors;
                                return (
                                <FormItem>
                                    <FormLabel>Assign Contractor / Worker</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                        disabled={watchedStatus !== 'Assigned' && watchedStatus !== 'In Progress'}
                                    >
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a contractor..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredContractors.length === 0 ? (
                                            <SelectItem value="" disabled>No workers in this department</SelectItem>
                                        ) : (
                                            filteredContractors.map((c) => (
                                                <SelectItem key={c.name} value={c.name}>
                                                    {c.name}
                                                    <span className="text-xs text-muted-foreground ml-2">({c.department})</span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {selectedDept && selectedDept !== 'Unassigned' 
                                            ? `Showing workers from ${selectedDept} department`
                                            : 'Select a department first to filter workers'}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}}
                            />

                             <FormField
                                control={form.control}
                                name="causeTag"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tag Cause</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Tag the likely cause..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {causeTags.map((tag) => (<SelectItem key={tag} value={tag}>{tag}</SelectItem>))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="estimatedResolutionTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Est. Resolution Time</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., 48 Hours, 7 Days" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                            <FormField
                                control={form.control}
                                name="afterImageUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Resolution Photo URL</FormLabel>
                                    <FormControl>
                                      <Input placeholder="https://.../after-photo.jpg" {...field} />
                                    </FormControl>
                                     <FormDescription>
                                        Add a URL for the photo showing the completed work.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="remarks"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Add Remarks</FormLabel>
                                    <FormControl>
                                    <Textarea placeholder="Add internal notes or reasons for status change..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting || isSummarizing}>
                                {isSubmitting ? <><Loader2 className="animate-spin mr-2" />Updating...</> : 'Update Report'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-start gap-3">
                        <MapPin className="text-muted-foreground mt-1" />
                        <div>
                            <p className="font-semibold">{report.location}</p>
                             <Button variant="link" asChild className="p-0 h-auto text-primary">
                                <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</Link>
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
                    {report.remarks && (
                        <>
                        <Separator />
                         <div className="space-y-2">
                             <p className="font-semibold">Latest Remark</p>
                             <p className="text-sm text-muted-foreground italic">"{report.remarks}"</p>
                         </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
