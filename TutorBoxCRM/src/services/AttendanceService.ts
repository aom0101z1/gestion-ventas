// AttendanceService - Manages attendance records
// Requires GPS validation, supports offline mode

import database from '@react-native-firebase/database';
import {DB_PATHS} from '../config/firebase.config';
import {
  AttendanceRecord,
  StudentAttendance,
  GPSData,
  ClassLocation,
  OfflineQueueItem,
} from '../types';
import {AuthService} from './AuthService';
import {GPSService} from './GPSService';
import {GroupService} from './GroupService';
import {NetworkService} from './NetworkService';
import {OfflineSyncService} from './OfflineSyncService';

interface AttendanceSubmission {
  groupId: number;
  groupName: string;
  students: Record<string, StudentAttendance>;
  gpsData: GPSData;
  date?: string;
}

interface SubmitResult {
  success: boolean;
  attendanceId?: string;
  error?: string;
  isOffline?: boolean;
}

class AttendanceServiceClass {
  async initialize(): Promise<void> {
    // Register sync callback for offline attendance
    OfflineSyncService.registerSyncCallback(
      'attendance',
      this.syncOfflineAttendance.bind(this),
    );

    console.log('📋 AttendanceService initialized');
  }

  // Validate GPS before taking attendance
  async validateGPSForGroup(
    groupId: number,
  ): Promise<{isValid: boolean; error?: string; gpsData?: GPSData}> {
    try {
      // Get group's class location
      const group = GroupService.getGroupById(groupId);
      let classLocation: ClassLocation | undefined;

      if (group?.locationId) {
        classLocation = GroupService.getClassLocation(group.locationId);
      }

      // If no specific location, use default
      if (!classLocation) {
        classLocation = GroupService.getDefaultClassLocation();
      }

      if (!classLocation) {
        return {
          isValid: false,
          error:
            'No hay ubicación de clase configurada. Contacta al administrador.',
        };
      }

      // Validate GPS
      const result = await GPSService.validateLocationForAttendance(
        classLocation,
      );

      return {
        isValid: result.isValid,
        error: result.reason,
        gpsData: result.gpsData,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Error validando ubicación',
      };
    }
  }

  // Submit attendance record
  async submitAttendance(
    submission: AttendanceSubmission,
  ): Promise<SubmitResult> {
    const user = AuthService.getCurrentUser();
    if (!user) {
      return {success: false, error: 'Usuario no autenticado'};
    }

    const teacherId = AuthService.getTeacherId() || user.uid;
    const date = submission.date || new Date().toISOString().split('T')[0];
    const now = new Date();

    // Count attendance stats
    const studentsArray = Object.values(submission.students);
    const studentsPresent = studentsArray.filter(
      s => s.status === 'present',
    ).length;
    const studentsLate = studentsArray.filter(s => s.status === 'late').length;
    const studentsAbsent = studentsArray.filter(
      s => s.status === 'absent',
    ).length;

    // Create attendance record
    const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
      groupId: submission.groupId,
      groupName: submission.groupName,
      teacherId,
      teacherName: user.profile.name,
      date,
      startTime: now.toTimeString().split(' ')[0],
      students: submission.students,
      studentsPresent,
      studentsLate,
      studentsAbsent,
      status: 'completed',
      gpsData: {
        ...submission.gpsData,
        deviceId: `mobile-${user.uid.substring(0, 8)}`,
      },
      submittedFrom: 'mobile',
      submittedOffline: !NetworkService.getIsConnected(),
    };

    // If online, save directly to Firebase
    if (NetworkService.getIsConnected()) {
      return this.saveToFirebase(attendanceRecord);
    }

