// Role-Based Permissions Configuration
// Defines which roles can access which modules and features

export type UserRole = 'admin' | 'director' | 'teacher';

export type ModuleId =
  | 'attendance'
  | 'students'
  | 'payments'
  | 'progress'
  | 'reports'
  | 'admin';

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  icon: string;
  description: string;
  allowedRoles: UserRole[];
  features: Record<string, UserRole[]>;
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    id: 'attendance',
    name: 'Asistencia',
    icon: 'clipboard-check',
    description: 'Control de asistencia con GPS',
    allowedRoles: ['admin', 'director', 'teacher'],
    features: {
      view_own_groups: ['teacher', 'director', 'admin'],
      view_all_groups: ['director', 'admin'],
      take_attendance: ['teacher', 'director', 'admin'],
      edit_past_attendance: ['director', 'admin'],
      view_reports: ['director', 'admin'],
    },
  },
  {
    id: 'students',
    name: 'Estudiantes',
    icon: 'users',
    description: 'Gestión de estudiantes',
    allowedRoles: ['admin', 'director', 'teacher'],
    features: {
      view_list: ['teacher', 'director', 'admin'],
      view_phone: ['director', 'admin'], // Teachers CANNOT see phone
      edit_student: ['director', 'admin'],
      add_student: ['director', 'admin'],
      delete_student: ['admin'],
      view_progress: ['teacher', 'director', 'admin'],
    },
  },
  {
    id: 'payments',
    name: 'Pagos',
    icon: 'dollar-sign',
    description: 'Control de pagos',
    allowedRoles: ['admin', 'director'], // NOT available to teachers
    features: {
      view_payments: ['director', 'admin'],
      record_payment: ['director', 'admin'],
      edit_payment: ['admin'],
      delete_payment: ['admin'],
      view_reports: ['director', 'admin'],
    },
  },
  {
    id: 'progress',
    name: 'Progreso',
    icon: 'trending-up',
    description: 'Ver progreso de estudiantes',
    allowedRoles: ['admin', 'director', 'teacher'],
    features: {
      view_progress: ['teacher', 'director', 'admin'],
    },
  },
  {
    id: 'reports',
    name: 'Reportes',
    icon: 'bar-chart-2',
    description: 'Reportes y estadísticas',
    allowedRoles: ['admin', 'director'], // NOT available to teachers
    features: {
      attendance_reports: ['director', 'admin'],
      payment_reports: ['director', 'admin'],
      progress_reports: ['director', 'admin'],
    },
  },
  {
    id: 'admin',
    name: 'Administración',
    icon: 'settings',
    description: 'Configuración del sistema',
    allowedRoles: ['admin'], // ONLY admin
    features: {
      manage_users: ['admin'],
      configure_modules: ['admin'],
      view_audit_log: ['admin'],
    },
  },
];

// Helper function to check if role has access to module
export function hasModuleAccess(role: UserRole, moduleId: ModuleId): boolean {
  const module = MODULE_CONFIGS.find(m => m.id === moduleId);
  return module ? module.allowedRoles.includes(role) : false;
}

// Helper function to check if role has access to feature
export function hasFeatureAccess(
  role: UserRole,
  moduleId: ModuleId,
  feature: string,
): boolean {
  const module = MODULE_CONFIGS.find(m => m.id === moduleId);
  if (!module) return false;
  const allowedRoles = module.features[feature];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

// Get modules accessible by role
export function getAccessibleModules(role: UserRole): ModuleConfig[] {
  return MODULE_CONFIGS.filter(m => m.allowedRoles.includes(role));
}

// MODULE_ACCESS - quick lookup map for module access by role
export const MODULE_ACCESS: Record<ModuleId, {roles: UserRole[]}> = {
  attendance: {roles: ['admin', 'director', 'teacher']},
  students: {roles: ['admin', 'director', 'teacher']},
  payments: {roles: ['admin', 'director']},
  progress: {roles: ['admin', 'director', 'teacher']},
  reports: {roles: ['admin', 'director']},
  admin: {roles: ['admin']},
};
