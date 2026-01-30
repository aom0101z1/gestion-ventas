// TakeAttendanceScreen - Mark attendance for a group
// Requires GPS validation before submission

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {AttendanceService} from '../../services/AttendanceService';
import {GroupService} from '../../services/GroupService';
import {StudentService} from '../../services/StudentService';
import {GPSService} from '../../services/GPSService';
import {StudentAttendance, GPSData, Group, StudentPublic} from '../../types';

interface Props {
  route: {params: {groupId: number}};
  navigation: any;
}

type AttendanceStatus = 'present' | 'late' | 'absent';

export default function TakeAttendanceScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const {groupId} = route.params;
  const {isConnected} = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<StudentPublic[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);

    // Load group
    const groupData = GroupService.getGroupById(groupId);
    setGroup(groupData || null);

    // Load students
    if (groupData?.studentIds) {
      const studentsList = StudentService.getStudentsByIds(
        groupData.studentIds,
      ) as StudentPublic[];
      setStudents(studentsList);

      // Initialize all as present by default
      const initialAttendance: Record<string, AttendanceStatus> = {};
      studentsList.forEach(s => {
        initialAttendance[s.id] = 'present';
      });
      setAttendance(initialAttendance);
    }

    setLoading(false);
  };

  const verifyGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);

    try {
      const result = await AttendanceService.validateGPSForGroup(groupId);

      if (result.isValid && result.gpsData) {
        setGpsData(result.gpsData);
        Alert.alert(
          '✅ Ubicación Verificada',
          `Estás a ${result.gpsData.distanceToLocation || 0}m del lugar de clase.`,
        );
      } else {
        setGpsError(result.error || 'Error validando GPS');
        Alert.alert('❌ Error de Ubicación', result.error || 'GPS inválido');
      }
    } catch (error: any) {
      setGpsError(error.message);
      Alert.alert('Error', error.message);
    }

    setGpsLoading(false);
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      const next: AttendanceStatus =
        current === 'present'
          ? 'late'
          : current === 'late'
            ? 'absent'
            : 'present';
      return {...prev, [studentId]: next};
    });
  };

  const setAllPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      newAttendance[s.id] = 'present';
    });
    setAttendance(newAttendance);
  };

  const setAllAbsent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      newAttendance[s.id] = 'absent';
    });
    setAttendance(newAttendance);
  };

  const handleSubmit = async () => {
    // Check GPS validation
    if (!gpsData) {
      Alert.alert(
        'GPS Requerido',
        'Debes verificar tu ubicación antes de enviar la asistencia.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Verificar GPS', onPress: verifyGPS},
        ],
      );
      return;
    }

    // Confirm submission
    const presentCount = Object.values(attendance).filter(
      s => s === 'present',
    ).length;
    const lateCount = Object.values(attendance).filter(
      s => s === 'late',
    ).length;
    const absentCount = Object.values(attendance).filter(
      s => s === 'absent',
    ).length;

    Alert.alert(
      'Confirmar Asistencia',
      `Presentes: ${presentCount}\nTarde: ${lateCount}\nAusentes: ${absentCount}\n\n¿Deseas enviar?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Enviar', onPress: submitAttendance},
      ],
    );
  };

  const submitAttendance = async () => {
    if (!group || !gpsData) return;

    setSubmitting(true);

    // Build student attendance records
    const studentRecords: Record<string, StudentAttendance> = {};
    const now = new Date().toISOString();

    Object.entries(attendance).forEach(([studentId, status]) => {
      studentRecords[studentId] = {
        studentId,
        status,
        timestamp: now,
        markedAt: new Date().toTimeString().split(' ')[0],
      };
    });

    const result = await AttendanceService.submitAttendance({
      groupId: group.groupId,
      groupName: group.displayName || `Grupo ${group.groupId}`,
      students: studentRecords,
      gpsData,
    });

    setSubmitting(false);

    if (result.success) {
      const message = result.isOffline
        ? 'Asistencia guardada. Se sincronizará cuando haya conexión.'
        : 'Asistencia registrada exitosamente.';

      Alert.alert('✅ Éxito', message, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } else {
      Alert.alert('Error', result.error || 'No se pudo guardar la asistencia');
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return '#10b981';
      case 'late':
        return '#f59e0b';
      case 'absent':
        return '#ef4444';
    }
  };

  const getStatusText = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'late':
        return 'Tarde';
      case 'absent':
        return 'Ausente';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return '✅';
      case 'late':
        return '⏰';
      case 'absent':
        return '❌';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tomar Asistencia</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>
          {group?.displayName || `Grupo ${groupId}`}
        </Text>
        <Text style={styles.groupDetails}>
          {students.length} estudiantes • {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* GPS Verification */}
      <View
        style={[
          styles.gpsCard,
          gpsData ? styles.gpsCardValid : styles.gpsCardPending,
        ]}>
        <View style={styles.gpsContent}>
          <Text style={styles.gpsIcon}>{gpsData ? '✅' : '📍'}</Text>
          <View style={styles.gpsTextContainer}>
            <Text style={styles.gpsTitle}>
              {gpsData ? 'Ubicación Verificada' : 'Verificar Ubicación'}
            </Text>
            <Text style={styles.gpsSubtitle}>
              {gpsData
                ? `${gpsData.distanceToLocation}m del lugar de clase`
                : gpsError || 'Debes estar a menos de 500m'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.gpsButton, gpsData && styles.gpsButtonVerified]}
          onPress={verifyGPS}
          disabled={gpsLoading}>
          {gpsLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.gpsButtonText}>
              {gpsData ? 'Verificar de nuevo' : 'Verificar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickButton} onPress={setAllPresent}>
          <Text style={styles.quickButtonText}>✅ Todos Presentes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={setAllAbsent}>
          <Text style={styles.quickButtonText}>❌ Todos Ausentes</Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      <ScrollView style={styles.studentList}>
        <Text style={styles.sectionTitle}>
          Toca para cambiar: Presente → Tarde → Ausente
        </Text>
        {students.map(student => (
          <TouchableOpacity
            key={student.id}
            style={styles.studentRow}
            onPress={() => toggleAttendance(student.id)}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.nombre}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(attendance[student.id])},
              ]}>
              <Text style={styles.statusIcon}>
                {getStatusIcon(attendance[student.id])}
              </Text>
              <Text style={styles.statusText}>
                {getStatusText(attendance[student.id])}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!gpsData || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {gpsData ? 'Enviar Asistencia' : 'Verificar GPS primero'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#667eea',
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  groupInfo: {
    padding: 16,
    backgroundColor: '#667eea',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  groupDetails: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  gpsCard: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsCardPending: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  gpsCardValid: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  gpsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gpsIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  gpsTextContainer: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  gpsSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  gpsButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  gpsButtonVerified: {
    backgroundColor: '#10b981',
  },
  gpsButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  studentList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statusText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
