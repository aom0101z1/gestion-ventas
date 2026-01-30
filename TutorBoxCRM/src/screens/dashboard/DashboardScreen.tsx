// DashboardScreen - Beautiful modern dashboard
// Matches web CRM style with gradients and modern cards

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {getAccessibleModules} from '../../config/permissions.config';
import {GroupService} from '../../services/GroupService';
import {StudentService} from '../../services/StudentService';
import {AttendanceService} from '../../services/AttendanceService';
import {PaymentService} from '../../services/PaymentService';
import {Group} from '../../types';
import {Colors, Shadows, BorderRadius, Spacing} from '../../theme';

const {width} = Dimensions.get('window');

export default function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const {user, role, isConnected} = useAuth();

  const [todaysGroups, setTodaysGroups] = useState<Group[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [todayAttendanceRate, setTodayAttendanceRate] = useState<string>('-');

  const accessibleModules = role ? getAccessibleModules(role) : [];

  // Load dashboard data
  useEffect(() => {
    const loadData = () => {
      // Get today's groups
      const groups = GroupService.getTodaysGroups();
      setTodaysGroups(groups);

      // Get all groups count
      const allGroups = GroupService.getAllGroups();
      setGroupCount(allGroups.length);

      // Get student count
      const students = StudentService.getAllStudents();
      setStudentCount(students.length);

      // Get today's attendance rate
      const todayStats = AttendanceService.getTodayStats();
      if (todayStats.total > 0) {
        const rate = Math.round((todayStats.present / todayStats.total) * 100);
        setTodayAttendanceRate(`${rate}%`);
      }
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Navigation handlers for quick actions
  const handleTakeAttendance = () => {
    navigation.navigate('AttendanceTab');
  };

  const handleViewStudents = () => {
    navigation.navigate('StudentsTab');
  };

  const handleRecordPayment = () => {
    navigation.navigate('PaymentsTab');
  };

  const handleViewReports = () => {
    navigation.navigate('ReportsTab');
  };

  const getRoleDisplay = () => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'director':
        return 'Director';
      case 'teacher':
        return 'Profesor';
      default:
        return 'Usuario';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Gradient Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>
                {user?.profile.name?.split(' ')[0] || 'Usuario'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {!isConnected ? (
                <View style={styles.offlineBadge}>
                  <View style={styles.offlineDot} />
                  <Text style={styles.offlineBadgeText}>Offline</Text>
                </View>
              ) : (
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineBadgeText}>Online</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleDisplay()}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.statIconContainer}>
              <Text style={styles.statIcon}>👥</Text>
            </LinearGradient>
            <Text style={styles.statValue}>{studentCount}</Text>
            <Text style={styles.statLabel}>Estudiantes</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <View style={[styles.statIconContainer, {backgroundColor: Colors.success}]}>
              <Text style={styles.statIcon}>📚</Text>
            </View>
            <Text style={styles.statValue}>{groupCount}</Text>
            <Text style={styles.statLabel}>Grupos</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={[styles.statIconContainer, {backgroundColor: Colors.warning}]}>
              <Text style={styles.statIcon}>📋</Text>
            </View>
            <Text style={styles.statValue}>{todaysGroups.length}</Text>
            <Text style={styles.statLabel}>Clases Hoy</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleTakeAttendance}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#fc8181', '#f56565']}
                style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📋</Text>
              </LinearGradient>
              <Text style={styles.actionText}>Asistencia</Text>
              <Text style={styles.actionSubtext}>Tomar lista</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleViewStudents}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#48bb78', '#38a169']}
                style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>👥</Text>
              </LinearGradient>
              <Text style={styles.actionText}>Estudiantes</Text>
              <Text style={styles.actionSubtext}>Ver listado</Text>
            </TouchableOpacity>

            {(role === 'admin' || role === 'director') && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleRecordPayment}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#ed8936', '#dd6b20']}
                  style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>💰</Text>
                </LinearGradient>
                <Text style={styles.actionText}>Pagos</Text>
                <Text style={styles.actionSubtext}>Registrar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleViewReports}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#4299e1', '#3182ce']}
                style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📊</Text>
              </LinearGradient>
              <Text style={styles.actionText}>Reportes</Text>
              <Text style={styles.actionSubtext}>Ver datos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Classes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Clases de Hoy</Text>
            <TouchableOpacity onPress={handleTakeAttendance}>
              <Text style={styles.seeAllLink}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          {todaysGroups.length > 0 ? (
            <View style={styles.classesList}>
              {todaysGroups.slice(0, 4).map((group, index) => (
                <TouchableOpacity
                  key={group.groupId || index}
                  style={[
                    styles.classItem,
                    index === todaysGroups.slice(0, 4).length - 1 && styles.classItemLast,
                  ]}
                  onPress={handleTakeAttendance}
                  activeOpacity={0.7}>
                  <LinearGradient
                    colors={
                      index % 4 === 0
                        ? ['#667eea', '#764ba2']
                        : index % 4 === 1
                          ? ['#48bb78', '#38a169']
                          : index % 4 === 2
                            ? ['#ed8936', '#dd6b20']
                            : ['#4299e1', '#3182ce']
                    }
                    style={styles.classTimeContainer}>
                    <Text style={styles.classTimeText}>
                      {group.schedule?.split(' ')[0] || '-'}
                    </Text>
                  </LinearGradient>
                  <View style={styles.classInfo}>
                    <Text style={styles.className} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.classLevel}>{group.level || 'Sin nivel'}</Text>
                  </View>
                  <View style={styles.classStudentsBadge}>
                    <Text style={styles.classStudentsText}>
                      {group.studentIds?.length || 0}
                    </Text>
                    <Text style={styles.classStudentsLabel}>est.</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
              </View>
              <Text style={styles.emptyTitle}>Sin clases programadas</Text>
              <Text style={styles.emptyText}>
                No hay clases para hoy. Disfruta tu descanso.
              </Text>
            </View>
          )}
        </View>

        {/* Module Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Módulos Disponibles</Text>
          <View style={styles.modulesGrid}>
            {accessibleModules.slice(0, 6).map((module, index) => {
              const colors =
                module.id === 'attendance'
                  ? ['#fc8181', '#f56565']
                  : module.id === 'students'
                    ? ['#48bb78', '#38a169']
                    : module.id === 'payments'
                      ? ['#ed8936', '#dd6b20']
                      : module.id === 'progress'
                        ? ['#9f7aea', '#805ad5']
                        : module.id === 'reports'
                          ? ['#4299e1', '#3182ce']
                          : ['#667eea', '#764ba2'];

              const icon =
                module.id === 'attendance'
                  ? '📋'
                  : module.id === 'students'
                    ? '👥'
                    : module.id === 'payments'
                      ? '💰'
                      : module.id === 'progress'
                        ? '📈'
                        : module.id === 'reports'
                          ? '📊'
                          : '⚙️';

              return (
                <TouchableOpacity
                  key={module.id}
                  style={styles.moduleCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (module.id === 'attendance') handleTakeAttendance();
                    else if (module.id === 'students') handleViewStudents();
                    else if (module.id === 'payments') handleRecordPayment();
                    else if (module.id === 'reports') handleViewReports();
                  }}>
                  <LinearGradient
                    colors={colors}
                    style={styles.moduleIconContainer}>
                    <Text style={styles.moduleIcon}>{icon}</Text>
                  </LinearGradient>
                  <Text style={styles.moduleName} numberOfLines={1}>
                    {module.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ciudad Bilingüe CRM Mobile</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {},
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
    marginRight: 6,
  },
  offlineBadgeText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '600',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(72, 187, 120, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  onlineBadgeText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: Spacing.sm,
  },
  roleText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: Spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Shadows.medium,
  },
  statCardPrimary: {},
  statCardSuccess: {},
  statCardWarning: {},
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAllLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: (width - Spacing.lg * 2 - 24) / 4,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    margin: 4,
    alignItems: 'center',
    ...Shadows.small,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSubtext: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 1,
  },
  classesList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
    overflow: 'hidden',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  classItemLast: {
    borderBottomWidth: 0,
  },
  classTimeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: Spacing.md,
  },
  classTimeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  classLevel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  classStudentsBadge: {
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  classStudentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  classStudentsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.small,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  moduleCard: {
    width: (width - Spacing.lg * 2 - 24) / 3,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    margin: 4,
    alignItems: 'center',
    ...Shadows.small,
  },
  moduleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  moduleIcon: {
    fontSize: 24,
  },
  moduleName: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    color: Colors.textLight,
    fontSize: 12,
    marginTop: 4,
  },
});