    // If offline, queue for later sync
    return this.queueForSync(attendanceRecord);
  }

  // Save attendance directly to Firebase
  private async saveToFirebase(
    record: Omit<AttendanceRecord, 'id'>,
  ): Promise<SubmitResult> {
    try {
      const attendanceId = `ATT-${Date.now()}`;
      const fullRecord: AttendanceRecord = {
        id: attendanceId,
        ...record,
        syncedAt: new Date().toISOString(),
      };

      await database()
        .ref(`${DB_PATHS.ATTENDANCE}/${attendanceId}`)
        .set(fullRecord);

      console.log('✅ Attendance saved:', attendanceId);

      return {
        success: true,
        attendanceId,
      };
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      return {
        success: false,
        error: error.message || 'Error guardando asistencia',
      };
    }
  }

  // Queue attendance for offline sync
  private async queueForSync(
    record: Omit<AttendanceRecord, 'id'>,
  ): Promise<SubmitResult> {
    try {
      const queueId = await OfflineSyncService.addToQueue(
        'attendance',
        record,
        record.gpsData,
      );

      console.log('📥 Attendance queued for sync:', queueId);

      return {
        success: true,
        attendanceId: queueId,
        isOffline: true,
      };
    } catch (error: any) {
      console.error('Error queuing attendance:', error);
      return {
        success: false,
        error: error.message || 'Error guardando asistencia offline',
      };
    }
  }

  // Sync offline attendance (called by OfflineSyncService)
  private async syncOfflineAttendance(item: OfflineQueueItem): Promise<boolean> {
    try {
      const record = item.data as Omit<AttendanceRecord, 'id'>;
      const attendanceId = `ATT-${Date.now()}`;

      const fullRecord: AttendanceRecord = {
        id: attendanceId,
        ...record,
        submittedOffline: true,
        syncedAt: new Date().toISOString(),
      };

      await database()
        .ref(`${DB_PATHS.ATTENDANCE}/${attendanceId}`)
        .set(fullRecord);

      // Log the sync
      await this.logOfflineSync(item, attendanceId, true);

      console.log('✅ Offline attendance synced:', attendanceId);
      return true;
    } catch (error) {
      console.error('Error syncing offline attendance:', error);
      return false;
    }
  }

  // Log offline sync for audit
  private async logOfflineSync(
    item: OfflineQueueItem,
    dataId: string,
    success: boolean,
  ): Promise<void> {
    try {
      const user = AuthService.getCurrentUser();
      const logId = `SYNC-${Date.now()}`;

      await database().ref(`${DB_PATHS.OFFLINE_SYNC_LOG}/${logId}`).set({
        id: logId,
        userId: user?.uid,
        type: item.type,
        originalTimestamp: item.timestamp,
        syncedTimestamp: new Date().toISOString(),
        queuedDuration: Date.now() - new Date(item.timestamp).getTime(),
        gpsData: item.gpsData,
        dataId,
        success,
      });
    } catch (error) {
      console.error('Error logging offline sync:', error);
    }
  }

  // Get attendance history for a group
  async getGroupAttendanceHistory(
    groupId: number,
    limit: number = 30,
  ): Promise<AttendanceRecord[]> {
    try {
      const snapshot = await database()
        .ref(DB_PATHS.ATTENDANCE)
        .orderByChild('groupId')
        .equalTo(groupId)
        .limitToLast(limit)
        .once('value');

      if (!snapshot.exists()) return [];

      const records: AttendanceRecord[] = [];
      snapshot.forEach(child => {
        records.push(child.val());
        return undefined;
      });

      // Sort by date descending
      return records.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }
  }

  // Get today's attendance for teacher
  async getTodaysAttendance(): Promise<AttendanceRecord[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const teacherId = AuthService.getTeacherId();
      const role = AuthService.getRole();

      const snapshot = await database()
        .ref(DB_PATHS.ATTENDANCE)
        .orderByChild('date')
        .equalTo(today)
        .once('value');

      if (!snapshot.exists()) return [];

      const records: AttendanceRecord[] = [];
      snapshot.forEach(child => {
        const record = child.val();
        // Filter by teacher if not admin/director
        if (
          role === 'admin' ||
          role === 'director' ||
          record.teacherId === teacherId
        ) {
          records.push(record);
        }
        return undefined;
      });

      return records;
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      return [];
    }
  }

  // Get all attendance records (for reports)
  getAllRecords(): AttendanceRecord[] {
    // This returns an empty array - actual data comes from Firebase queries
    // For reports, we need to fetch fresh data
    return [];
  }

  // Get all attendance records from Firebase (async version for reports)
  async fetchAllRecords(limit: number = 500): Promise<AttendanceRecord[]> {
    try {
      const snapshot = await database()
        .ref(DB_PATHS.ATTENDANCE)
        .orderByChild('date')
        .limitToLast(limit)
        .once('value');

      if (!snapshot.exists()) return [];

      const records: AttendanceRecord[] = [];
      snapshot.forEach(child => {
        records.push({id: child.key, ...child.val()});
        return undefined;
      });

      return records.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (error) {
      console.error('Error fetching all records:', error);
      return [];
    }
  }

  // Get today's stats for dashboard (synchronous - returns cached/default values)
  getTodayStats(): {total: number; present: number; late: number; absent: number} {
    // Return default values - actual data needs async fetch
    // This is for quick dashboard display
    return {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
    };
  }

  // Check if attendance already exists for group on date
  async attendanceExists(groupId: number, date: string): Promise<boolean> {
    try {
      const snapshot = await database()
        .ref(DB_PATHS.ATTENDANCE)
        .orderByChild('groupId')
        .equalTo(groupId)
        .once('value');

      if (!snapshot.exists()) return false;

      let exists = false;
      snapshot.forEach(child => {
        if (child.val().date === date) {
          exists = true;
        }
        return undefined;
      });

      return exists;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  }
}

// Export singleton instance
export const AttendanceService = new AttendanceServiceClass();
