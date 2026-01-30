// Firebase Configuration for TutorBoxCRM
// Uses the same Firebase project as gestion-ventas web CRM

export const firebaseConfig = {
  apiKey: 'AIzaSyCuq1z8eTo9rufdEDXQFfvoxOkce-kBWOY',
  authDomain: 'ciudad-bilingue-crm.firebaseapp.com',
  databaseURL: 'https://ciudad-bilingue-crm-default-rtdb.firebaseio.com',
  projectId: 'ciudad-bilingue-crm',
  storageBucket: 'ciudad-bilingue-crm.firebasestorage.app',
  messagingSenderId: '690594486040',
  appId: '1:690594486040:web:e8fffcffcee68a4d94f06d',
};

// Database paths
export const DB_PATHS = {
  USERS: 'users',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  GROUPS: 'grupos2',
  ATTENDANCE: 'attendance',
  PAYMENTS: 'payments',
  CLASS_LOCATIONS: 'classLocations',
  USER_MODULE_OVERRIDES: 'userModuleOverrides',
  OFFLINE_SYNC_LOG: 'offlineSyncLog',
};
