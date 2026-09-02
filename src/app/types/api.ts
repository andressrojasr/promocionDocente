/**
 * Contratos del backend de promoción docente (PromocionBackend).
 * Los nombres de propiedades corresponden a la serialización camelCase del API.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: unknown;
  timestamp: string;
}

// ---------- Autenticación ----------

export type BackendRole = 'admin' | 'cp' | 'th' | 'ca' | 'teacher';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: BackendRole;
  teacherId: string | null;
  identification: string | null;
  currentPosition: string | null;
}

export interface SessionData {
  accessToken: string;
  user: SessionUser;
}

// ---------- Usuarios (admin) ----------

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: BackendRole;
  isActive: boolean;
  identification: string | null;
  teacherId: string | null;
  currentPosition: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

// ---------- Procesos ----------

export interface RequirementConfig {
  fromPosition: string;
  toPosition: string;
  minYearsInPosition: number;
  minPublications: number;
  minPublicationsInOtherLanguage: number;
  minEvaluationScorePct: number;
  minTrainingHours: number;
  trainingWindowYears: number;
  minPedagogicalTrainingPct: number | null;
  minGivenTrainingHours: number | null;
  minProjectMonths: number | null;
  projectRoleScope: 'any' | 'direction';
  applyRoleMultipliers: boolean;
  minInternationalProjects: number | null;
  minDoctoralTheses: number | null;
  minDoctoralThesesInRank: number | null;
  requiredLanguageLevel: string | null;
  notes: string | null;
}

export interface TransitionInfo {
  fromPosition: string;
  toPosition: string;
  fromLabel: string;
  toLabel: string;
}

export type ProcessStatus = 'scheduled' | 'open' | 'closed';

export interface ProcessSummary {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: ProcessStatus;
  applicationsCount: number;
  createdByName: string;
  createdAt: string;
  myTransition: TransitionInfo | null;
  hasApplied: boolean | null;
}

export interface ProcessDetail {
  summary: ProcessSummary;
  requirements: RequirementConfig[];
}

export interface CreateProcessPayload {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  requirements: RequirementConfig[];
}

// ---------- Elegibilidad ----------

export interface RequirementEvaluation {
  code: string;
  label: string;
  required: string;
  actual: string;
  met: boolean;
  detail: string;
  requiredNumeric?: number | null;
}

export interface RequirementConfigForApplication {
  minYearsInPosition: number;
  minPublications: number;
  minPublicationsInOtherLanguage: number;
  minEvaluationScorePct: number;
  minTrainingHours: number;
  trainingWindowYears: number;
  minPedagogicalTrainingPct: number | null;
  minGivenTrainingHours: number | null;
  minProjectMonths: number | null;
  projectRoleScope: string;
  applyRoleMultipliers: boolean;
  minInternationalProjects: number | null;
  minDoctoralTheses: number | null;
  minDoctoralThesesInRank: number | null;
  requiredLanguageLevel: string | null;
}

export interface Eligibility {
  fromPosition: string;
  toPosition: string;
  fromLabel: string;
  toLabel: string;
  isEligible: boolean;
  requirements: RequirementEvaluation[];
  notes: string | null;
  requirementConfig?: RequirementConfigForApplication | null;
}

// ---------- Postulaciones ----------

export type ApplicationStatus =
  | 'submitted'
  | 'th_approved'
  | 'th_rejected'
  | 'cp_rejected'
  | 'appealed'
  | 'approved'
  | 'rejected';

export type ApplicationItemType =
  | 'publication'
  | 'received_training'
  | 'given_training'
  | 'research_project'
  | 'doctoral_thesis'
  | 'language'
  | 'experience';

export interface ApplicationItemPayload {
  itemType: ApplicationItemType;
  externalItemId: string;
  documentDateOriginal?: string | null;
}

export interface ApplicationSummary {
  id: string;
  processId: string;
  processName: string;
  teacherUserId: string;
  teacherName: string;
  teacherId: string | null;
  fromPosition: string;
  toPosition: string;
  fromLabel: string;
  toLabel: string;
  status: ApplicationStatus;
  submittedAt: string;
  appealDeadline: string | null;
  scorePct?: number | null;
}

export interface ApplicationItemDto {
  itemType: ApplicationItemType;
  externalItemId: string;
  title: string;
  documentUrl: string | null;
  documentDateOriginal: string | null;
}

export interface ReviewDto {
  stage: 'th' | 'cp' | 'ca';
  reviewerName: string;
  reviewerRole: BackendRole;
  decision: 'approved' | 'rejected';
  feedback: string | null;
  createdAt: string;
}

export interface AppealDto {
  justification: string;
  submittedAt: string;
}

export interface ApplicationDetail {
  summary: ApplicationSummary;
  items: ApplicationItemDto[];
  reviews: ReviewDto[];
  appeal: AppealDto | null;
  eligibility: Eligibility | null;
  canAppeal: boolean;
}

// ---------- Hoja de vida (RRHH) ----------

export interface HrDependency {
  id: string;
  name: string;
}

export interface HrExperience {
  id: string;
  type: string;
  institution: string;
  position: string;
  category: string;
  startDate: string;
  endDate: string;
  years: number;
  months: number;
  knowledgeArea: string;
  country: string;
  supportingDocumentUrl: string;
}

export interface HrPublication {
  id: string;
  type: string;
  name: string;
  journal: string;
  knowledgeArea: string;
  publicationDate: string;
  doi: string;
  link: string;
  language: string;
  indexingDatabase: string;
  status: string;
  country: string;
  supportingDocumentUrl: string;
}

export interface HrTraining {
  id: string;
  type: string;
  trainingCategory: string;
  name: string;
  institution: string;
  startDate: string;
  endDate: string;
  hours: number;
  knowledgeArea: string;
  modality: string;
  country: string;
  supportingDocumentUrl: string;
}

export interface HrResearchProject {
  id: string;
  type: string;
  name: string;
  projectCode: string;
  institution: string;
  startDate: string;
  endDate: string;
  months: number;
  role: string;
  knowledgeArea: string;
  status: string;
  country: string;
  supportingDocumentUrl: string;
}

export interface HrDoctoralThesis {
  id: string;
  type: string;
  title: string;
  institution: string;
  approvalDate: string;
  role: string;
  knowledgeArea: string;
  country: string;
  supportingDocumentUrl: string;
}

export interface HrLanguageCertification {
  id: string;
  type: string;
  language: string;
  level: string;
  referenceFramework: string;
  certifyingInstitution: string;
  country: string;
  issueDate: string;
  expirationDate: string;
  supportingDocumentUrl: string;
}

export interface HrPerformanceScore {
  type: string;
  period: string;
  percentage: number;
  supportingDocumentUrl: string;
}

export interface HrTeacherDetails {
  teacherId: string;
  identificationType: string;
  identification: string;
  fullName: string;
  orcid: string;
  dependency: HrDependency;
  employmentRelationship: string;
  currentPosition: string;
  currentPositionStartDate: string;
  evaluationDate: string;
  experience: HrExperience[];
  publications: HrPublication[];
  receivedTrainings: HrTraining[];
  givenTrainings: HrTraining[];
  researchProjects: HrResearchProject[];
  doctoralTheses: HrDoctoralThesis[];
  languages: HrLanguageCertification[];
  score: HrPerformanceScore | null;
}

export interface TeacherProfileData {
  capturedAt: string;
  currentPosition: string;
  currentPositionLabel: string;
  nextPosition: string | null;
  nextPositionLabel: string | null;
  profile: HrTeacherDetails;
}

// ---------- Notificaciones ----------

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationDto[];
  unreadCount: number;
}

// ---------- Dashboard ----------

export interface DashboardStats {
  role: BackendRole;
  counters: Record<string, number>;
}
