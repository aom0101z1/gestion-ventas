// PaymentService - Manages student payments
// Directors and Admins only

import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DB_PATHS} from '../config/firebase.config';
import {Payment, Student} from '../types';
import {AuthService} from './AuthService';
import {StudentService} from './StudentService';

const PAYMENTS_CACHE_KEY = '@tutorbox_crm_payments_cache';

interface PaymentSubmission {
  studentId: string;
  amount: number;
  method: string;
  bank?: string;
  month: string;
  year: number;
  notes?: string;
}

interface PaymentStats {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  pendingCount: number;
}

class PaymentServiceClass {
  private payments: Map<string, Payment> = new Map();
  private paymentsListener: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Load cached data first
    await this.loadFromCache();

    // Setup real-time listener
    this.setupPaymentsListener();

    console.log('💰 PaymentService initialized, payments:', this.payments.size);
  }

  private setupPaymentsListener(): void {
    const ref = database().ref(DB_PATHS.PAYMENTS);

    this.paymentsListener = ref
      .orderByChild('date')
      .limitToLast(500)
      .on('value', snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          this.payments.clear();

          Object.entries(data).forEach(([key, value]: [string, any]) => {
            if (value) {
              this.payments.set(key, {
                id: key,
                ...value,
              } as Payment);
            }
          });

          this.saveToCache();
          console.log('💰 Payments updated:', this.payments.size);
        }
      }) as any;
  }

  // Record a new payment
  async recordPayment(submission: PaymentSubmission): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    const user = AuthService.getCurrentUser();
    if (!user) {
      return {success: false, error: 'Usuario no autenticado'};
    }

    const role = AuthService.getRole();
    if (role !== 'admin' && role !== 'director') {
      return {success: false, error: 'No tienes permisos para registrar pagos'};
    }

    try {
      const paymentId = `PAY-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];

      const payment: Payment = {
        id: paymentId,
        studentId: submission.studentId,
        amount: submission.amount,
        method: submission.method,
        bank: submission.bank,
        month: submission.month,
        year: submission.year,
        date: today,
        registeredBy: user.profile.name,
        notes: submission.notes,
      };

      await database()
        .ref(`${DB_PATHS.PAYMENTS}/${paymentId}`)
        .set(payment);

      console.log('✅ Payment recorded:', paymentId);

      return {
        success: true,
        paymentId,
      };
    } catch (error: any) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        error: error.message || 'Error registrando pago',
      };
    }
  }

  // Get all payments
  getAllPayments(): Payment[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // Get payments for a specific student
  getPaymentsByStudent(studentId: string): Payment[] {
    return Array.from(this.payments.values())
      .filter(p => p.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get recent payments (last 30 days)
  getRecentPayments(limit: number = 20): Payment[] {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return Array.from(this.payments.values())
      .filter(p => new Date(p.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  // Get today's payments
  getTodaysPayments(): Payment[] {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.payments.values())
      .filter(p => p.date === today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get payment stats
  getPaymentStats(): PaymentStats {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const todaysPayments = this.getTodaysPayments();
    const monthPayments = Array.from(this.payments.values()).filter(
      p => p.date.startsWith(currentMonth),
    );

    // Count students with pending payments (simplified - checks this month)
    const allStudents = StudentService.getAllStudents();
    const paidStudentIds = new Set(
      monthPayments.map(p => p.studentId),
    );
    const pendingCount = allStudents.filter(
      s => s.status === 'active' && !paidStudentIds.has(s.id),
    ).length;

    return {
      todayTotal: todaysPayments.reduce((sum, p) => sum + p.amount, 0),
      todayCount: todaysPayments.length,
      monthTotal: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      monthCount: monthPayments.length,
      pendingCount,
    };
  }

  // Get students with pending payments
  getStudentsWithPendingPayments(): Array<{
    student: Student;
    lastPayment?: Payment;
    monthsOverdue: number;
  }> {
    const allStudents = StudentService.getAllStudents() as Student[];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const result: Array<{
      student: Student;
      lastPayment?: Payment;
      monthsOverdue: number;
    }> = [];

    allStudents.forEach(student => {
      if (student.status !== 'active') return;

      const studentPayments = this.getPaymentsByStudent(student.id);
      const lastPayment = studentPayments[0];

      // Calculate months overdue
      let monthsOverdue = 0;
      if (!lastPayment) {
        // Never paid - count from enrollment
        if (student.fechaInicio) {
          const startDate = new Date(student.fechaInicio);
          monthsOverdue =
            (currentYear - startDate.getFullYear()) * 12 +
            (currentMonth - startDate.getMonth());
        } else {
          monthsOverdue = 1;
        }
      } else {
        // Check if paid this month
        const lastPaymentDate = new Date(lastPayment.date);
        if (
          lastPaymentDate.getMonth() !== currentMonth ||
          lastPaymentDate.getFullYear() !== currentYear
        ) {
          monthsOverdue =
            (currentYear - lastPaymentDate.getFullYear()) * 12 +
            (currentMonth - lastPaymentDate.getMonth());
        }
      }

      if (monthsOverdue > 0) {
        result.push({
          student,
          lastPayment,
          monthsOverdue,
        });
      }
    });

    // Sort by months overdue (most overdue first)
    return result.sort((a, b) => b.monthsOverdue - a.monthsOverdue);
  }

  // Get payments by month
  getPaymentsByMonth(year: number, month: number): Payment[] {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return Array.from(this.payments.values())
      .filter(p => p.date.startsWith(monthStr))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Search payments
  searchPayments(query: string): Payment[] {
    const lowerQuery = query.toLowerCase();
    const allStudents = StudentService.getAllStudents();
    const studentMap = new Map(allStudents.map(s => [s.id, s]));

    return Array.from(this.payments.values())
      .filter(p => {
        const student = studentMap.get(p.studentId);
        return (
          student?.nombre.toLowerCase().includes(lowerQuery) ||
          p.method.toLowerCase().includes(lowerQuery) ||
          p.notes?.toLowerCase().includes(lowerQuery)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Save to cache
  private async saveToCache(): Promise<void> {
    try {
      const paymentsArray = Array.from(this.payments.entries());
      await AsyncStorage.setItem(
        PAYMENTS_CACHE_KEY,
        JSON.stringify(paymentsArray),
      );
    } catch (error) {
      console.error('Error saving payments cache:', error);
    }
  }

  // Load from cache
  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(PAYMENTS_CACHE_KEY);
      if (cached) {
        const paymentsArray = JSON.parse(cached);
        this.payments = new Map(paymentsArray);
        console.log('💾 Loaded payments from cache:', this.payments.size);
      }
    } catch (error) {
      console.error('Error loading payments cache:', error);
    }
  }

  // Refresh from Firebase
  async refresh(): Promise<void> {
    try {
      const snapshot = await database()
        .ref(DB_PATHS.PAYMENTS)
        .orderByChild('date')
        .limitToLast(500)
        .once('value');

      if (snapshot.exists()) {
        const data = snapshot.val();
        this.payments.clear();

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value) {
            this.payments.set(key, {
              id: key,
              ...value,
            } as Payment);
          }
        });

        await this.saveToCache();
      }
    } catch (error) {
      console.error('Error refreshing payments:', error);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.paymentsListener) {
      database()
        .ref(DB_PATHS.PAYMENTS)
        .off('value', this.paymentsListener as any);
      this.paymentsListener = null;
    }
    this.payments.clear();
  }
}

// Export singleton instance
export const PaymentService = new PaymentServiceClass();
