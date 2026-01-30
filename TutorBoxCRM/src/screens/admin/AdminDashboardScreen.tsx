// AdminDashboardScreen - Admin settings dashboard
// Admin only

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import database from '@react-native-firebase/database';
import {useAuth} from '../../context/AuthContext';
import {StudentService} from '../../services/StudentService';
import {GroupService} from '../../services/GroupService';
import {AttendanceService} from '../../services/AttendanceService';
import {PaymentService} from '../../services/PaymentService';
import {DB_PATHS} from '../../config/firebase.config';

interface Props {
  navigation: any;
}

interface SystemStats {
  totalStudents: number;
  activeStudents: number;
  totalGroups: number;
  activeGroups: number;
  totalAttendance: number;
  totalPayments: number;
  totalUsers: number;
}

interface UserSummary {
  uid: string;
  name: string;
  email: string;
  role: string;
  lastLogin?: string;
}

export default function AdminDashboardScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected, role} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalGroups: 0,
    activeGroups: 0,
    totalAttendance: 0,
    totalPayments: 0,
    totalUsers: 0,
  });
  const [users, setUsers] = useState<UserSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (role !== 'admin') {
        Alert.alert('Acceso Denegado', 'Solo administradores pueden acceder.');
        navigation.goBack();
        return;
      }
      loadData();
    }, [role]),
  );

  const loadData = async () => {
    setLoading(true);

    await Promise.all([
      StudentService.initialize(),
      GroupService.initialize(),
      AttendanceService.initialize(),
      PaymentService.initialize(),
    ]);

    // Get stats
    const allStudents = StudentService.getAllStudents();
    const activeStudents = allStudents.filter(s => s.status === 'active');
    const allGroups = GroupService.getAllGroups();
    const activeGroups = allGroups.filter(g => g.status === 'active');
    const allAttendance = await AttendanceService.fetchAllRecords();
    const allPayments = PaymentService.getAllPayments();

    // Load users from Firebase
    try {
      const usersSnapshot = await database()
        .ref(DB_PATHS.USERS)
        .once('value');

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const usersList: UserSummary[] = Object.entries(usersData).map(
          ([uid, data]: [string, any]) => ({
            uid,
            name: data.profile?.name || 'Sin nombre',
            email: data.profile?.email || 'Sin email',
            role: data.profile?.role || 'unknown',
            lastLogin: data.profile?.lastLogin,
          }),
        );
        setUsers(usersList);

        setStats({
          totalStudents: allStudents.length,
          activeStudents: activeStudents.length,
          totalGroups: allGroups.length,
          activeGroups: activeGroups.length,
          totalAttendance: allAttendance.length,
          totalPayments: allPayments.length,
          totalUsers: usersList.length,
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return {bg: '#fee2e2', text: '#dc2626'};
      case 'director':
        return {bg: '#dbeafe', text: '#2563eb'};
      case 'teacher':
        return {bg: '#dcfce7', text: '#16a34a'};
      default:
        return {bg: '#f3f4f6', text: '#6b7280'};
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Nunca';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return date.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'});
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
        <Text style={styles.title}>⚙️ Administracion</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* System Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{stats.activeStudents}</Text>
            <Text style={styles.statLabel}>Estudiantes Activos</Text>
            <Text style={styles.statSubtext}>de {stats.totalStudents} total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{stats.activeGroups}</Text>
            <Text style={styles.statLabel}>Grupos Activos</Text>
            <Text style={styles.statSubtext}>de {stats.totalGroups} total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValue}>{stats.totalAttendance}</Text>
            <Text style={styles.statLabel}>Registros</Text>
            <Text style={styles.statSubtext}>de asistencia</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{stats.totalPayments}</Text>
            <Text style={styles.statLabel}>Pagos</Text>
            <Text style={styles.statSubtext}>registrados</Text>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones de Administrador</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('UserManagement')}>
            <Text style={styles.actionIcon}>👤</Text>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Gestion de Usuarios</Text>
              <Text style={styles.actionSubtitle}>
                {stats.totalUsers} usuarios registrados
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ModuleConfig')}>
            <Text style={styles.actionIcon}>🔧</Text>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Configuracion de Modulos</Text>
              <Text style={styles.actionSubtitle}>
                Habilitar/deshabilitar modulos por usuario
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Usuarios del Sistema</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserManagement')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {users.slice(0, 5).map(user => {
            const badgeStyle = getRoleBadgeStyle(user.role);
            return (
              <View key={user.uid} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.userMeta}>
                  <View
                    style={[styles.roleBadge, {backgroundColor: badgeStyle.bg}]}>
                    <Text style={[styles.roleBadgeText, {color: badgeStyle.text}]}>
                      {user.role}
                    </Text>
                  </View>
                  <Text style={styles.lastLoginText}>
                    {formatLastLogin(user.lastLogin)}
                  </Text>
                </View>
              </View>
            );
          })}

          {users.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          )}
        </View>

        {/* Database Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base de Datos</Text>
          <View style={styles.dbInfoCard}>
            <View style={styles.dbInfoRow}>
              <Text style={styles.dbInfoLabel}>Proyecto Firebase</Text>
              <Text style={styles.dbInfoValue}>ciudad-bilingue-crm</Text>
            </View>
            <View style={styles.dbInfoRow}>
              <Text style={styles.dbInfoLabel}>Conexion</Text>
              <View
                style={[
                  styles.connectionBadge,
                  {backgroundColor: isConnected ? '#dcfce7' : '#fee2e2'},
                ]}>
                <Text
                  style={[
                    styles.connectionText,
                    {color: isConnected ? '#16a34a' : '#dc2626'},
                  ]}>
                  {isConnected ? 'Conectado' : 'Sin conexion'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offlineBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 11,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  actionChevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  lastLoginText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dbInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  dbInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dbInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  dbInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  connectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
