// TutorBoxCRM Type Definitions
// Matches data structures from gestion-ventas web CRM

import {UserRole} from '../config/permissions.config';

// ============================================
// USER TYPES
// ============================================

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  updatedAt?: string;
  teacherId?: string; // Reference to /teachers/{id} if role is teacher
  mobileAccess?: boolean;
  enabledModules?: string[];
}

export interface User {
  uid: string;
  profile: UserProfile;
}

// ============================================
// STUDENT TYPES
// ============================================

export interface Student {
  id: string;
  nombre: string;
  numDoc: string;
  tipoDoc: string;
  edad?: number;
  telefono: string; // Hidden from teachers
  correo?: string;
  acudiente?: string;
  docAcudiente?: string;
  tipoDocAcudiente?: string;
  fechaInicio: string;
  grupo?: string;
  tipoPago?: 'MENSUAL' | 'SEMESTRAL' | 'POR_HORAS';
  valor?: number;
  valorHora?: number;
  diaPago?: number;
  modalidad?: 'Presencial' | 'Compañia' | 'Escuela' | 'Online' | 'Privadas';
  modalidadDetalle?: string;
  status: 'active' | 'inactive';
  statusHistory?: StatusChange[];
  paymentHistory?: PaymentChange[];
  paymentNotes?: string;
  notes?: StudentNote[];
  createdAt: string;
  updatedAt?: string;
  lastModified?: string;
  leadId?: string;
}

export interface StatusChange {
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  reason?: string;
  notes?: string;
}

export interface PaymentChange {
  previousValue: number;
  newValue: number;
  changedAt: string;
  notes?: string;
}

export interface StudentNote {
  id: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

// Student without sensitive data (for teachers)
export interface StudentPublic {
  id: string;
  nombre: string;
  grupo?: string;
  status: 'active' | 'inactive';
  modalidad?: string;
}

// ============================================
// GROUP TYPES
// ============================================

export interface Group {
  groupId: number;
  displayName: string;
  modality: 'CB' | 'COATS' | 'NAZARETH' | 'PRIVADO' | 'ONLINE';
  days: string[];
  daysShort?: string;
  startTime: string;
  endTime: string;
  book?: number;
  unit?: number;
  location?: string;
  room?: string;
  teacherId?: string;
  teacherName?: string;
  maxStudents?: number;
  studentIds?: string[];
  status: 'active' | 'inactive' | 'completed';
  locationId?: string; // Reference to /classLocations for GPS validation
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// TEACHER TYPES
// ============================================

export interface Teacher {
  id: string;
  name: string;
  documentType?: string;
  documentNumber?: string;
  phone?: string;
  email?: string;
  languages?: string[];
  availability?: string[];
  paymentType?: 'hourly' | 'salary';
  hourlyRate?: number;
  monthlySalary?: number;
  bank?: string;
  otherBankName?: string;
  accountType?: string;
  accountNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// ATTENDANCE TYPES
// ============================================

export interface AttendanceRecord {
  id: string;
  groupId: number;
  groupName: string;
  teacherId: string;
  teacherName?: string;
  originalTeacherId?: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime?: string;
  scheduledHours?: number;
  actualHours?: number;
  students: Record<string, StudentAttendance>;
  studentsPresent: number;
  studentsLate: number;
  studentsAbsent: number;
  status: 'active' | 'completed';
  isSubstitute?: boolean;
  paymentGenerated?: boolean;
  // GPS data (for mobile app)
  gpsData?: GPSData;
  submittedFrom?: 'mobile' | 'web';
  submittedOffline?: boolean;
  syncedAt?: string;
}

export interface StudentAttendance {
  studentId: string;
  status: 'present' | 'late' | 'absent';
  timestamp?: string;
  markedAt?: string;
  notes?: string;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  deviceId?: string;
  isValid?: boolean;
  validationReason?: string;
  distanceToLocation?: number;
}

// ============================================
// CLASS LOCATION TYPES (for GPS validation)
// ============================================

export interface ClassLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  active: boolean;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  method: string;
  bank?: string;
  month: string;
  year: number;
  date: string;
  registeredBy: string;
  notes?: string;
}

// ============================================
// OFFLINE SYNC TYPES
// ============================================

export interface OfflineQueueItem {
  id: string;
  type: 'attendance' | 'student_update';
  timestamp: string;
  data: any;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  gpsData?: GPSData;
}

export interface OfflineSyncLog {
  id: string;
  userId: string;
  type: string;
  originalTimestamp: string;
  syncedTimestamp: string;
  queuedDuration: number;
  gpsData?: GPSData;
  dataId: string;
  success: boolean;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Dashboard: undefined;
  // Attendance
  AttendanceHome: undefined;
  SelectGroup: undefined;
  TakeAttendance: {groupId: number};
  AttendanceHistory: {groupId?: number};
  AttendanceDetail: {attendanceId: string};
  // Students
  StudentList: undefined;
  StudentDetail: {studentId: string};
  StudentProgress: {studentId: string};
  // Payments
  PaymentsHome: undefined;
  RecordPayment: {studentId?: string};
  PaymentHistory: {studentId?: string};
  PendingPayments: undefined;
  // Reports
  ReportsHome: undefined;
  AttendanceReport: undefined;
  PaymentReport: undefined;
  // Admin
  AdminDashboard: undefined;
  UserManagement: undefined;
  ModuleConfig: undefined;
  // Profile
  Profile: undefined;
};
