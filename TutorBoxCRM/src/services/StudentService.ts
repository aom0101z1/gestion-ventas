// StudentService - Manages student data
// Hides phone numbers from teachers, provides full info to directors/admins
// IMPORTANT: Students without status field default to 'active' (matching web CRM behavior)

import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DB_PATHS} from '../config/firebase.config';
import {Student, StudentPublic} from '../types';
import {AuthService} from './AuthService';
import {hasFeatureAccess} from '../config/permissions.config';

const STUDENTS_CACHE_KEY = '@tutorbox_crm_students_cache';

// Helper to check if student is active (default to active if status not set)
const isStudentActive = (student: Student): boolean => {
  return student.status === 'active' || !student.status;
};

class StudentServiceClass {
  private students: Map<string, Student> = new Map();
  private studentsListener: (() => void) | null = null;

  async initialize(): Promise<void> {
    await this.loadFromCache();
    this.setupStudentsListener();
    console.log('StudentService initialized, students:', this.students.size);
  }

  private setupStudentsListener(): void {
    const ref = database().ref(DB_PATHS.STUDENTS);
    this.studentsListener = ref.on('value', snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.students.clear();
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value) {
            this.students.set(key, {
              id: key,
              ...value,
              status: value.status || 'active',
            } as Student);
          }
        });
        this.saveToCache();
        console.log('Students updated:', this.students.size);
      }
    }) as any;
  }

  getStudentById(studentId: string): Student | StudentPublic | undefined {
    const student = this.students.get(studentId);
    if (!student) return undefined;
    const role = AuthService.getRole();
    const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;
    if (canSeePhone) return student;
    return {
      id: student.id,
      nombre: student.nombre,
      grupo: student.grupo,
      status: student.status,
      modalidad: student.modalidad,
    } as StudentPublic;
  }

  getFullStudentById(studentId: string): Student | undefined {
    const role = AuthService.getRole();
    if (role !== 'admin' && role !== 'director') {
      console.warn('Access denied: Full student data requires admin/director role');
      return undefined;
    }
    return this.students.get(studentId);
  }

  getStudentsByGroup(groupId: string | number): (Student | StudentPublic)[] {
    const groupIdStr = String(groupId);
    const role = AuthService.getRole();
    const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;
    const students = Array.from(this.students.values()).filter(
      s => s.grupo === groupIdStr && isStudentActive(s),
    );
    if (canSeePhone) return students;
    return students.map(s => ({
      id: s.id,
      nombre: s.nombre,
      grupo: s.grupo,
      status: s.status,
      modalidad: s.modalidad,
    })) as StudentPublic[];
  }

  getStudentsByIds(studentIds: string[]): (Student | StudentPublic)[] {
    const role = AuthService.getRole();
    const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;
    const students = studentIds
      .map(id => this.students.get(id))
      .filter((s): s is Student => s !== undefined && isStudentActive(s));
    if (canSeePhone) return students;
    return students.map(s => ({
      id: s.id,
      nombre: s.nombre,
      grupo: s.grupo,
      status: s.status,
      modalidad: s.modalidad,
    })) as StudentPublic[];
  }

  getAllStudents(): (Student | StudentPublic)[] {
    const role = AuthService.getRole();
    const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;
    const students = Array.from(this.students.values()).filter(isStudentActive);
    if (canSeePhone) return students;
    return students.map(s => ({
      id: s.id,
      nombre: s.nombre,
      grupo: s.grupo,
      status: s.status,
      modalidad: s.modalidad,
    })) as StudentPublic[];
  }

  searchStudents(query: string): (Student | StudentPublic)[] {
    const lowerQuery = query.toLowerCase();
    const role = AuthService.getRole();
    const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;
    const students = Array.from(this.students.values()).filter(
      s => isStudentActive(s) && s.nombre.toLowerCase().includes(lowerQuery),
    );
    if (canSeePhone) return students;
    return students.map(s => ({
      id: s.id,
      nombre: s.nombre,
      grupo: s.grupo,
      status: s.status,
      modalidad: s.modalidad,
    })) as StudentPublic[];
  }

  getStudentCount(): number {
    return Array.from(this.students.values()).filter(isStudentActive).length;
  }

  getTotalStudentCount(): number {
    return this.students.size;
  }

  private async saveToCache(): Promise<void> {
    try {
      const studentsArray = Array.from(this.students.entries());
      await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(studentsArray));
    } catch (error) {
      console.error('Error saving students cache:', error);
    }
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STUDENTS_CACHE_KEY);
      if (cached) {
        const studentsArray = JSON.parse(cached);
        this.students = new Map(studentsArray);
        console.log('Loaded students from cache:', this.students.size);
      }
    } catch (error) {
      console.error('Error loading students cache:', error);
    }
  }

  async refresh(): Promise<void> {
    try {
      const snapshot = await database().ref(DB_PATHS.STUDENTS).once('value');
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.students.clear();
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value) {
            this.students.set(key, {
              id: key,
              ...value,
              status: value.status || 'active',
            } as Student);
          }
        });
        await this.saveToCache();
      }
    } catch (error) {
      console.error('Error refreshing students:', error);
    }
  }

  destroy(): void {
    if (this.studentsListener) {
      database().ref(DB_PATHS.STUDENTS).off('value', this.studentsListener as any);
      this.studentsListener = null;
    }
    this.students.clear();
  }
}

export const StudentService = new StudentServiceClass();
