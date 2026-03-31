
export const departments = ['Engineering', 'Water Supply', 'Drainage', 'Electricity', 'Traffic'];

// Department configuration with descriptions
export const departmentConfig: Record<string, { id: string; description: string; color: string }> = {
  'Engineering': {
    id: 'dept_engineering',
    description: 'Handles road construction, repairs, and infrastructure',
    color: 'bg-blue-500',
  },
  'Water Supply': {
    id: 'dept_water',
    description: 'Water pipeline leaks and supply issues affecting roads',
    color: 'bg-cyan-500',
  },
  'Drainage': {
    id: 'dept_drainage',
    description: 'Storm water drainage and sewage system maintenance',
    color: 'bg-green-500',
  },
  'Electricity': {
    id: 'dept_electricity',
    description: 'Street lights, electrical poles, and power lines on roads',
    color: 'bg-amber-500',
  },
  'Traffic': {
    id: 'dept_traffic',
    description: 'Traffic signals, road markings, and safety',
    color: 'bg-red-500',
  },
};

// Status workflow configuration
export const statusWorkflow: Record<string, { next: string[]; canAssignWorker: boolean }> = {
  'Submitted': { next: ['Under Verification', 'Rejected'], canAssignWorker: false },
  'Under Verification': { next: ['Assigned', 'Rejected'], canAssignWorker: false },
  'Assigned': { next: ['In Progress', 'Rejected'], canAssignWorker: true },
  'In Progress': { next: ['Resolved', 'Rejected'], canAssignWorker: false },
  'Resolved': { next: [], canAssignWorker: false },
  'Rejected': { next: [], canAssignWorker: false },
};
