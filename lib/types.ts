// TypeScript types for SHC Attend

export interface StudentProfile {
  registrationNumber: string;
  name: string;
  course: string;
  className: string;
  batch: string;
  semester: string;
  academicYear: string;
  email?: string;
  phone?: string;
  dob?: string;
  fathersName?: string;
  mothersName?: string;
  profileImageUrl?: string;
  programTypeId?: number;
}

export interface AttendanceRecord {
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  month?: string;
  dayWise?: AttendanceDay[];
}

export interface AttendanceDay {
  date: string;
  status: 'P' | 'A' | 'L' | 'OD'; // Present, Absent, Leave, On Duty
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface TimetableEntry {
  day: string;
  period: number;
  subject: string;
  teacher?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
}

export interface BunkCalculation {
  subject: string;
  currentPercentage: number;
  totalClasses: number;
  attendedClasses: number;
  canBunk: number; // How many classes can be bunked while staying above 75%
  needToAttend: number; // How many classes needed to reach 75%
  targetPercentage: number; // Usually 75%
}

export interface SessionData {
  cookies: string;
  lastValidated: number;
  username?: string;
  password?: string;
}

export interface SyncMeta {
  timestamp: number;
  monthsFetched: string[];
  profileLastFetched?: number;
}

export interface ProxyRequest {
  targetPath: string;
  method: 'GET' | 'POST';
  formData?: Record<string, string>;
  cookies?: string;
}

export interface ProxyResponse {
  status: number;
  body: string;
  setCookies?: string[];
}

export interface LoginResult {
  success: boolean;
  cookies?: string;
  studentInfo?: StudentProfile;
  error?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'auth_required';
