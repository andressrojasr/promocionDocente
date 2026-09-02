export interface CpDashboardStats {
  totalApplications: number;
  pendingReview: number;
  approvedByCP: number;
  rejectedByCP: number;
  approvalRatePercentage: number;
  averageDaysToDecision: number;
}

export interface CpApplicationReport {
  applicationId: string;
  processName: string;
  teacherName: string;
  teacherId: string;
  fromPosition: string;
  toPosition: string;
  status: string;
  submittedAt: string;
  decidedAt?: string;
  daysToDecision?: number;
  scorePct?: number;
  currentReviewerName?: string;
}

export interface CpDashboardData {
  stats: CpDashboardStats;
  applications: CpApplicationReport[];
  availableProcesses: string[];
  availableStatuses: string[];
}
