// Type definitions for the Parivartan platform

// Department type for hierarchical workflow
export type Department = {
  id: string;
  name: string;
  description?: string;
  headOfficerId?: string; // The department head who manages workers
};

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  organization?: string;
  role: 'citizen' | 'official' | 'worker' | 'department_head';
  points: number;
  departmentId?: string; // For workers and department heads
  department?: string; // Department name for quick access
  designation?: string;
  skillType?: 'Garbage' | 'Road Repair' | 'Electrical' | string;
  assignedContractor?: string;
  wardArea?: string;
  employeeId?: string;
  createdAt?: string;
};
export type ReportStatus = 'Submitted' | 'Under Verification' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';
export type WorkerMediaType = 'image' | 'video';
export type WorkerAssignmentStatus = 'Pending' | 'Accepted' | 'Rejected';

export type ActionLogEntry = {
  status: ReportStatus;
  timestamp: string;
  actor: 'Citizen' | 'Official' | 'System' | 'Worker';
  actorName: string;
  notes?: string;
};

export type Report = {
  id: string;
  userId: string;
  userName: string;
  location: string;
  roadName?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  imageUrl: string;
  imageHint: string;
  timestamp: string;
  status: ReportStatus;
  aiAnalysis?: AIAnalysis | null;
  department: string;
  departmentId?: string; // Reference to department for filtering
  category: string;
  remarks?: string;
  causeTag?: string;
  assignedContractor?: string; // Worker name (legacy support)
  assignedWorkerId?: string; // Worker user ID for proper linking
  assignedBy?: string; // Who assigned the task (department head or admin)
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedResolutionTime?: string;
  afterImageUrl?: string;
  beforeWorkMediaUrl?: string;
  beforeWorkMediaType?: WorkerMediaType;
  beforeWorkUploadedAt?: string;
  beforeWorkNotes?: string;
  afterWorkMediaUrl?: string;
  afterWorkMediaType?: WorkerMediaType;
  afterWorkUploadedAt?: string;
  afterWorkNotes?: string;
  workerAssignmentStatus?: WorkerAssignmentStatus;
  acceptedAt?: string;
  completedAt?: string;
  selfAssigned?: boolean;
  actionLog?: ActionLogEntry[];
  citizenRating?: number;
  workflowStage?: 'pending_admin' | 'pending_department' | 'assigned_worker' | 'in_progress' | 'completed';
};
export type AIAnalysis = {
  damageDetected: boolean;
  damageCategory: string;
  severity: 'Low' | 'Medium' | 'High';
  verificationSuggestion: 'Likely genuine' | 'Needs manual verification';
  description: string;
  suggestedDepartment: 'Engineering' | 'Water Supply' | 'Drainage' | 'Electricity' | 'Traffic' | 'Unassigned';
  suggestedPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  duplicateSuggestion: string;
  suggestedLocationDetails?: string;
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  userId?: string;
  imageUrl?: string;
  location?: string;
  locationLink?: string;
  createdAt: string;
  createdBy: string;
  type: 'road_construction' | 'traffic_update' | 'maintenance' | 'general';
  isRead?: boolean;
};
