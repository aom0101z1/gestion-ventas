// StudentProgressScreen - View student's Talky progress
// Reads progress data from shared Firebase

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import database from '@react-native-firebase/database';
import {useAuth} from '../../context/AuthContext';
import {StudentService} from '../../services/StudentService';
import {Student, StudentPublic} from '../../types';

interface Props {
  route: {params: {studentId: string}};
  navigation: any;
}

interface TalkyProgress {
  currentBook?: number;
  currentUnit?: number;
  completedUnits?: number[];
  totalXP?: number;
  level?: number;
  streak?: number;
  lastActivity?: string;
  exercisesCompleted?: number;
  accuracyRate?: number;
}

export default function StudentProgressScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const {studentId} = route.params;
  const {isConnected} = useAuth();

  const [student, setStudent] = useState<Student | StudentPublic | null>(null);
  const [progress, setProgress] = useState<TalkyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);

    // Load student info
    const studentData = StudentService.getStudentById(studentId);
    setStudent(studentData || null);

    // Load progress from Firebase (from Talky app data)
    try {
      const progressSnapshot = await database()
        .ref(`studentProgress/${studentId}`)
        .once('value');

      if (progressSnapshot.exists()) {
        setProgress(progressSnapshot.val());
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }

    setLoading(false);
  };

  const getProgressPercentage = () => {
    if (!progress?.currentBook || !progress?.currentUnit) return 0;
    // Assuming 10 units per book
    const totalUnits = progress.currentBook * 10;
    const currentProgress =
      (progress.currentBook - 1) * 10 + progress.currentUnit;
    return Math.round((currentProgress / totalUnits) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando progreso...</Text>
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
        <Text style={styles.headerTitle}>Progreso</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Student Header */}
        <View style={styles.studentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student?.nombre?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.studentName}>
            {student?.nombre || 'Estudiante'}
          </Text>
        </View>

        {progress ? (
          <>
            {/* Current Progress Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Progreso Actual</Text>
              <View style={styles.progressCard}>
                <View style={styles.progressMain}>
                  <Text style={styles.bookNumber}>
                    Book {progress.currentBook || 1}
                  </Text>
                  <Text style={styles.unitNumber}>
                    Unit {progress.currentUnit || 1}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {width: `${getProgressPercentage()}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPercentage}>
                    {getProgressPercentage()}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estadisticas</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statValue}>
                    {progress.totalXP?.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>XP Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>🎯</Text>
                  <Text style={styles.statValue}>{progress.level || 1}</Text>
                  <Text style={styles.statLabel}>Nivel</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>🔥</Text>
                  <Text style={styles.statValue}>{progress.streak || 0}</Text>
                  <Text style={styles.statLabel}>Racha</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>✅</Text>
                  <Text style={styles.statValue}>
                    {progress.exercisesCompleted || 0}
                  </Text>
                  <Text style={styles.statLabel}>Ejercicios</Text>
                </View>
              </View>
            </View>

            {/* Accuracy */}
            {progress.accuracyRate !== undefined && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Precision</Text>
                <View style={styles.accuracyCard}>
                  <View style={styles.accuracyCircle}>
                    <Text style={styles.accuracyValue}>
                      {Math.round(progress.accuracyRate)}%
                    </Text>
                  </View>
                  <View style={styles.accuracyInfo}>
                    <Text style={styles.accuracyLabel}>
                      Tasa de aciertos promedio
                    </Text>
                    <Text style={styles.accuracyDescription}>
                      Basado en todos los ejercicios completados
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Last Activity */}
            {progress.lastActivity && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ultima Actividad</Text>
                <View style={styles.activityCard}>
                  <Text style={styles.activityIcon}>📅</Text>
                  <Text style={styles.activityText}>
                    {new Date(progress.lastActivity).toLocaleDateString(
                      'es-ES',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* Completed Units */}
            {progress.completedUnits && progress.completedUnits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Unidades Completadas</Text>
                <View style={styles.unitsContainer}>
                  {progress.completedUnits.map((unit, index) => (
                    <View key={index} style={styles.unitBadge}>
                      <Text style={styles.unitBadgeText}>Unit {unit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noProgressContainer}>
            <Text style={styles.noProgressIcon}>📚</Text>
            <Text style={styles.noProgressTitle}>Sin datos de progreso</Text>
            <Text style={styles.noProgressText}>
              Este estudiante aun no tiene progreso registrado en Talky
            </Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 14,
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
  headerTitle: {
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
  content: {
    flex: 1,
  },
  studentHeader: {
    backgroundColor: '#667eea',
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  progressMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bookNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
  },
  unitNumber: {
    fontSize: 18,
    color: '#6b7280',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    width: 50,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  accuracyCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  accuracyInfo: {
    flex: 1,
  },
  accuracyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  accuracyDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityText: {
    fontSize: 15,
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  unitBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unitBadgeText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
  },
  noProgressContainer: {
    padding: 48,
    alignItems: 'center',
  },
  noProgressIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  noProgressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noProgressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
